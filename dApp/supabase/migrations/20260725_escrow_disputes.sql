-- Migration: Create escrow_disputes table for live TEE Gemini 2.5 Flash evaluation records
CREATE TABLE IF NOT EXISTS public.escrow_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    escrow_address TEXT NOT NULL,
    milestone_index INTEGER NOT NULL,
    verdict TEXT NOT NULL, -- 'PAY_FREELANCER' or 'REFUND_CLIENT'
    score INTEGER NOT NULL, -- 0-100 score
    reasoning TEXT NOT NULL,
    model_name TEXT DEFAULT 'gemini-2.5-flash',
    logs JSONB,
    UNIQUE(escrow_address, milestone_index)
);

-- Enable Row-Level Security on escrow_disputes
ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to dispute records
CREATE POLICY "Allow public select disputes" 
ON public.escrow_disputes
FOR SELECT
USING (true);

-- Restrict write/update operations strictly to service role / TEE arbiter authenticated backend
CREATE POLICY "Allow service_role insert disputes" 
ON public.escrow_disputes
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Allow service_role update disputes" 
ON public.escrow_disputes
FOR UPDATE
TO service_role
USING (true);
