-- Supabase Database Schema for NoxEscrow Freelancer Directory & Profiles

CREATE TABLE IF NOT EXISTS public.freelancer_profiles (
    id TEXT PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    bio TEXT NOT NULL,
    category TEXT NOT NULL,
    hourly_rate TEXT NOT NULL,
    reputation_score INTEGER DEFAULT 600,
    tier TEXT DEFAULT 'Bronze',
    fee_discount_bps INTEGER DEFAULT 50,
    completed_escrows INTEGER DEFAULT 0,
    disputes_lost INTEGER DEFAULT 0,
    on_time_rate INTEGER DEFAULT 100,
    skills TEXT[] DEFAULT '{}',
    github_url TEXT,
    twitter_url TEXT,
    portfolio_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_wallet_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all freelancer profiles
CREATE POLICY "Allow public select of freelancer profiles" 
ON public.freelancer_profiles 
FOR SELECT 
USING (true);

-- Allow profile creation and updates for anon, authenticated, or service role
CREATE POLICY "Allow public insert of freelancer profiles" 
ON public.freelancer_profiles 
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY "Allow public update of freelancer profiles" 
ON public.freelancer_profiles 
FOR UPDATE
TO anon, authenticated, service_role
USING (true);
