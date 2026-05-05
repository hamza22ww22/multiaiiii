import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const XPRIVO_URL = "https://www.xprivo.com/v1/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// model id -> { provider, upstreamModel, reasoning? }
// All chat models route to xPrivo (free + unlimited). Image → Lovable Gateway.
const MODEL_MAP: Record<string, { provider: "xprivo" | "lovable"; upstream: string; reasoning?: "low" | "medium" | "high" }> = {
  "xprivo":                 { provider: "xprivo",  upstream: "xprivo" },
  "qwen-latest":            { provider: "xprivo",  upstream: "qwen-latest" },
  "mistral-3":              { provider: "xprivo",  upstream: "mistral-3" },
  "kimi-2.5":               { provider: "xprivo",  upstream: "kimi-2.5" },
  "gpt-5.2":                { provider: "xprivo",  upstream: "gpt-5.2" },
  "gemini-3-pro":           { provider: "xprivo",  upstream: "gemini-3-pro" },
  "gemini-3-pro-reasoning": { provider: "xprivo",  upstream: "gemini-3-pro" },
  "image":                  { provider: "lovable", upstream: "google/gemini-2.5-flash-image" },
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let apiKeyId: string | null = null;
  let messageLength = 0;
  let success = true;
  let errorMessage: string | null = null;

  try {
    const body = await req.json();
    const { messages, model, web, image } = body;
    const apiKey = req.headers.get("x-api-key") || body.apiKey;

    messageLength = JSON.stringify(messages || []).length;

    // Resolve model: image flag overrides
    const modelId = image ? "image" : (model || "xprivo");
    const cfg = MODEL_MAP[modelId];
    if (!cfg) return jsonResp({ error: `Unknown model: ${modelId}` }, 400);

    // Optional API key tracking (no enforcement - free)
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (apiKey) {
      const { data: keyRow } = await supa.from("api_keys").select("id, active").eq("key", apiKey).maybeSingle();
      if (keyRow?.active) apiKeyId = keyRow.id;
    }

    const sys = { role: "system", content: "You are a helpful AI assistant. Format with markdown when useful." };

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
        body: JSON.stringify({ model: cfg.upstream, messages: [sys, ...messages], stream: true }),
      });
    } else {
      const LK = Deno.env.get("LOVABLE_API_KEY");
      if (!LK) throw new Error("LOVABLE_API_KEY not configured");
      const payload: Record<string, unknown> = {
        model: cfg.upstream,
        messages: [sys, ...messages],
        stream: true,
      };
      if (cfg.reasoning) payload.reasoning = { effort: cfg.reasoning };
      if (modelId === "image") {
        payload.modalities = ["image", "text"];
        payload.stream = false; // image gen not streamed
        payload.messages = messages; // no system
      }
      upstream = await fetch(LOVABLE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LK}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!upstream.ok) {
      success = false;
      const t = await upstream.text();
      errorMessage = `${upstream.status}: ${t.slice(0, 200)}`;
      if (upstream.status === 429) return jsonResp({ error: "Rate limited. Try again shortly." }, 429);
      if (upstream.status === 402) return jsonResp({ error: "Credits exhausted." }, 402);
      console.error("Upstream", upstream.status, t.slice(0, 300));
      return jsonResp({ error: `Upstream error (${upstream.status})` }, 502);
    }

    // Image generation: return JSON directly
    if (modelId === "image") {
      const data = await upstream.json();
      const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
      const text = data?.choices?.[0]?.message?.content || "";
      return jsonResp({ image: url, text });
    }

    // Stream pass-through
    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    success = false;
    errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("chat error:", e);
    return jsonResp({ error: errorMessage }, 500);
  } finally {
    // best-effort usage logging
    if (apiKeyId) {
      try {
        const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supa.from("api_usage").insert({ api_key_id: apiKeyId, message_length: messageLength, success, error_message: errorMessage });
      } catch (_) { /* ignore */ }
    }
  }
});
