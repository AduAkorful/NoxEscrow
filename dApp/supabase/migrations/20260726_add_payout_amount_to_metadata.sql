-- Migration: Add optional payout_amount column to escrow_metadata table
ALTER TABLE public.escrow_metadata ADD COLUMN IF NOT EXISTS payout_amount NUMERIC;
