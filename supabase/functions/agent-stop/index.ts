import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Sandbox } from "https://esm.sh/@e2b/code-interpreter@1.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { task_id } = await req.json();
    const { data: t } = await supa.from("agent_tasks").select("sandbox_id").eq("id", task_id).maybeSingle();
    if (t?.sandbox_id) {
      try { await Sandbox.kill(t.sandbox_id, { apiKey: Deno.env.get("E2B_API_KEY")! }); } catch (_) {}
    }
    await supa.from("agent_tasks").update({ status: "stopped", updated_at: new Date().toISOString() }).eq("id", task_id);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});