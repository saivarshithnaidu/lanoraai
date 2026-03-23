-- 1. Update Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 2. Update Messages Table for Soft Delete
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- 3. Create Chat Logs Table
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Realtime for Chat Logs and Messages
-- This ensures the admin dashboard can subscribe to changes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- 5. Update RLS Policies for Admin Access

-- Profiles: Admins see all, users see self
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Messages: Admins see all (including deleted), users see only their non-deleted ones
DROP POLICY IF EXISTS "Users can view their own non-deleted messages" ON public.messages;
CREATE POLICY "Users can view their own non-deleted messages"
  ON public.messages
  FOR SELECT
  USING (
    (auth.uid() = user_id AND is_deleted = false) OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Chat Logs: Only Admins can view
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view chat logs" ON public.chat_logs;
CREATE POLICY "Only admins can view chat logs"
  ON public.chat_logs
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 6. Trigger to log chat interactions (if we want automatic logging from messages)
-- But the user asked for a separate table chat_logs(user_id, message, response)
-- Typically, this is done in the API route when the AI responds.
