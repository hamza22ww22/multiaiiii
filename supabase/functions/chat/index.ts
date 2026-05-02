import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// deep-seek.ai (unofficial) — Laravel app, SSE streaming, OpenRouter-style payloads.
const DS_BASE = "https://deep-seek.ai";
const DS_CHAT_PAGE = `${DS_BASE}/chat`;
const DS_API_URL = `${DS_BASE}/api/chat`;
const DS_DEFAULT_MODEL = "deepseek/deepseek-chat-v3.1";
// Allowed: deepseek/deepseek-chat-v3.1 (V3), deepseek/deepseek-r1 (R1),
//          deepseek/deepseek-v3.2 (marketed as V4)
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DS_COMMON_HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": DS_BASE,
  "Referer": `${DS_BASE}/chat`,
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

// Per-worker session cache: CSRF token + cookie jar. Re-used across requests
// for ~50 minutes (Laravel sessions live 2h, we refresh early to be safe).
type DsSession = { csrf: string; cookie: string; exp: number };
let DS_SESSION: DsSession | null = null;
const DS_SESSION_TTL_MS = 50 * 60 * 1000;

function pickCookies(setCookieHeaders: string[]): string {
  // Build a minimal "Cookie:" string from Set-Cookie headers (XSRF-TOKEN + deepseek_session).
  const map = new Map<string, string>();
  for (const sc of setCookieHeaders) {
    const seg = sc.split(";")[0].trim();
    const eq = seg.indexOf("=");
    if (eq > 0) map.set(seg.slice(0, eq), seg.slice(eq + 1));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function getSession(force = false): Promise<DsSession> {
  const now = Date.now();
  if (!force && DS_SESSION && DS_SESSION.exp > now) return DS_SESSION;
  const res = await fetch(DS_CHAT_PAGE, {
    method: "GET",
    headers: { ...DS_COMMON_HEADERS, "Accept": "text/html" },
  });
  const html = await res.text();
  const m = html.match(/csrf-token"\s+content="([^"]+)"/);
  if (!m) throw new Error(`Failed to read CSRF token (status ${res.status})`);
  // Deno exposes multiple Set-Cookie headers via getSetCookie()
  const setCookies = (res.headers as any).getSetCookie?.() ?? [];
  const cookie = pickCookies(setCookies);
  if (!cookie) throw new Error("No session cookies returned by deep-seek.ai");
  DS_SESSION = { csrf: m[1], cookie, exp: now + DS_SESSION_TTL_MS };
  return DS_SESSION;
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

  // deep-seek.ai accepts standard {role, content} (system role supported via OpenRouter).
  const convo = messages;
  const totalLen = messages.reduce((acc, m) => acc + m.content.length, 0);

  // Decide mode: stream (default) or json (legacy)
  const wantStream = body?.stream !== false;

  try {
    const upstreamBody = JSON.stringify({
      model: body?.model || DS_DEFAULT_MODEL,
      messages: convo,
    });
    const doFetch = async (forceFreshSession = false) => {
      const sess = await getSession(forceFreshSession);
      return fetch(DS_API_URL, {
        method: "POST",
        headers: {
          ...DS_COMMON_HEADERS,
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "X-CSRF-TOKEN": sess.csrf,
          "X-Requested-With": "XMLHttpRequest",
          "Cookie": sess.cookie,
        },
        body: upstreamBody,
      });
    };

    let upstreamRes: Response | null = null;
    let lastErr = "";
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // Force a fresh session on retries after a 419/401/403 (CSRF/session expired).
        const fresh = attempt > 1 && upstreamRes
          ? [401, 403, 419].includes(upstreamRes.status)
          : false;
        if (fresh) DS_SESSION = null;
        upstreamRes = await doFetch(fresh);
        if (upstreamRes.ok && upstreamRes.body) break;
        if (
          upstreamRes.status >= 500 ||
          upstreamRes.status === 429 ||
          upstreamRes.status === 419 ||
          upstreamRes.status === 401 ||
          upstreamRes.status === 403
        ) {
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
      // Try to surface deep-seek.ai's own error message (e.g. daily limit reached).
      let providerMsg = "";
      try { providerMsg = JSON.parse(errText)?.error || ""; } catch { /* ignore */ }
      const friendly =
        status === 429
          ? (providerMsg || "Daily free limit reached. Please try again later.")
          : status >= 500
            ? "The AI provider is temporarily overloaded. Please try again in a few seconds."
            : status === 419 || status === 401 || status === 403
              ? "Session with the upstream provider expired. Please retry."
              : (providerMsg || `Upstream error ${status}`);
      return new Response(
        JSON.stringify({ success: false, error: friendly, status, raw: errText?.slice(0, 500) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (wantStream) {
      // deep-seek.ai sends OpenRouter-style chunks:
      //   data: {"choices":[{"delta":{"content":"hello"}}]}
      // Plus colon-prefixed comments like ": OPENROUTER PROCESSING" we must skip.
      // Frontend expects:  data: {"content":"hello"}
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
            if (!t || t.startsWith(":")) continue; // SSE comment / keep-alive
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (!payload) continue;
            if (payload === "[DONE]") {
              controller.enqueue(enc.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const j = JSON.parse(payload);
              const piece =
                j?.choices?.[0]?.delta?.content ??
                j?.choices?.[0]?.message?.content ??
                (typeof j.content === "string" ? j.content : "") ??
                "";
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
        if (!t || t.startsWith(":")) continue;
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          const piece =
            j?.choices?.[0]?.delta?.content ??
            j?.choices?.[0]?.message?.content ??
            (typeof j.content === "string" ? j.content : "") ??
            "";
          if (piece) full += piece;
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
