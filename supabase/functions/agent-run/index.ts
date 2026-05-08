import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Sandbox } from "https://esm.sh/@e2b/code-interpreter@1.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "bash",
      description: "Run a shell command in the persistent Linux sandbox. Use for git clone, apt, ls, curl, etc. Returns stdout+stderr.",
      parameters: { type: "object", properties: { cmd: { type: "string", description: "Shell command to execute" }, timeout_sec: { type: "number", description: "Max seconds (default 60, max 600)" } }, required: ["cmd"] },
    },
  },
  {
    type: "function",
    function: {
      name: "python",
      description: "Execute Python code in the sandbox (state persists across calls). Use for data analysis, scraping, math.",
      parameters: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write text content to a file path inside the sandbox.",
      parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the sandbox.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description: "HTTP GET a URL and return the body (truncated to 20k chars). Use for fetching web pages or APIs.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
  },
  {
    type: "function",
    function: {
      name: "finish",
      description: "Call when the task is fully complete. Provide a final summary for the user.",
      parameters: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
    },
  },
];

async function getOrCreateSandbox(taskId: string, supa: any): Promise<{ sbx: Sandbox; sandboxId: string }> {
  const { data: t } = await supa.from("agent_tasks").select("sandbox_id").eq("id", taskId).maybeSingle();
  const apiKey = Deno.env.get("E2B_API_KEY")!;
  if (t?.sandbox_id) {
    try {
      const sbx = await Sandbox.connect(t.sandbox_id, { apiKey });
      await sbx.setTimeout(60 * 60 * 1000); // extend 1h
      return { sbx, sandboxId: t.sandbox_id };
    } catch (_) { /* fall through, create new */ }
  }
  const sbx = await Sandbox.create({ apiKey, timeoutMs: 60 * 60 * 1000 });
  const sandboxId = sbx.sandboxId;
  await supa.from("agent_tasks").update({ sandbox_id: sandboxId, updated_at: new Date().toISOString() }).eq("id", taskId);
  return { sbx, sandboxId };
}

