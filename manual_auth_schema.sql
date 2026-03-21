-- 1. Modify profiles table to be independent of auth.users
-- This is for manual auth WITHOUT Supabase Auth.
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Update existing tables to use profiles(id) if needed
-- Messages currently references auth.users(id), let's make it reference profiles(id)
ALTER TABLE IF EXISTS public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
-- Transactions currently references auth.users(id), same here
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

-- Cleanup Supabase Auth trigger (we don't need it for manual OAuth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- We can still keep RLS but we'll manually check against our JWT claim (which we'll put in the request)
-- However, since the client-side use of 'supabase-js' won't have a Supabase Auth session, 
-- we'll have to rely on our own API routes for database operations or use the Service Role sparingly.
-- For simplicity, we'll keep the tables but manage permissions in our manual middleware.
