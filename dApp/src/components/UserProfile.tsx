import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Award, 
  ExternalLink, 
  Edit3, 
  Copy, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Code, 
  Share2, 
  User,
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { getInitials } from './FreelancerMarketplace';
import type { FreelancerProfile } from './FreelancerMarketplace';
import { 
  getFreelancerProfilesFromSupabase, 
  saveFreelancerProfileToSupabase, 
  normalizeCategory 
} from '../services/freelancerService';

interface UserProfileProps {
  walletAddress: string | null;
  onHireFreelancer: (freelancerAddress: string) => void;
}

export function UserProfile({ walletAddress, onHireFreelancer }: UserProfileProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const queryAddress = searchParams.get('address');
  const targetWalletAddress = queryAddress || walletAddress;

  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit State
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCategory, setEditCategory] = useState<FreelancerProfile['category']>('Software & Web');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editGithubUrl, setEditGithubUrl] = useState('');
  const [editTwitterUrl, setEditTwitterUrl] = useState('');
  const [editPortfolioUrl, setEditPortfolioUrl] = useState('');
  const [editIsAvailable, setEditIsAvailable] = useState(true);

  const isOwner = walletAddress && targetWalletAddress && walletAddress.toLowerCase() === targetWalletAddress.toLowerCase();

  // Load profile data from Supabase
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const allProfiles = await getFreelancerProfilesFromSupabase();
      
      let found: FreelancerProfile | undefined;
      if (targetWalletAddress) {
        found = allProfiles.find(p => p.walletAddress.toLowerCase() === targetWalletAddress.toLowerCase());
      }

      if (found) {
        setProfile(found);
      } else if (isOwner && walletAddress) {
        // Default new profile template for connected user
        const newTemp: FreelancerProfile = {
          id: `f_${Date.now()}`,
          walletAddress: walletAddress,
          name: 'Anonymous Freelancer',
          title: 'Digital Specialist & Engineer',
          bio: 'Welcome to my NoxEscrow profile! Create or customize your profile to start receiving confidential escrow offers.',
          category: 'Software & Web',
          hourlyRate: '100 cUSDC/hr',
          reputationScore: 600,
          tier: 'Bronze',
          feeDiscountBps: 50,
          completedEscrows: 0,
          disputesLost: 0,
          onTimeRate: 100,
          skills: ['Software Engineering', 'TypeScript'],
          isAvailable: true,
          isWalletVerified: true
        };
        setProfile(newTemp);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    loadProfile();
  }, [targetWalletAddress, walletAddress, isOwner]);

  const openEdit = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditTitle(profile.title);
    setEditBio(profile.bio);
    setEditCategory(normalizeCategory(profile.category));
    setEditHourlyRate(profile.hourlyRate);
    setEditSkills(profile.skills.join(', '));
    setEditGithubUrl(profile.githubUrl || '');
    setEditTwitterUrl(profile.twitterUrl || '');
    setEditPortfolioUrl(profile.portfolioUrl || '');
    setEditIsAvailable(profile.isAvailable);
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !profile) return;
    setIsSaving(true);

    const skillsArray = editSkills.split(',').map(s => s.trim()).filter(Boolean);

    const updated: FreelancerProfile = {
      ...profile,
      name: editName || 'Anonymous Freelancer',
      title: editTitle,
      bio: editBio,
      category: editCategory,
      hourlyRate: editHourlyRate,
      skills: skillsArray.length ? skillsArray : ['Engineering'],
      githubUrl: editGithubUrl,
      twitterUrl: editTwitterUrl,
      portfolioUrl: editPortfolioUrl,
      isAvailable: editIsAvailable,
      isWalletVerified: true
    };

    await saveFreelancerProfileToSupabase(updated);
    setProfile(updated);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/profile?address=${targetWalletAddress}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
        <Sparkles className="w-8 h-8 text-[#38BDF8] animate-spin" />
        <span className="text-xs font-mono">Fetching profile from Supabase Database...</span>
      </div>
    );
  }

  if (!profile && !targetWalletAddress) {
    return (
      <div className="uniswap-card p-12 text-center max-w-lg mx-auto flex flex-col items-center gap-4 my-12">
        <AlertCircle className="w-12 h-12 text-slate-500" />
        <h2 className="text-lg font-bold text-white">Wallet Not Connected</h2>
        <p className="text-xs text-slate-400">
          Please connect your Web3 wallet to view or manage your freelancer profile.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="uniswap-card p-12 text-center max-w-lg mx-auto flex flex-col items-center gap-4 my-12">
        <AlertCircle className="w-12 h-12 text-slate-500" />
        <h2 className="text-lg font-bold text-white">Profile Not Found</h2>
        <p className="text-xs text-slate-400">
          No profile was found for wallet address <span className="font-mono text-[#38BDF8]">{targetWalletAddress}</span>.
        </p>
        <button onClick={() => navigate('/marketplace')} className="btn-uniswap-primary px-5 py-2.5 text-xs">
          Browse Marketplace
        </button>
      </div>
    );
  }

  const isGold = profile.tier === 'Gold TEE Certified';
  const isSilver = profile.tier === 'Silver';
  const initials = getInitials(profile.name);

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-16 animate-fade-in">
      
      {/* Profile Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] border border-white/[0.1] p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-80 h-80 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            {/* Avatar Initials */}
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-3xl text-white shadow-2xl shrink-0 ${
              isGold ? 'bg-gradient-to-br from-amber-500/30 to-purple-600/40 border-2 border-amber-500/50' : 'bg-white/[0.08] border border-white/[0.15]'
            }`}>
              {initials}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-white">{profile.name}</h1>
                <span className={`px-3 py-0.5 rounded-full border text-xs font-bold flex items-center gap-1 ${
                  isGold ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : isSilver ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <Award className="w-3.5 h-3.5" />
                  {profile.tier}
                </span>
                
                {profile.isAvailable ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Available for Hire
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                    Busy / Fully Booked
                  </span>
                )}
              </div>

              <p className="text-sm font-medium text-slate-300">{profile.title}</p>
              
              {/* Wallet Address & Category */}
              <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                <span className="text-[#38BDF8] flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> {profile.walletAddress}
                </span>
                <span className="text-slate-400 bg-white/[0.05] px-2.5 py-0.5 rounded-lg border border-white/[0.06]">
                  {normalizeCategory(profile.category)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {isOwner ? (
              <button
                onClick={openEdit}
                className="w-full sm:w-auto btn-uniswap-primary px-5 py-3 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => onHireFreelancer(profile.walletAddress)}
                className="w-full sm:w-auto btn-uniswap-primary px-6 py-3 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Hire {profile.name.split(' ')[0]}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.15] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              title="Share Public Profile Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied Link' : 'Share Profile'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Overview & On-Chain Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Bio & Skills */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Bio Box */}
          <div className="uniswap-card p-6 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-[#38BDF8]" /> About & Professional Overview
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/[0.05]">
              {profile.bio}
            </p>
          </div>

          {/* Verified Skills */}
          <div className="uniswap-card p-6 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Code className="w-4 h-4 text-[#38BDF8]" /> Verified Deliverable Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-xs text-[#38BDF8] font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* External Social & Code Portfolios */}
          <div className="uniswap-card p-6 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#38BDF8]" /> External Code & Social Links
            </h3>
            <div className="flex flex-wrap gap-3">
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" /> GitHub Repository
                </a>
              )}
              {profile.twitterUrl && (
                <a href={profile.twitterUrl} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#38BDF8]" /> Social Profile
                </a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-purple-400" /> Personal Portfolio
                </a>
              )}
              {!profile.githubUrl && !profile.twitterUrl && !profile.portfolioUrl && (
                <span className="text-xs text-slate-500 italic">No external links provided.</span>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: On-Chain Escrow Track Record */}
        <div className="flex flex-col gap-6">
          
          <div className="uniswap-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> ZK Track Record & Fees
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">ZK Reputation Score</span>
                <span className="text-base font-black text-white font-mono">{profile.reputationScore} / 1000</span>
              </div>

              <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Completed Escrows</span>
                <span className="text-base font-black text-emerald-400 font-mono">{profile.completedEscrows}</span>
              </div>

              <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">On-Time Delivery</span>
                <span className="text-base font-black text-white font-mono">{profile.onTimeRate}%</span>
              </div>

              <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Protocol Fee Discount Tier</span>
                <span className="text-base font-black text-[#38BDF8] font-mono">
                  {(profile.feeDiscountBps / 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Hourly Rate</span>
                <span className="text-base font-black text-emerald-400 font-mono">{profile.hourlyRate}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] text-xs text-slate-400 space-y-2">
            <span className="font-bold text-white block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#38BDF8]" /> Hardware Attested Trust
            </span>
            <p className="leading-relaxed text-[11px]">
              All escrows and dispute resolutions for this profile are stored on-chain with milestone data verified inside Intel SGX hardware enclaves.
            </p>
          </div>

        </div>

      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleSaveProfile} className="uniswap-card p-6 md:p-8 w-full max-w-xl flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto">
            
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#38BDF8]" />
                Edit Profile Dashboard
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Updates will be saved directly to the Supabase Production Database.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name (First and Last Name)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Vance"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Professional Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Architect & Designer"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Domain / Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8] cursor-pointer"
                  >
                    <option value="Software & Web">Software & Web</option>
                    <option value="Design & UI/UX">Design & UI/UX</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Writing & Marketing">Writing & Marketing</option>
                    <option value="Smart Contracts & Security">Smart Contracts & Security</option>
                    <option value="DevOps & Cloud">DevOps & Cloud</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hourly Rate</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100 cUSDC/hr"
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bio & Professional Summary</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your digital expertise, experience, and deliverables..."
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Skill Tags (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="TypeScript, React, Figma, Python, Node.js, Solidity"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub / Code URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={editGithubUrl}
                    onChange={(e) => setEditGithubUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Twitter / Social URL</label>
                  <input
                    type="url"
                    placeholder="https://twitter.com/..."
                    value={editTwitterUrl}
                    onChange={(e) => setEditTwitterUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Portfolio Website</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editPortfolioUrl}
                    onChange={(e) => setEditPortfolioUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="availCheckProfile"
                  checked={editIsAvailable}
                  onChange={(e) => setEditIsAvailable(e.target.checked)}
                  className="rounded border-white/[0.2] bg-[#0B0E17] text-[#38BDF8] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="availCheckProfile" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Available for Hire
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-uniswap-primary px-6 py-2.5 text-xs cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isSaving ? 'Saving to Supabase...' : 'Save Profile'}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
