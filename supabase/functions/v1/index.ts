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
const LOVABLE_URL  = "https://ai.gateway.lovable.dev/v1/chat/completions";
const G4F_GROQ     = "https://g4f.space/api/groq/chat/completions";
const G4F_NVIDIA   = "https://g4f.space/api/nvidia/chat/completions";
const G4F_GPT4FREE = "https://g4f.space/api/gpt4free.pro/chat/completions";
const G4F_POLLI    = "https://g4f.space/api/pollinations/chat/completions";
const G4F_GEMINI   = "https://g4f.space/api/gemini-v1beta/chat/completions";
const G4F_PERPLEX  = "https://g4f.space/api/perplexity/chat/completions";
const G4F_AZURE    = "https://g4f.space/api/azure/chat/completions";
const POLLI_TEXT   = "https://text.pollinations.ai/openai";
const POLLI_IMAGE  = "https://image.pollinations.ai/prompt";

type Provider = "xprivo" | "lovable" | "g4f-groq" | "g4f-nvidia" | "g4f-gpt4free" | "g4f-pollinations" | "g4f-gemini" | "g4f-perplexity" | "g4f-azure" | "pollinations-text" | "pollinations-image";

const MODEL_MAP: Record<string, { provider: Provider; upstream: string }> = {
  "xprivo":      { provider: "xprivo", upstream: "xprivo" },
  "qwen-latest": { provider: "xprivo", upstream: "qwen-latest" },
  "mistral-3":   { provider: "xprivo", upstream: "mistral-3" },
  "google/gemini-2.5-flash-image": { provider: "lovable", upstream: "google/gemini-2.5-flash-image" },

  "meta-llama/llama-4-scout-17b-16e-instruct": { provider: "g4f-groq", upstream: "meta-llama/llama-4-scout-17b-16e-instruct" },
  "llama-3.3-70b-versatile":                    { provider: "g4f-groq", upstream: "llama-3.3-70b-versatile" },
  "qwen/qwen3-32b":                             { provider: "g4f-groq", upstream: "qwen/qwen3-32b" },

  "deepseek-ai/deepseek-v4-pro":                { provider: "g4f-nvidia", upstream: "deepseek-ai/deepseek-v4-pro" },
  "deepseek-ai/deepseek-v4-flash":              { provider: "g4f-nvidia", upstream: "deepseek-ai/deepseek-v4-flash" },
  "moonshotai/kimi-k2.6":                       { provider: "g4f-nvidia", upstream: "moonshotai/kimi-k2.6" },

  "llama-4-scout":      { provider: "g4f-gpt4free", upstream: "llama-4-scout" },
  "deepseek-r1-32b":    { provider: "g4f-gpt4free", upstream: "deepseek-r1-32b" },
  "qwen-3.6-instant":   { provider: "g4f-gpt4free", upstream: "qwen-3.6-instant" },

  "openai":         { provider: "g4f-pollinations", upstream: "openai" },
  "openai-fast":    { provider: "g4f-pollinations", upstream: "openai-fast" },

  "models/gemini-2.5-flash":         { provider: "g4f-gemini", upstream: "models/gemini-2.5-flash" },
  "models/gemini-3-flash-preview":   { provider: "g4f-gemini", upstream: "models/gemini-3-flash-preview" },

  "turbo": { provider: "g4f-perplexity", upstream: "turbo" },
  "model-router3": { provider: "g4f-azure", upstream: "model-router3" },
};

const PUBLIC_MODELS = Object.keys(MODEL_MAP).map((id) => ({
  id, object: "model", created: 1700000000, owned_by: MODEL_MAP[id].provider,
}));

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function endpointFor(p: Provider): string {
  switch (p) {
    case "xprivo": return XPRIVO_URL;
    case "lovable": return LOVABLE_URL;
    case "g4f-groq": return G4F_GROQ;
    case "g4f-nvidia": return G4F_NVIDIA;
    case "g4f-gpt4free": return G4F_GPT4FREE;
    case "g4f-pollinations": return G4F_POLLI;
    case "g4f-gemini": return G4F_GEMINI;
    case "g4f-perplexity": return G4F_PERPLEX;
    case "g4f-azure": return G4F_AZURE;
    case "pollinations-text": return POLLI_TEXT;
    default: return "";
  }
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
    const cfg = MODEL_MAP[modelId];
    if (!cfg) {
      return jsonResp({ error: { message: `Unknown model: ${modelId}`, type: "invalid_request_error" } }, 400);
    }

    const wantStream = stream !== false;

    // Pollinations image model — return OpenAI-shape JSON with image URL
    if (cfg.provider === "pollinations-image") {
      const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
      const prompt = typeof lastUser?.content === "string" ? lastUser.content : JSON.stringify(lastUser?.content || "");
      const imgUrl = `${POLLI_IMAGE}/${encodeURIComponent(prompt)}?model=${cfg.upstream}&nologo=true&safe=false`;
      return jsonResp({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: modelId,
        choices: [{ index: 0, message: { role: "assistant", content: `![image](${imgUrl})` }, finish_reason: "stop" }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      });
    }

    const upstreamUrl = endpointFor(cfg.provider);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.provider === "xprivo") {
      headers["Authorization"] = `Bearer ${Deno.env.get("XPRIVO_API_KEY") || "API_KEY_XPRIVO"}`;
      headers["x-api-version"] = "2";
      headers["x-lang-chat"] = "en";
      headers["x-use-web"] = web ? "on" : "off";
    } else if (cfg.provider === "lovable") {
      const LK = Deno.env.get("LOVABLE_API_KEY");
      if (!LK) throw new Error("LOVABLE_API_KEY not configured");
      headers["Authorization"] = `Bearer ${LK}`;
    }

    // Forward all OpenAI fields (especially tools / tool_choice) so automation works
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
