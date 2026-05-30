import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const XPRIVO_URL   = "https://www.xprivo.com/v1/chat/completions";
const LOVABLE_URL  = "https://ai.gateway.lovable.dev/v1/chat/completions";
const POLLI_IMAGE  = "https://image.pollinations.ai/prompt";

const XPRIVO_MODELS = new Set(["xprivo", "mistral-3"]);

function resolveModel(modelId: string): { endpoint: string; upstream: string; provider: string } | null {
  if (XPRIVO_MODELS.has(modelId)) return { endpoint: XPRIVO_URL, upstream: modelId, provider: "xprivo" };
  if (modelId === "lovable") return { endpoint: LOVABLE_URL, upstream: "google/gemini-2.5-flash", provider: "lovable" };
  return null;
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Accepts a model+messages+options, returns upstream Response.
// Forwards tools, tool_choice, temperature, max_tokens, response_format for full OpenAI compatibility.
export async function callUpstream(opts: {
  modelId: string;
  messages: any[];
  stream: boolean;
  web?: boolean;
  tools?: any;
  tool_choice?: any;
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
}): Promise<Response> {
  const cfg = resolveModel(opts.modelId);
  if (!cfg) throw new Error(`Unknown model: ${opts.modelId}`);

  const url = cfg.endpoint;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (cfg.provider === "xprivo") {
    headers["Authorization"] = `Bearer ${Deno.env.get("XPRIVO_API_KEY") || "API_KEY_XPRIVO"}`;
    headers["x-api-version"] = "2";
    headers["x-lang-chat"] = "en";
    headers["x-use-web"] = opts.web ? "on" : "off";
  } else if (cfg.provider === "lovable") {
    const LK = Deno.env.get("LOVABLE_API_KEY");
    if (!LK) throw new Error("LOVABLE_API_KEY not configured");
    headers["Authorization"] = `Bearer ${LK}`;
  }

  // Build OpenAI-compatible body. Forward tools so automation platforms work.
  const body: Record<string, unknown> = {
    model: cfg.upstream,
    messages: opts.messages,
    stream: opts.stream,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.max_tokens !== undefined) body.max_tokens = opts.max_tokens;
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  if (opts.response_format) body.response_format = opts.response_format;

  return await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
}

export { corsHeaders, jsonResp };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let apiKeyId: string | null = null;
  let messageLength = 0;
  let success = true;
  let errorMessage: string | null = null;

  try {
    const body = await req.json();
    const { messages, model, web, image, tools, tool_choice, temperature, max_tokens, response_format } = body;
    const apiKey = req.headers.get("x-api-key") || body.apiKey;
    messageLength = JSON.stringify(messages || []).length;

    // Image generation mode — free via Pollinations (no key required).
    if (image) {
      const lastUser = [...(messages || [])].reverse().find((m: any) => m.role === "user");
      const prompt = (typeof lastUser?.content === "string" ? lastUser.content : "").trim();
      if (!prompt) return jsonResp({ error: "Prompt required for image generation" }, 400);
      const seed = Math.floor(Math.random() * 1e9);
      const url = `${POLLI_IMAGE}/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      return jsonResp({ image: url, text: `Generated image for: ${prompt}` });
    }

    const modelId = model || "xprivo";
    if (!resolveModel(modelId)) return jsonResp({ error: `Unknown model: ${modelId}` }, 400);

    // Track key (non-blocking)
    if (apiKey) {
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      supa.from("api_keys").select("id, active").eq("key", apiKey).maybeSingle()
        .then(({ data }) => { if (data?.active) apiKeyId = data.id; })
        .catch(() => {});
    }

    const sys = { role: "system", content: "You are a fast, helpful AI assistant. Be concise. Use markdown when useful. When tools are provided, USE them to perform actions — do not just describe what you would do." };
    const finalMessages = (messages || []).some((m: any) => m.role === "system") ? messages : [sys, ...messages];

    const upstream = await callUpstream({
      modelId, messages: finalMessages, stream: true,
      web, tools, tool_choice, temperature, max_tokens, response_format,
    });

    if (!upstream.ok) {
      success = false;
      const t = await upstream.text();
      errorMessage = `${upstream.status}: ${t.slice(0, 200)}`;
      if (upstream.status === 429) return jsonResp({ error: "Rate limited. Try again shortly." }, 429);
      if (upstream.status === 402) return jsonResp({ error: "Credits exhausted." }, 402);
      console.error("Upstream", upstream.status, t.slice(0, 300));
      return jsonResp({ error: `Upstream error (${upstream.status}): ${t.slice(0,150)}` }, 502);
    }

    // xPrivo PRO-fallback
    const _cfg = resolveModel(modelId)!;
    if (_cfg.provider === "xprivo" && upstream.body) {
      const reader = upstream.body.getReader();
      const { value: firstChunk, done } = await reader.read();
      const firstText = firstChunk ? new TextDecoder().decode(firstChunk) : "";
      if (firstText.includes("show_upgrade_pro")) {
        const retry = await callUpstream({ modelId: "xprivo", messages: finalMessages, stream: true, web, tools, tool_choice, temperature, max_tokens });
        return new Response(retry.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }
      const stream = new ReadableStream({
        async start(controller) {
          if (firstChunk) controller.enqueue(firstChunk);
          if (done) { controller.close(); return; }
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally { controller.close(); }
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    return new Response(upstream.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    success = false;
    errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("chat error:", e);
    return jsonResp({ error: errorMessage }, 500);
  } finally {
    if (apiKeyId) {
      try {
        const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supa.from("api_usage").insert({ api_key_id: apiKeyId, message_length: messageLength, success, error_message: errorMessage });
      } catch (_) { /* ignore */ }
    }
  }
});
