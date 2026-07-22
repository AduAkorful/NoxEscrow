import { supabase } from './supabaseClient';
import type { FreelancerProfile } from '../components/FreelancerMarketplace';

/**
 * Category migration helper to ensure legacy cached category names match current filters
 */
export function normalizeCategory(cat: string): FreelancerProfile['category'] {
  if (!cat) return 'Software & Web';
  if (cat === 'Smart Contracts' || cat === 'Security Audits') return 'Smart Contracts & Security';
  if (cat === 'Frontend/dApps') return 'Software & Web';
  if (cat === 'TEE Enclaves' || cat === 'AI/ML') return 'AI & Data Science';
  return cat as FreelancerProfile['category'];
}

/**
 * Fetch all real freelancer profiles directly from Supabase production database
 */
export async function getFreelancerProfilesFromSupabase(): Promise<FreelancerProfile[]> {
  try {
    // Delete any legacy mock seed rows from Supabase database table
    await supabase
      .from('freelancer_profiles')
      .delete()
      .in('id', ['f1', 'f2', 'f3', 'f4', 'f5']);

    const { data, error } = await supabase
      .from('freelancer_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      walletAddress: row.wallet_address,
      name: row.name,
      title: row.title,
      bio: row.bio,
      category: normalizeCategory(row.category),
      hourlyRate: row.hourly_rate,
      reputationScore: row.reputation_score,
      tier: row.tier,
      feeDiscountBps: row.fee_discount_bps,
      completedEscrows: row.completed_escrows,
      disputesLost: row.disputes_lost,
      onTimeRate: row.on_time_rate,
      skills: row.skills || [],
      githubUrl: row.github_url,
      twitterUrl: row.twitter_url,
      portfolioUrl: row.portfolio_url,
      isAvailable: row.is_available,
      isWalletVerified: row.is_wallet_verified
    }));
  } catch (err) {
    console.warn("Supabase fetch error:", err);
    return [];
  }
}

/**
 * Upsert a freelancer profile directly in Supabase production database
 */
export async function saveFreelancerProfileToSupabase(profile: FreelancerProfile): Promise<boolean> {
  try {
    const payload = {
      id: profile.id || `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      wallet_address: profile.walletAddress.toLowerCase(),
      name: profile.name,
      title: profile.title,
      bio: profile.bio,
      category: profile.category,
      hourly_rate: profile.hourlyRate,
      reputation_score: profile.reputationScore,
      tier: profile.tier,
      fee_discount_bps: profile.feeDiscountBps,
      completed_escrows: profile.completedEscrows,
      disputes_lost: profile.disputesLost,
      on_time_rate: profile.onTimeRate,
      skills: profile.skills,
      github_url: profile.githubUrl || null,
      twitter_url: profile.twitterUrl || null,
      portfolio_url: profile.portfolioUrl || null,
      is_available: profile.isAvailable,
      is_wallet_verified: profile.isWalletVerified ?? true,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('freelancer_profiles')
      .upsert(payload, { onConflict: 'wallet_address' });

    if (error) {
      console.warn("Error saving freelancer profile to Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed to connect to Supabase database:", err);
    return false;
  }
}
