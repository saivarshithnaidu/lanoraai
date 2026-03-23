-- Fix Foreign Key Constraints for Social System
-- The app uses public.profiles for user data instead of auth.users

-- 1. Fix Follows Table
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
ALTER TABLE public.follows 
  ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows 
  ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Fix Posts Table
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.posts 
  ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Fix Stories Table
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;
ALTER TABLE public.stories 
  ADD CONSTRAINT stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Fix Blocks Table
ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_fkey;
ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_blocked_id_fkey;
ALTER TABLE public.blocks 
  ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.blocks 
  ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Fix Reports Table
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_target_id_fkey;
ALTER TABLE public.reports 
  ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reports 
  ADD CONSTRAINT reports_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
