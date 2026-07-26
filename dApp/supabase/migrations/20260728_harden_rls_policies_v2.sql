-- Migration: Strict Production Hardening of Row-Level Security (RLS) Policies
-- Revokes anonymous mutation privileges and restricts INSERT/UPDATE to authenticated users and service_role.

-- 1. escrow_metadata
ALTER TABLE IF EXISTS public.escrow_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert escrow_metadata" ON public.escrow_metadata;
DROP POLICY IF EXISTS "Allow authenticated insert escrow_metadata" ON public.escrow_metadata;
CREATE POLICY "Allow authenticated insert escrow_metadata"
ON public.escrow_metadata FOR INSERT TO authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update escrow_metadata" ON public.escrow_metadata;
DROP POLICY IF EXISTS "Allow authenticated update escrow_metadata" ON public.escrow_metadata;
CREATE POLICY "Allow authenticated update escrow_metadata"
ON public.escrow_metadata FOR UPDATE TO authenticated, service_role USING (true);

-- 2. escrow_messages
ALTER TABLE IF EXISTS public.escrow_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for counterparties" ON public.escrow_messages;
DROP POLICY IF EXISTS "Allow authenticated insert escrow_messages" ON public.escrow_messages;
CREATE POLICY "Allow authenticated insert escrow_messages"
ON public.escrow_messages FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- 3. double_blind_reviews
ALTER TABLE IF EXISTS public.double_blind_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert reviews" ON public.double_blind_reviews;
DROP POLICY IF EXISTS "Allow authenticated insert reviews" ON public.double_blind_reviews;
CREATE POLICY "Allow authenticated insert reviews"
ON public.double_blind_reviews FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- 4. freelancer_profiles
ALTER TABLE IF EXISTS public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public update of freelancer profiles" ON public.freelancer_profiles;
DROP POLICY IF EXISTS "Allow authenticated update of freelancer profiles" ON public.freelancer_profiles;
CREATE POLICY "Allow authenticated update of freelancer profiles"
ON public.freelancer_profiles FOR UPDATE TO authenticated, service_role USING (true);
