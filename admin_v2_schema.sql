-- 1. Extend Profiles for detailed tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_logout TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 2. Create Chat Logs for Admin Monitoring
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    response TEXT,
    model_used TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Realtime for Chat Logs safely
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_logs;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Skip if publication logic is already managed
END $$;

-- 4. Function to capture login time (to be called from API)
CREATE OR REPLACE FUNCTION public.track_user_login(user_id UUID, user_ip TEXT, user_device TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        last_login = NOW(),
        ip_address = user_ip,
        device_id = user_device
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 5. Omniscient Mirroring Trigger
-- Mirror every message to chat_logs automatically for total admin oversight
CREATE OR REPLACE FUNCTION public.mirror_to_chat_logs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.chat_logs (id, user_id, message, response, model_used, created_at)
    VALUES (
        NEW.id, 
        NEW.user_id, 
        NEW.content, 
        'Peer-to-Peer Signal', 
        'P2P', 
        NEW.created_at
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_mirror_messages ON public.messages;
CREATE TRIGGER tr_mirror_messages
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mirror_to_chat_logs();

-- 6. Soft-Archive Deleted Messages for Admin Oversight
CREATE OR REPLACE FUNCTION public.track_message_deletion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_logs 
    SET is_deleted = TRUE 
    WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_track_deletion ON public.messages;
CREATE TRIGGER tr_track_deletion
AFTER DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.track_message_deletion();
