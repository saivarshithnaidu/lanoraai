-- Billing Details Table
CREATE TABLE IF NOT EXISTS public.billing_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References profiles(id)
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  street_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link with transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS billing_id UUID REFERENCES public.billing_details(id);

-- Enable RLS for billing_details
ALTER TABLE public.billing_details ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will need to be configured if we ever use client-side Supabase for this table.
-- Currently the app uses a server-side Service Role to manage transactions.
