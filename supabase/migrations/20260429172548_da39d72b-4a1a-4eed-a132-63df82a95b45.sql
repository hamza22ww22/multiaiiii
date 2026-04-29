
-- API keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_key ON public.api_keys(key);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (generate) a new key
CREATE POLICY "anyone can create api keys"
  ON public.api_keys
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Note: no SELECT/UPDATE/DELETE policies => client cannot read/modify keys.
-- The edge function uses the service role to validate keys.

-- Usage log table
CREATE TABLE public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  message_length INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_usage_key_id ON public.api_usage(api_key_id);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
-- No policies => no client access. Only service role (edge function) can read/write.
