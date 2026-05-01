import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UPSTREAM_URL = "https://glmfivepointone.space-z.ai/api/chat";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

// In-memory cache for API keys (per edge worker instance) — eliminates the
// Postgres round-trip on every chat request. Entries live for 5 minutes.
const KEY_CACHE = new Map<string, { id: string; active: boolean; exp: number }>();
const KEY_TTL_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Extract API key from header (preferred) or body
  let apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!apiKey && typeof body?.api_key === "string") apiKey = body.api_key;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing API key. Send it in 'x-api-key' header or 'api_key' body field." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Lazy supabase client (only created if we need it)
  let supabase: ReturnType<typeof createClient> | null = null;
  const getSb = () => (supabase ??= createClient(supabaseUrl, serviceKey));

  // Validate key — use in-memory cache when possible
  let keyRow: { id: string; active: boolean } | null = null;
  const cached = KEY_CACHE.get(apiKey);
  const now = Date.now();
  if (cached && cached.exp > now) {
    keyRow = { id: cached.id, active: cached.active };
  } else {
    const { data, error } = await getSb()
      .from("api_keys")
      .select("id, active")
      .eq("key", apiKey)
      .maybeSingle();
    if (error || !data) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    keyRow = data as { id: string; active: boolean };
    KEY_CACHE.set(apiKey, { id: keyRow.id, active: keyRow.active, exp: now + KEY_TTL_MS });
  }

  if (!keyRow.active) {
    return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build messages array. Accept either { message: "..." } or { messages: [...] }
  let messages: ChatMessage[] = [];
  if (Array.isArray(body?.messages)) {
    messages = body.messages
      .filter((m: any) => m && typeof m.content === "string" && typeof m.role === "string")
      .map((m: any) => ({ role: m.role, content: m.content }));
  } else if (typeof body?.message === "string") {
    messages = [{ role: "user", content: body.message }];
  }

  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Provide 'message' (string) or 'messages' (array of {role, content})." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const totalLen = messages.reduce((acc, m) => acc + m.content.length, 0);

  // Decide mode: stream (default) or json (legacy)
  const wantStream = body?.stream !== false;

  try {
    // Retry upstream on 5xx / network errors with exponential backoff.
    const upstreamBody = JSON.stringify({
      messages,
      fileContent: body?.fileContent ?? null,
      fileName: body?.fileName ?? null,
    });
    const doFetch = () =>
      fetch(UPSTREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "https://glmfivepointone.space-z.ai",
          "Referer": "https://glmfivepointone.space-z.ai/",
          "User-Agent": "Mozilla/5.0 (compatible; GLMProxy/1.0)",
        },
        body: upstreamBody,
      });

    let upstreamRes: Response | null = null;
    let lastErr = "";
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        upstreamRes = await doFetch();
        if (upstreamRes.ok && upstreamRes.body) break;
        // Retry only 5xx / 429
        if (upstreamRes.status >= 500 || upstreamRes.status === 429) {
          lastErr = `Upstream ${upstreamRes.status}`;
          try { await upstreamRes.body?.cancel(); } catch { /* ignore */ }
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 250 * attempt * attempt));
            continue;
          }
        }
        break; // non-retryable status
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "network error";
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 250 * attempt * attempt));
          continue;
        }
      }
    }

    if (!upstreamRes || !upstreamRes.ok || !upstreamRes.body) {
      const status = upstreamRes?.status ?? 502;
      const errText = upstreamRes ? await upstreamRes.text().catch(() => "") : lastErr;
      // Fire-and-forget log
      getSb().from("api_usage").insert({
        api_key_id: keyRow.id,
        message_length: totalLen,
        success: false,
        error_message: `Upstream ${status}`,
      }).then(() => {});
      const friendly =
        status === 502 || status === 503 || status === 504
          ? "The AI provider is temporarily overloaded. Please try again in a few seconds. (Tip: very large prompts are more likely to fail — try a shorter message.)"
          : `Upstream error ${status}`;
      return new Response(
        JSON.stringify({ success: false, error: friendly, status, raw: errText?.slice(0, 500) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (wantStream) {
      // Pipe upstream straight to client — no tee, no extra reader, no extra
      // buffering. Fastest possible TTFB. Log usage immediately in background.
      queueMicrotask(() => {
        getSb().from("api_usage").insert({
          api_key_id: keyRow!.id,
          message_length: totalLen,
          success: true,
          error_message: null,
        }).then(() => {});
      });

      return new Response(upstreamRes.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-stream mode: aggregate SSE into single JSON response
    const reader = upstreamRes.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          if (typeof j.content === "string") full += j.content;
          else if (typeof j.response === "string") full += j.response;
        } catch { /* ignore */ }
      }
    }

    getSb().from("api_usage").insert({
      api_key_id: keyRow.id,
      message_length: totalLen,
      success: true,
      error_message: null,
    }).then(() => {});

    return new Response(
      JSON.stringify({ success: true, response: full }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    getSb().from("api_usage").insert({
      api_key_id: keyRow.id,
      message_length: totalLen,
      success: false,
      error_message: errMsg,
    }).then(() => {});
    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