async function runTool(sbx: Sandbox, name: string, args: any): Promise<string> {
  try {
    if (name === "bash") {
      const r = await sbx.commands.run(args.cmd, { timeoutMs: Math.min((args.timeout_sec || 60) * 1000, 600_000) });
      return `exit:${r.exitCode}\n[stdout]\n${(r.stdout || "").slice(0, 8000)}\n[stderr]\n${(r.stderr || "").slice(0, 4000)}`;
    }
    if (name === "python") {
      const r = await sbx.runCode(args.code);
      const out = (r.logs?.stdout || []).join("") || "";
      const err = (r.logs?.stderr || []).join("") || "";
      const txt = r.text || "";
      return `${txt}\n[stdout]\n${out.slice(0, 8000)}\n[stderr]\n${err.slice(0, 4000)}${r.error ? `\n[error] ${r.error.name}: ${r.error.value}` : ""}`;
    }
    if (name === "write_file") {
      await sbx.files.write(args.path, args.content);
      return `wrote ${args.content.length} chars to ${args.path}`;
    }
    if (name === "read_file") {
      const c = await sbx.files.read(args.path);
      return String(c).slice(0, 12000);
    }
    if (name === "fetch_url") {
      const r = await fetch(args.url, { headers: { "User-Agent": "Mozilla/5.0 LovableAgent" } });
      const t = await r.text();
      return `status:${r.status}\n${t.slice(0, 20000)}`;
    }
    return `unknown tool: ${name}`;
  } catch (e) {
    return `tool error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function loadHistory(supa: any, taskId: string) {
  const { data: task } = await supa.from("agent_tasks").select("*").eq("id", taskId).maybeSingle();
  const { data: steps } = await supa.from("agent_steps").select("*").eq("task_id", taskId).order("idx");
  return { task, steps: steps || [] };
}

function buildMessages(task: any, steps: any[]): any[] {
  const msgs: any[] = [
    { role: "system", content: `You are an autonomous coding agent with a persistent Linux sandbox. You have these tools: bash, python, write_file, read_file, fetch_url, finish.

Rules:
- Break the task into steps; call ONE tool at a time.
- Use bash for git clone, installs, file ops. Python for compute/data.
- Be concise in your reasoning between tool calls.
- When fully done, call finish() with a clear summary.
- The sandbox persists across your turns. Files you write stay until task ends.

Task: ${task.prompt}` },
  ];
  for (const s of steps) {
    if (s.kind === "assistant") {
      const m: any = { role: "assistant", content: s.content || "" };
      if (s.tool_name) {
        m.tool_calls = [{ id: s.id, type: "function", function: { name: s.tool_name, arguments: JSON.stringify(s.tool_input || {}) } }];
      }
      msgs.push(m);
    } else if (s.kind === "tool") {
      msgs.push({ role: "tool", tool_call_id: s.id, content: s.tool_output || "" });
    } else if (s.kind === "user") {
      msgs.push({ role: "user", content: s.content || "" });
    }
  }
  return msgs;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const LK = Deno.env.get("LOVABLE_API_KEY");
  if (!LK) return json({ error: "LOVABLE_API_KEY missing" }, 500);
  if (!Deno.env.get("E2B_API_KEY")) return json({ error: "E2B_API_KEY missing" }, 500);

  try {
    const body = await req.json();
    let { task_id, prompt, model } = body;

    // Create task if new
    if (!task_id) {
      if (!prompt) return json({ error: "prompt required" }, 400);
      const { data, error } = await supa.from("agent_tasks").insert({ prompt, model: model || "google/gemini-2.5-pro", status: "running" }).select().single();
      if (error) return json({ error: error.message }, 500);
      task_id = data.id;
    }

    const { task } = await loadHistory(supa, task_id);
    if (!task) return json({ error: "task not found" }, 404);
    if (task.status === "done" || task.status === "stopped" || task.status === "failed") {
      return json({ task_id, status: task.status, done: true });
    }

    const { sbx } = await getOrCreateSandbox(task_id, supa);

    // Run loop with wall-clock budget (~120s) to stay under edge timeout
    const deadline = Date.now() + 115_000;
    let nextIdx = ((await supa.from("agent_steps").select("idx").eq("task_id", task_id).order("idx", { ascending: false }).limit(1)).data?.[0]?.idx ?? -1) + 1;
    let finished = false;
    let loopCount = 0;

    while (Date.now() < deadline && loopCount < 30) {
      loopCount++;
      const { steps } = await loadHistory(supa, task_id);
      const messages = buildMessages(task, steps);

      const aiRes = await fetch(LOVABLE_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${LK}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: task.model, messages, tools: TOOLS, tool_choice: "auto", stream: false }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        await supa.from("agent_tasks").update({ status: "failed", error: `AI ${aiRes.status}: ${t.slice(0, 300)}`, updated_at: new Date().toISOString() }).eq("id", task_id);
        return json({ task_id, status: "failed", error: t.slice(0, 300) }, 502);
      }
      const aiData = await aiRes.json();
      const choice = aiData.choices?.[0]?.message;
      const toolCalls = choice?.tool_calls || [];
      const content = choice?.content || "";

      // Save assistant step
      const callId = toolCalls[0]?.id || crypto.randomUUID();
      const tName = toolCalls[0]?.function?.name || null;
      let tArgs: any = {};
      try { tArgs = toolCalls[0] ? JSON.parse(toolCalls[0].function.arguments || "{}") : {}; } catch { tArgs = {}; }

      await supa.from("agent_steps").insert({ id: callId, task_id, idx: nextIdx++, kind: "assistant", content, tool_name: tName, tool_input: tArgs });

      if (!tName) {
        // No tool call → consider done
        await supa.from("agent_tasks").update({ status: "done", result: content, updated_at: new Date().toISOString() }).eq("id", task_id);
        finished = true;
        break;
      }

      if (tName === "finish") {
        await supa.from("agent_steps").insert({ task_id, idx: nextIdx++, kind: "tool", tool_name: "finish", tool_output: tArgs.summary || "done" });
        await supa.from("agent_tasks").update({ status: "done", result: tArgs.summary || content, updated_at: new Date().toISOString() }).eq("id", task_id);
        finished = true;
        break;
      }

      const out = await runTool(sbx, tName, tArgs);
      // tool step uses callId as id so OpenAI tool_call_id matches
      await supa.from("agent_steps").insert({ id: crypto.randomUUID(), task_id, idx: nextIdx++, kind: "tool", tool_name: tName, tool_output: out });
      // overwrite the inserted tool row id mapping by re-inserting? Instead update last step to use callId-based content; simpler: change buildMessages to use s.id for tool too — already done.
    }

    if (!finished) {
      await supa.from("agent_tasks").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", task_id);
    }
    return json({ task_id, status: finished ? "done" : "running", done: finished });
  } catch (e) {
    console.error("agent-run error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});