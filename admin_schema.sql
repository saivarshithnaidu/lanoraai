-- 1. Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT CHECK (provider IN ('openrouter', 'groq', 'openai')),
  api_key TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failed')),
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admin can see API keys
CREATE POLICY "Admins can manage api_keys"
  ON public.api_keys
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'saivarshith8284@gmail.com');

-- 2. Create logs table
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('chat', 'error', 'payment', 'api')),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for logs
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
  ON public.logs
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'saivarshith8284@gmail.com');

-- 3. Create usage_logs table
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_used INTEGER,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all usage logs"
  ON public.usage_logs
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'saivarshith8284@gmail.com');

-- Helper to update usage_count on api_keys
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.api_keys
  SET usage_count = usage_count + 1,
      last_used = now()
  WHERE id = key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;