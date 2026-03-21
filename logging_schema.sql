-- 1. Create chat_logs table
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for chat_logs
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admin email
CREATE POLICY "Admins can view all chat logs"
  ON public.chat_logs
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'saivarshith8284@gmail.com');

-- 2. Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all error logs"
  ON public.error_logs
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'saivarshith8284@gmail.com');
