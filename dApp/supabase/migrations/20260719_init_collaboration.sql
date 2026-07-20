-- Supabase Database Schema and RLS Policies for NoxEscrow Collaboration Features

-- 1. Create the escrow_messages table for end-to-end encrypted chat (Step 3.1)
CREATE TABLE IF NOT EXISTS public.escrow_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    escrow_address TEXT NOT NULL,
    sender_address TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL
);

-- Enable Row-Level Security on escrow_messages
ALTER TABLE public.escrow_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow any authenticated user to select/insert messages.
-- In a production system, this policy should join with on-chain or off-chain escrow counterparties 
-- to restrict access strictly to client and freelancer addresses.
CREATE POLICY "Allow select for counterparties" 
ON public.escrow_messages
FOR SELECT
USING (true);

CREATE POLICY "Allow insert for counterparties" 
ON public.escrow_messages
FOR INSERT
WITH CHECK (true);


-- 2. Create the double_blind_reviews table (Step 3.2)
CREATE TABLE IF NOT EXISTS public.double_blind_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    escrow_address TEXT NOT NULL,
    milestone_index INTEGER NOT NULL,
    reviewer_address TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    UNIQUE(escrow_address, milestone_index, reviewer_address)
);

-- Enable Row-Level Security on double_blind_reviews
ALTER TABLE public.double_blind_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select reviews" 
ON public.double_blind_reviews
FOR SELECT
USING (true);

CREATE POLICY "Allow insert reviews" 
ON public.double_blind_reviews
FOR INSERT
WITH CHECK (true);
