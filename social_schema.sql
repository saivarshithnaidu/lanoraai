-- 1. Extend Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- 2. Follows System
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'accepted', -- 'pending' for private accounts
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- 3. Social Feed (Posts)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Stories (Expiring)
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- 5. Safety (Blocks & Reports)
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  type TEXT, -- 'profile', 'post', 'story'
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Chat Enhancements
-- These might already exist, adding safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='is_seen') THEN
        ALTER TABLE public.chat_messages ADD COLUMN is_seen BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='seen_at') THEN
        ALTER TABLE public.chat_messages ADD COLUMN seen_at TIMESTAMPTZ;
    END IF;
END $$;

-- Enable RLS for all
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Basic Policies
DROP POLICY IF EXISTS "Public profiles can see posts" ON public.posts;
CREATE POLICY "Public profiles can see posts" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own posts" ON public.posts;
CREATE POLICY "Users can manage their own posts" ON public.posts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Followers can see stories" ON public.stories;
CREATE POLICY "Followers can see stories" ON public.stories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own stories" ON public.stories;
CREATE POLICY "Users can manage their own stories" ON public.stories FOR ALL USING (auth.uid() = user_id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
