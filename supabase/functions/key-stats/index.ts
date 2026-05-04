import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || (req.method === "POST" ? (await req.json().catch(() => ({}))).key : null);
    if (!key) {
      return new Response(JSON.stringify({ error: "key required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: keyRow, error: ke } = await supa.from("api_keys").select("id, name, active, created_at").eq("key", key).maybeSingle();
    if (ke) throw ke;
    if (!keyRow) return new Response(JSON.stringify({ error: "key not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: usage } = await supa
      .from("api_usage")
      .select("success, created_at")
      .eq("api_key_id", keyRow.id);

    const total = usage?.length || 0;
    const successCount = usage?.filter((u) => u.success).length || 0;
    const errors = total - successCount;
    const now = Date.now();
    const last24h = usage?.filter((u) => now - new Date(u.created_at).getTime() < 86400000).length || 0;

    return new Response(JSON.stringify({
      key: { name: keyRow.name, active: keyRow.active, created_at: keyRow.created_at },
      stats: { total_calls: total, success: successCount, errors, last_24h: last24h, working: keyRow.active },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
