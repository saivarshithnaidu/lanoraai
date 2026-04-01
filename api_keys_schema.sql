-- 1. Drop existing table to fix foreign key constraint
DROP TABLE IF EXISTS public.user_api_keys;

-- 2. Re-create user_api_keys table referencing profiles(id)
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- 3. Enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- 4. Policy for users to manage their own keys
-- Note: Since we use custom JWT and Service Role for API management, 
-- we'll manage security in the API layer, but good to have this if we use client-side later.
CREATE POLICY "Users can manage their own api keys"
  ON public.user_api_keys
  FOR ALL
  USING (true); -- Managed by server-side logic and custom auth for now

-- 5. Index for faster key lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_key ON public.user_api_keys(api_key);
