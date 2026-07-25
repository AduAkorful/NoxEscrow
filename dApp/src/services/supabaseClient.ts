import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Safe fallback config to prevent app from crashing on load if environment variables are missing
const safeUrl = supabaseUrl && supabaseUrl.startsWith("http") ? supabaseUrl : "https://placeholder-project.supabase.co";
const safeKey = supabaseKey || "placeholder-anon-key";

export const supabase = createClient(safeUrl, safeKey);

export interface EscrowMessage {
  id: string;
  created_at: string;
  escrow_address: string;
  sender_address: string;
  ciphertext: string;
  iv: string;
}

export interface DoubleBlindReview {
  id: string;
  created_at: string;
  escrow_address: string;
  milestone_index: number;
  reviewer_address: string;
  ciphertext: string;
  iv: string;
}
