// OpenAI-compatible API endpoint
// POST /functions/v1/v1/chat/completions
// Mirrors OpenAI Chat Completions API. Accepts: model, messages, stream, web (optional).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const XPRIVO_URL = "https://www.xprivo.com/v1/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ROCKET_URL = "http://server2.api.nikkcocompany.store:4000/v1/chat/completions";
const ROCKET_KEY = "sk-8xMIqGFuWezqJyEWFWG4Ow";

const MODEL_MAP: Record<string, { provider: "xprivo" | "lovable" | "rocket"; upstream: string }> = {
  "xprivo":                 { provider: "xprivo",  upstream: "xprivo" },
  "qwen-latest":            { provider: "xprivo",  upstream: "qwen-latest" },
  "mistral-3":              { provider: "xprivo",  upstream: "mistral-3" },
  "kimi-2.5":               { provider: "xprivo",  upstream: "kimi-2.5" },
  "gpt-5.2":                { provider: "xprivo",  upstream: "gpt-5.2" },
  "gemini-3-pro":           { provider: "xprivo",  upstream: "gemini-3-pro" },
  "gemini-3.1-pro-preview": { provider: "rocket",  upstream: "gemini-3.1-pro-preview" },
  "gemini-3-flash-preview": { provider: "rocket",  upstream: "gemini-3-flash-preview" },
  "gemini-2.5-pro":         { provider: "rocket",  upstream: "gemini-2.5-pro" },
  "gemini-2.5-flash":       { provider: "rocket",  upstream: "gemini-2.5-flash" },
  "gemma-3-27b-it":         { provider: "rocket",  upstream: "gemma-3-27b-it" },
  "google/gemini-2.5-flash-image": { provider: "lovable", upstream: "google/gemini-2.5-flash-image" },
};

const PUBLIC_MODELS = Object.keys(MODEL_MAP).map((id) => ({
  id,
  object: "model",
  created: 1700000000,
  owned_by: MODEL_MAP[id].provider,
}));

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Strip the function prefix: /functions/v1/v1/...
  const path = url.pathname.replace(/^.*\/v1\/v1/, "/v1");

  if (req.method === "GET" && (path === "/v1/models" || path === "/models")) {
    return jsonResp({ object: "list", data: PUBLIC_MODELS });
  }

  if (req.method !== "POST") {
    return jsonResp({ error: { message: "Method not allowed", type: "invalid_request_error" } }, 405);
  }

  let apiKeyId: string | null = null;
  let success = true;
  let errorMessage: string | null = null;

  try {
    const body = await req.json();
    const { messages, model, stream, web, temperature, max_tokens, tools, tool_choice } = body;

    if (!Array.isArray(messages) || !messages.length) {
      return jsonResp({ error: { message: "messages required", type: "invalid_request_error" } }, 400);
    }

    // Auth: Bearer token (OpenAI style) or x-api-key
    const auth = req.headers.get("authorization") || "";
    const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    const apiKey = req.headers.get("x-api-key") || bearer || null;

    if (apiKey) {
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      supa.from("api_keys").select("id, active").eq("key", apiKey).maybeSingle()
        .then(({ data }) => { if (data?.active) apiKeyId = data.id; })
        .catch(() => {});
    }

    const modelId = model || "xprivo";
    const cfg = MODEL_MAP[modelId];
    if (!cfg) {
      return jsonResp({ error: { message: `Unknown model: ${modelId}`, type: "invalid_request_error" } }, 400);
    }

    const wantStream = stream !== false; // default true (OpenAI default false, but we mirror chat behavior — explicit)
    let upstream: Response;

    if (cfg.provider === "xprivo") {
      const xkey = Deno.env.get("XPRIVO_API_KEY") || "API_KEY_XPRIVO";
      upstream = await fetch(XPRIVO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${xkey}`,
          "x-api-version": "2",
          "x-lang-chat": "en",
          "x-use-web": web ? "on" : "off",
        },
        body: JSON.stringify({ model: cfg.upstream, messages, stream: wantStream, temperature, max_tokens, tools, tool_choice }),
      });
    } else if (cfg.provider === "rocket") {
      const upModel = web && !cfg.upstream.includes(":search") ? `${cfg.upstream}:search` : cfg.upstream;
      upstream = await fetch(ROCKET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ROCKET_KEY}` },
        body: JSON.stringify({ model: upModel, messages, stream: wantStream, temperature, max_tokens, tools, tool_choice }),
      });
    } else {
      const LK = Deno.env.get("LOVABLE_API_KEY");
      if (!LK) throw new Error("LOVABLE_API_KEY not configured");
      upstream = await fetch(LOVABLE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LK}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.upstream, messages, stream: wantStream, temperature, max_tokens, tools, tool_choice }),
      });
    }

    if (!upstream.ok) {
      success = false;
      const t = await upstream.text();
      errorMessage = `${upstream.status}: ${t.slice(0, 200)}`;
      return jsonResp({ error: { message: t.slice(0, 500), type: "upstream_error", code: String(upstream.status) } }, upstream.status);
    }

    if (wantStream) {
      return new Response(upstream.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }
    const data = await upstream.json();
    return jsonResp(data);
  } catch (e) {
    success = false;
    errorMessage = e instanceof Error ? e.message : "Unknown error";
    return jsonResp({ error: { message: errorMessage, type: "internal_error" } }, 500);
  } finally {
    if (apiKeyId) {
      try {
        const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supa.from("api_usage").insert({ api_key_id: apiKeyId, message_length: 0, success, error_message: errorMessage });
      } catch (_) { /* ignore */ }
    }
  }
});