const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const XPRIVO_URL = "https://www.xprivo.com/v1/chat/completions";
const XPRIVO_MODELS = new Set(["xprivo", "qwen-latest", "mistral-3"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model } = await req.json();
    const chosen = model || "xprivo";
    const sys = { role: "system", content: "You are a helpful AI assistant. Keep answers clear and concise." };

    let response: Response;
    if (XPRIVO_MODELS.has(chosen)) {
      const apiKey = Deno.env.get("XPRIVO_API_KEY") || "API_KEY_XPRIVO";
      response = await fetch(XPRIVO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "x-api-version": "2",
          "x-lang-chat": "en",
          "x-use-web": "off",
        },
        body: JSON.stringify({ model: chosen, messages: [sys, ...messages], stream: true }),
      });
    } else {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: chosen, messages: [sys, ...messages], stream: true }),
      });
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Upstream error:", response.status, t);
      return new Response(JSON.stringify({ error: `Upstream error (${response.status})` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
