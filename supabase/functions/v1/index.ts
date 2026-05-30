// OpenAI-compatible API endpoint with full tool/function calling support.
// POST /functions/v1/v1/chat/completions
// GET  /functions/v1/v1/models
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const XPRIVO_URL   = "https://www.xprivo.com/v1/chat/completions";

const XPRIVO_MODELS = new Set(["xprivo", "mistral-3"]);

function resolveModel(modelId: string): { endpoint: string; upstream: string; provider: string } | null {
  if (XPRIVO_MODELS.has(modelId)) return { endpoint: XPRIVO_URL, upstream: modelId, provider: "xprivo" };
  return null;
}

const PUBLIC_MODELS = [...XPRIVO_MODELS].map((id) => ({
  id, object: "model", created: 1700000000, owned_by: "xprivo",
}));

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
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
    const { messages, model, stream, web, temperature, max_tokens, tools, tool_choice, response_format } = body;

    if (!Array.isArray(messages) || !messages.length) {
      return jsonResp({ error: { message: "messages required", type: "invalid_request_error" } }, 400);
    }

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
    const cfg = resolveModel(modelId);
    if (!cfg) {
      return jsonResp({ error: { message: `Unknown model: ${modelId}`, type: "invalid_request_error" } }, 400);
    }

    const wantStream = stream !== false;

    const upstreamUrl = cfg.endpoint;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.provider === "xprivo") {
      headers["Authorization"] = `Bearer ${Deno.env.get("XPRIVO_API_KEY") || "API_KEY_XPRIVO"}`;
      headers["x-api-version"] = "2";
      headers["x-lang-chat"] = "en";
      headers["x-use-web"] = web ? "on" : "off";
    }

    const upstreamBody: Record<string, unknown> = {
      model: cfg.upstream,
      messages,
      stream: wantStream,
    };
    if (temperature !== undefined) upstreamBody.temperature = temperature;
    if (max_tokens !== undefined) upstreamBody.max_tokens = max_tokens;
    if (tools) upstreamBody.tools = tools;
    if (tool_choice) upstreamBody.tool_choice = tool_choice;
    if (response_format) upstreamBody.response_format = response_format;

    const upstream = await fetch(upstreamUrl, { method: "POST", headers, body: JSON.stringify(upstreamBody) });

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
