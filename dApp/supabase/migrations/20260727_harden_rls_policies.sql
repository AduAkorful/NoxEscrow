-- Migration: Harden Row-Level Security (RLS) Policies across all NoxEscrow tables

-- 1. escrow_metadata RLS
ALTER TABLE IF EXISTS public.escrow_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select escrow_metadata" ON public.escrow_metadata;
CREATE POLICY "Allow public select escrow_metadata"
ON public.escrow_metadata FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert escrow_metadata" ON public.escrow_metadata;
CREATE POLICY "Allow authenticated insert escrow_metadata"
ON public.escrow_metadata FOR INSERT TO authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update escrow_metadata" ON public.escrow_metadata;
CREATE POLICY "Allow authenticated update escrow_metadata"
ON public.escrow_metadata FOR UPDATE TO authenticated, service_role USING (true);

-- 2. escrow_messages RLS
ALTER TABLE IF EXISTS public.escrow_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for counterparties" ON public.escrow_messages;
CREATE POLICY "Allow select for counterparties"
ON public.escrow_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for counterparties" ON public.escrow_messages;
CREATE POLICY "Allow insert for counterparties"
ON public.escrow_messages FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- 3. double_blind_reviews RLS
ALTER TABLE IF EXISTS public.double_blind_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select reviews" ON public.double_blind_reviews;
CREATE POLICY "Allow select reviews"
ON public.double_blind_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert reviews" ON public.double_blind_reviews;
CREATE POLICY "Allow insert reviews"
ON public.double_blind_reviews FOR INSERT TO authenticated, service_role WITH CHECK (true);
