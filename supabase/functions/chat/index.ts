import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// DuckDuckGo AI Chat (unofficial) — VQD handshake + SSE
const DDG_STATUS_URL = "https://duckduckgo.com/duckchat/v1/status";
const DDG_CHAT_URL = "https://duckduckgo.com/duckchat/v1/chat";
const DDG_MODEL = "gpt-4o-mini"; // also valid: "claude-3-haiku-20240307", "o3-mini",
                                 // "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                                 // "mistralai/Mistral-Small-24B-Instruct-2501"
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const COMMON_DDG_HEADERS = {
  "User-Agent": UA,
  "Accept": "text/event-stream",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://duckduckgo.com",
  "Referer": "https://duckduckgo.com/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

async function fetchVqd(): Promise<string> {
  const res = await fetch(DDG_STATUS_URL, {
    method: "GET",
    headers: { ...COMMON_DDG_HEADERS, "x-vqd-accept": "1" },
  });
  // body must be consumed
  try { await res.text(); } catch { /* ignore */ }
  const vqd = res.headers.get("x-vqd-4") || res.headers.get("x-vqd-hash-1") || "";
  if (!vqd) {
    throw new Error(`DuckDuckGo VQD handshake failed (${res.status}). Provider may be blocking server IPs.`);
  }
  return vqd;
}

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

  // DuckDuckGo expects only user/assistant turns; collapse system into first user.
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n").trim();
  let convo = messages.filter((m) => m.role !== "system");
  if (sys && convo.length && convo[0].role === "user") {
    convo = [{ role: "user", content: `${sys}\n\n${convo[0].content}` }, ...convo.slice(1)];
  }
  const totalLen = messages.reduce((acc, m) => acc + m.content.length, 0);

  // Decide mode: stream (default) or json (legacy)
  const wantStream = body?.stream !== false;

  try {
    // 1) VQD handshake (with retry)
    let vqd = "";
    let handshakeErr = "";
    for (let i = 1; i <= 3; i++) {
      try { vqd = await fetchVqd(); break; }
      catch (e) {
        handshakeErr = e instanceof Error ? e.message : "vqd error";
        if (i < 3) await new Promise((r) => setTimeout(r, 200 * i));
      }
    }
    if (!vqd) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "DuckDuckGo blocked the handshake from our server. (DDG actively blocks datacenter IPs — this is expected.) Try again or switch provider.",
          raw: handshakeErr,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upstreamBody = JSON.stringify({
      model: body?.model || DDG_MODEL,
      messages: convo,
    });
    const doFetch = () =>
      fetch(DDG_CHAT_URL, {
        method: "POST",
        headers: {
          ...COMMON_DDG_HEADERS,
          "Content-Type": "application/json",
          "x-vqd-4": vqd,
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
      // DDG sends lines like:  data: {"message":"hello","created":..,"id":"..","model":"..","action":"success"}
      // Frontend expects:      data: {"content":"hello"}
      // We transform on the fly so existing client code keeps working.
      queueMicrotask(() => {
        getSb().from("api_usage").insert({
          api_key_id: keyRow!.id,
          message_length: totalLen,
          success: true,
          error_message: null,
        }).then(() => {});
      });

      const upstream = upstreamRes.body!;
      const dec = new TextDecoder();
      const enc = new TextEncoder();
      let buf = "";
      const transform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          buf += dec.decode(chunk, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (!payload) continue;
            if (payload === "[DONE]") {
              controller.enqueue(enc.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const j = JSON.parse(payload);
              const piece = typeof j.message === "string" ? j.message
                          : typeof j.content === "string" ? j.content
                          : "";
              if (piece) {
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: piece })}\n\n`));
              }
            } catch { /* ignore */ }
          }
        },
        flush(controller) {
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
        },
      });

      return new Response(upstream.pipeThrough(transform), {
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

    // Non-stream mode: aggregate DDG SSE into single JSON response
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
          if (typeof j.message === "string") full += j.message;
          else if (typeof j.content === "string") full += j.content;
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
