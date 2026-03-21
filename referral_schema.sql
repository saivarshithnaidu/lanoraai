-- 1. Add referral columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- 2. Create referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_given BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_referral UNIQUE(referred_user_id)
);

-- Enable RLS for referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own referrals"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- 3. Update handle_new_user to generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_ref_code TEXT;
BEGIN
  -- Generate a random 8-character uppercase referral code
  new_ref_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
  
  INSERT INTO public.profiles (id, credits, plan, role, referral_code)
  VALUES (new.id, 50, 'free', 'user', new_ref_code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to apply referral reward
CREATE OR REPLACE FUNCTION public.apply_referral_reward(p_referral_code TEXT, p_referred_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- 1. Find referrer
  SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = p_referral_code;
  
  -- 2. Basic checks
  IF v_referrer_id IS NULL OR v_referrer_id = p_referred_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- 3. Check if already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = p_referred_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- 4. Record referral
  INSERT INTO public.referrals (referrer_id, referred_user_id, reward_given)
  VALUES (v_referrer_id, p_referred_user_id, true);
  
  -- 5. Give reward (+10 credits to referrer)
  UPDATE public.profiles 
  SET credits = credits + 10 
  WHERE id = v_referrer_id;
  
  -- 6. Link profiles
  UPDATE public.profiles
  SET referred_by = v_referrer_id
  WHERE id = p_referred_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
