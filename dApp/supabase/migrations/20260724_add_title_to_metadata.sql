-- Migration: Add optional title column to escrow_metadata table
CREATE TABLE IF NOT EXISTS public.escrow_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    escrow_address TEXT NOT NULL,
    milestone_index INTEGER NOT NULL,
    reqs_cid TEXT,
    devs_cid TEXT,
    client_statement TEXT,
    freelancer_statement TEXT,
    title TEXT,
    UNIQUE(escrow_address, milestone_index)
);

-- Ensure title column exists if table was already created
ALTER TABLE public.escrow_metadata ADD COLUMN IF NOT EXISTS title TEXT;
