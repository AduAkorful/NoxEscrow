import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

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
