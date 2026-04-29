import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UPSTREAM_URL = "https://glmfivepointone.space-z.ai/api/chat";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

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

  // Validate key
  const { data: keyRow, error: keyErr } = await supabase
    .from("api_keys")
    .select("id, active")
    .eq("key", apiKey)
    .maybeSingle();

  if (keyErr || !keyRow || !keyRow.active) {
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

  let success = true;
  let errMsg: string | null = null;
  let upstreamData: any = null;

  try {
    const upstreamRes = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://glmfivepointone.space-z.ai",
        "Referer": "https://glmfivepointone.space-z.ai/",
        "User-Agent": "Mozilla/5.0 (compatible; GLMProxy/1.0)",
      },
      body: JSON.stringify({
        messages,
        fileContent: body?.fileContent ?? null,
        fileName: body?.fileName ?? null,
      }),
    });

    const text = await upstreamRes.text();
    try {
      upstreamData = JSON.parse(text);
    } catch {
      upstreamData = { response: text };
    }

    if (!upstreamRes.ok) {
      success = false;
      errMsg = `Upstream ${upstreamRes.status}`;
    }

    // Log usage (fire & forget but awaited so it doesn't get cancelled)
    await supabase.from("api_usage").insert({
      api_key_id: keyRow.id,
      message_length: totalLen,
      success,
      error_message: errMsg,
    });

    return new Response(
      JSON.stringify({
        success,
        response: upstreamData?.response ?? null,
        raw: upstreamData,
      }),
      {
        status: success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    success = false;
    errMsg = e instanceof Error ? e.message : "Unknown error";
    await supabase.from("api_usage").insert({
      api_key_id: keyRow.id,
      message_length: totalLen,
      success: false,
      error_message: errMsg,
    });
    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
