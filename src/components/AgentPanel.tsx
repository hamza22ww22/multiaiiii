import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Square, Terminal as TerminalIcon, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Step = {
  id: string;
  idx: number;
  kind: "assistant" | "tool" | "user";
  content: string | null;
  tool_name: string | null;
  tool_input: any;
  tool_output: string | null;
  created_at: string;
};
type Task = { id: string; prompt: string; status: string; result: string | null; error: string | null; sandbox_id: string | null };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callFn(path: string, body: any) {
  const r = await fetch(`${FN_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default function AgentPanel() {
  const [prompt, setPrompt] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [steps]);

  // Polling + auto-resume loop
  useEffect(() => {
    if (!task) return;
    let stop = false;

    async function tick() {
      if (stop) return;
      const { data: t } = await supabase.from("agent_tasks").select("*").eq("id", task!.id).maybeSingle();
      const { data: s } = await supabase.from("agent_steps").select("*").eq("task_id", task!.id).order("idx");
      if (t) setTask(t as Task);
      if (s) setSteps(s as Step[]);

      if (t && t.status === "running" && !loading) {
        // auto-resume: kick the function again
        setLoading(true);
        try { await callFn("agent-run", { task_id: task!.id }); } catch (_) {}
        setLoading(false);
      }
      if (!stop) tickRef.current = window.setTimeout(tick, 1500) as unknown as number;
    }
    tick();
    return () => { stop = true; if (tickRef.current) clearTimeout(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const start = async () => {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    setSteps([]);
    try {
      const r = await callFn("agent-run", { prompt: p });
      if (r.error) throw new Error(r.error);
      const { data } = await supabase.from("agent_tasks").select("*").eq("id", r.task_id).maybeSingle();
      setTask(data as Task);
      setPrompt("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    if (!task) return;
    await callFn("agent-stop", { task_id: task.id });
    toast.success("Agent stopped");
  };

  const reset = () => { setTask(null); setSteps([]); };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">Agent Mode</h2>
          {task && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
              task.status === "running" ? "bg-blue-500/20 text-blue-300" :
              task.status === "done" ? "bg-emerald-500/20 text-emerald-300" :
              task.status === "stopped" ? "bg-amber-500/20 text-amber-300" :
              "bg-red-500/20 text-red-300"
            }`}>{task.status}</span>
          )}
        </div>
        <div className="flex gap-2">
          {task?.status === "running" && (
            <Button size="sm" variant="outline" onClick={stop}><Square className="mr-1 h-3 w-3" />Stop</Button>
          )}
          {task && task.status !== "running" && (
            <Button size="sm" variant="outline" onClick={reset}>New task</Button>
          )}
        </div>
      </div>

      {!task && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <p className="text-center text-sm text-muted-foreground">
            Give the agent a task. It has its own Linux sandbox with bash, Python, git, and web access.
          </p>
          <div className="grid w-full max-w-xl grid-cols-2 gap-2 text-xs">
            {[
              "Clone https://github.com/sindresorhus/awesome and list top-level categories",
              "Fetch hacker news front page and summarize top 5 stories",
              "Write a Python script that generates a CSV of 100 fake users and show first 10 rows",
              "Install requests in Python and check the weather in Tokyo via wttr.in",
            ].map((s) => (
              <button key={s} onClick={() => setPrompt(s)} className="rounded border border-white/10 bg-white/[0.03] p-2 text-left hover:bg-white/[0.06]">
                {s}
              </button>
            ))}
          </div>
          <div className="flex w-full max-w-xl gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Clone repo X, run its tests, and report results…"
              className="min-h-[80px]"
            />
            <Button onClick={start} disabled={loading || !prompt.trim()} className="self-end">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="mr-1 h-4 w-4" />Run</>}
            </Button>
          </div>
        </div>
      )}

      {task && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-black/40 p-3 font-mono text-xs">
          <div className="mb-3 rounded border border-white/10 bg-white/[0.02] p-2 text-[11px] text-muted-foreground">
            <span className="text-foreground">$ task</span> {task.prompt}
            {task.sandbox_id && <div className="mt-1 opacity-70">sandbox: {task.sandbox_id.slice(0, 16)}…</div>}
          </div>
          {steps.map((s) => {
            if (s.kind === "assistant") {
              return (
                <div key={s.id} className="mb-2">
                  {s.content && <div className="whitespace-pre-wrap text-foreground/90">{s.content}</div>}
                  {s.tool_name && (
                    <div className="mt-1 text-blue-300">▸ {s.tool_name}({truncJson(s.tool_input)})</div>
                  )}
                </div>
              );
            }
            if (s.kind === "tool") {
              const open = expanded[s.id] ?? (s.tool_output && s.tool_output.length < 400);
              return (
                <div key={s.id} className="mb-2 ml-3 border-l-2 border-emerald-500/30 pl-2">
                  <button onClick={() => setExpanded({ ...expanded, [s.id]: !open })} className="flex items-center gap-1 text-emerald-300/80">
                    {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {s.tool_name} output ({s.tool_output?.length || 0} chars)
                  </button>
                  {open && <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all text-emerald-200/80">{s.tool_output}</pre>}
                </div>
              );
            }
            return null;
          })}
          {task.status === "running" && (
            <div className="flex items-center gap-2 text-blue-300"><Loader2 className="h-3 w-3 animate-spin" /> agent thinking…</div>
          )}
          {task.status === "done" && task.result && (
            <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-200">
              <div className="mb-1 text-[10px] uppercase opacity-70">Final result</div>
              <div className="whitespace-pre-wrap">{task.result}</div>
            </div>
          )}
          {task.error && (
            <div className="mt-3 rounded border border-red-500/30 bg-red-500/5 p-2 text-red-200">{task.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

function truncJson(v: any) {
  try {
    const s = JSON.stringify(v);
    return s.length > 120 ? s.slice(0, 120) + "…" : s;
  } catch { return ""; }
}