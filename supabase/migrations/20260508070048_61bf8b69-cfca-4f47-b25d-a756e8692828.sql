
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  sandbox_id text,
  model text NOT NULL DEFAULT 'google/gemini-2.5-pro',
  result text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  idx integer NOT NULL,
  kind text NOT NULL,
  content text,
  tool_name text,
  tool_input jsonb,
  tool_output text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_steps_task ON public.agent_steps(task_id, idx);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read tasks"   ON public.agent_tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert tasks" ON public.agent_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public read steps"   ON public.agent_steps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert steps" ON public.agent_steps FOR INSERT TO anon, authenticated WITH CHECK (true);
