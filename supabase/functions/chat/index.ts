const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DS_BASE = "https://deep-seek.ai";
const DS_CHAT_PAGE = `${DS_BASE}/chat`;
const DS_API_URL = `${DS_BASE}/api/chat`;
const DS_DEFAULT_MODEL = "deepseek/deepseek-chat-v3.1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DS_COMMON_HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": DS_BASE,
  "Referer": `${DS_BASE}/chat`,
};

type DsSession = { csrf: string; cookie: string; exp: number };
let DS_SESSION: DsSession | null = null;
const DS_SESSION_TTL_MS = 50 * 60 * 1000;

function pickCookies(setCookieHeaders: string[]): string {
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
  const res = await fetch(DS_CHAT_PAGE, { method: "GET", headers: { ...DS_COMMON_HEADERS, "Accept": "text/html" } });
  const html = await res.text();
  const m = html.match(/csrf-token"\s+content="([^"]+)"/);
  if (!m) throw new Error(`Failed to read CSRF token (status ${res.status})`);
  const setCookies = (res.headers as any).getSetCookie?.() ?? [];
  const cookie = pickCookies(setCookies);
  if (!cookie) throw new Error("No session cookies returned");
  DS_SESSION = { csrf: m[1], cookie, exp: now + DS_SESSION_TTL_MS };
  return DS_SESSION;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let messages: any[] = [];
  if (Array.isArray(body?.messages)) {
    messages = body.messages.filter((m: any) => m && typeof m.content === "string" && typeof m.role === "string");
  } else if (typeof body?.message === "string") {
    messages = [{ role: "user", content: body.message }];
  }
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "Provide 'message' or 'messages'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const upstreamBody = JSON.stringify({ model: body?.model || DS_DEFAULT_MODEL, messages });
    const doFetch = async (forceFresh = false) => {
      const sess = await getSession(forceFresh);
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
    for (let attempt = 1; attempt <= 3; attempt++) {
      const fresh = attempt > 1 && upstreamRes ? [401, 403, 419].includes(upstreamRes.status) : false;
      if (fresh) DS_SESSION = null;
      upstreamRes = await doFetch(fresh);
      if (upstreamRes.ok && upstreamRes.body) break;
      if ([500, 502, 503, 429, 419, 401, 403].includes(upstreamRes.status)) {
        try { await upstreamRes.body?.cancel(); } catch {}
        if (attempt < 3) { await new Promise(r => setTimeout(r, 250 * attempt * attempt)); continue; }
      }
      break;
    }

    if (!upstreamRes || !upstreamRes.ok || !upstreamRes.body) {
      const status = upstreamRes?.status ?? 502;
      const errText = upstreamRes ? await upstreamRes.text().catch(() => "") : "";
      let providerMsg = "";
      try { providerMsg = JSON.parse(errText)?.error || ""; } catch {}
      return new Response(JSON.stringify({
        error: providerMsg || (status === 429 ? "Rate limit reached." : `Upstream error ${status}`),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
          if (!t || t.startsWith(":")) continue;
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") { controller.enqueue(enc.encode("data: [DONE]\n\n")); continue; }
          try {
            const j = JSON.parse(payload);
            const piece = j?.choices?.[0]?.delta?.content ?? j?.choices?.[0]?.message?.content ?? (typeof j.content === "string" ? j.content : "") ?? "";
            if (piece) controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: piece })}\n\n`));
          } catch {}
        }
      },
      flush(controller) { controller.enqueue(enc.encode("data: [DONE]\n\n")); },
    });

    return new Response(upstreamRes.body.pipeThrough(transform), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
