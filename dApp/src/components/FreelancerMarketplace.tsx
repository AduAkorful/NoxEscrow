import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Award, 
  Edit3, 
  X, 
  Plus, 
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getFreelancerProfilesFromSupabase, 
  saveFreelancerProfileToSupabase, 
  normalizeCategory 
} from '../services/freelancerService';

export interface FreelancerProfile {
  id: string;
  walletAddress: string;
  name: string;
  title: string;
  bio: string;
  category: 
    | 'Software & Web' 
    | 'Design & UI/UX' 
    | 'AI & Data Science' 
    | 'Writing & Marketing' 
    | 'Smart Contracts & Security' 
    | 'DevOps & Cloud';
  hourlyRate: string;
  reputationScore: number;
  tier: 'Bronze' | 'Silver' | 'Gold TEE Certified';
  feeDiscountBps: number;
  completedEscrows: number;
  disputesLost: number;
  onTimeRate: number;
  skills: string[];
  githubUrl?: string;
  twitterUrl?: string;
  portfolioUrl?: string;
  isAvailable: boolean;
  isWalletVerified?: boolean;
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return 'FL';
  const cleanName = name.trim().replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '');
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return cleanName.slice(0, 2).toUpperCase();
}

interface FreelancerMarketplaceProps {
  walletAddress: string | null;
  onHireFreelancer: (freelancerAddress: string) => void;
}

export function FreelancerMarketplace({ walletAddress, onHireFreelancer }: FreelancerMarketplaceProps) {
  const navigate = useNavigate();

  // State Management
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'reputation' | 'escrows' | 'rate'>('reputation');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Category Slider Scroll Ref & Helper
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Load profiles from Supabase DB on mount
  useEffect(() => {
    async function loadData() {
      const data = await getFreelancerProfilesFromSupabase();
      setFreelancers(data);
    }
    loadData();
  }, []);

  // Connected wallet profile lookup
  const myProfile = freelancers.find(f => f.walletAddress.toLowerCase() === (walletAddress || '').toLowerCase());
  
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

  // Save Profile Updates to Supabase Production Database
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;
    setIsSaving(true);

    const skillsArray = editSkills.split(',').map(s => s.trim()).filter(Boolean);
    const targetAddress = walletAddress;

    const existingProfile = freelancers.find(f => f.walletAddress.toLowerCase() === walletAddress.toLowerCase());

    const updatedProfile: FreelancerProfile = {
      id: existingProfile ? existingProfile.id : `f_${Date.now()}`,
      walletAddress: targetAddress,
      name: editName || 'Anonymous Freelancer',
      title: editTitle,
      bio: editBio,
      category: editCategory,
      hourlyRate: editHourlyRate,
      reputationScore: existingProfile ? existingProfile.reputationScore : 600,
      tier: existingProfile ? existingProfile.tier : 'Bronze',
      feeDiscountBps: existingProfile ? existingProfile.feeDiscountBps : 50,
      completedEscrows: existingProfile ? existingProfile.completedEscrows : 0,
      disputesLost: existingProfile ? existingProfile.disputesLost : 0,
      onTimeRate: existingProfile ? existingProfile.onTimeRate : 100,
      skills: skillsArray.length ? skillsArray : ['Engineering'],
      githubUrl: editGithubUrl,
      twitterUrl: editTwitterUrl,
      portfolioUrl: editPortfolioUrl,
      isAvailable: editIsAvailable,
      isWalletVerified: true
    };

    // Save directly to Supabase Production Database
    await saveFreelancerProfileToSupabase(updatedProfile);

    // Update local React state
    setFreelancers(prev => {
      const idx = prev.findIndex(f => f.walletAddress.toLowerCase() === walletAddress.toLowerCase());
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedProfile;
        return copy;
      }
      return [updatedProfile, ...prev];
    });

    setIsSaving(false);
    setIsEditModalOpen(false);
  };

  // Categories list covering all freelance domains
  const categories = [
    'All', 
    'Software & Web', 
    'Design & UI/UX', 
    'AI & Data Science', 
    'Writing & Marketing', 
    'Smart Contracts & Security', 
    'DevOps & Cloud'
  ];

  // Filtering with normalized category matching
  const filteredFreelancers = freelancers.filter(f => {
    const fCategory = normalizeCategory(f.category);
    const matchesCategory = selectedCategory === 'All' || fCategory === selectedCategory;
    const search = searchQuery.toLowerCase();
    const matchesSearch = 
      f.name.toLowerCase().includes(search) ||
      f.title.toLowerCase().includes(search) ||
      f.walletAddress.toLowerCase().includes(search) ||
      f.skills.some(s => s.toLowerCase().includes(search));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'reputation') return b.reputationScore - a.reputationScore;
    if (sortBy === 'escrows') return b.completedEscrows - a.completedEscrows;
    if (sortBy === 'rate') return parseInt(b.hourlyRate) - parseInt(a.hourlyRate);
    return 0;
  });

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] border border-white/[0.1] p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 translate-y-12 w-80 h-80 bg-[#C084FC]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-xs font-semibold text-[#38BDF8]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Global Freelance & Talent Network</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Hire Top Freelancers with <span className="shiny-text">ZK Encrypted</span> Protection
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connect with expert developers, designers, security auditors, AI researchers, and digital specialists. Lock budget in confidential escrow with hardware-backed TEE AI arbitration.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {walletAddress && (
              <button
                onClick={() => navigate('/profile')}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.15] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <UserCheck className="w-4 h-4 text-[#38BDF8]" />
                My Profile Dashboard
              </button>
            )}
            <button
              onClick={() => navigate('/deploy')}
              className="w-full sm:w-auto btn-uniswap-primary px-6 py-3 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Post Custom Escrow
            </button>
          </div>
        </div>
      </div>

      {/* Filter, Search & Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#131826]/80 p-4 rounded-2xl border border-white/[0.08] backdrop-blur-xl">
        
        {/* Category Pills Slider */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-full lg:max-w-xl">
          <button
            onClick={() => scrollCategories('left')}
            className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.03] hover:bg-[#38BDF8]/20 border border-white/[0.08] hover:border-[#38BDF8]/40 text-slate-400 hover:text-[#38BDF8] shrink-0 cursor-pointer transition-all"
            title="Slide Left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div 
            ref={categoryScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto scroll-smooth scrollbar-none py-0.5 touch-pan-x snap-x snap-mandatory"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 snap-start px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#38BDF8] text-[#0B0E17] font-bold shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.04]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => scrollCategories('right')}
            className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.03] hover:bg-[#38BDF8]/20 border border-white/[0.08] hover:border-[#38BDF8]/40 text-slate-400 hover:text-[#38BDF8] shrink-0 cursor-pointer transition-all"
            title="Slide Right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search & Sort Input Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search skills, names, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-[#38BDF8] cursor-pointer"
            >
              <option value="reputation">Sort: Highest ZK Reputation</option>
              <option value="escrows">Sort: Most Completed Escrows</option>
              <option value="rate">Sort: Highest Rate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Freelancers Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFreelancers.map((freelancer) => {
          const isGold = freelancer.tier === 'Gold TEE Certified';
          const isSilver = freelancer.tier === 'Silver';
          const isMe = walletAddress && freelancer.walletAddress.toLowerCase() === walletAddress.toLowerCase();
          const initials = getInitials(freelancer.name);

          return (
            <div
              key={freelancer.id}
              className={`uniswap-card p-6 flex flex-col justify-between gap-6 relative group hover:border-[#38BDF8]/40 transition-all duration-300 ${
                isGold ? 'border-amber-500/30 bg-gradient-to-b from-[#131826] to-[#1E1B4B]/30' : ''
              }`}
            >
              {/* Card Top Row: Avatar & Reputation Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* First and Last Name Initials Avatar */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-inner ${
                    isGold ? 'bg-gradient-to-br from-amber-500/20 to-purple-600/30 border border-amber-500/40' : 'bg-white/[0.08] border border-white/[0.1]'
                  }`}>
                    {initials}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5 cursor-pointer hover:text-[#38BDF8]" onClick={() => navigate(`/profile?address=${freelancer.walletAddress}`)}>
                      {freelancer.name}
                      {freelancer.isWalletVerified && (
                        <span title="Verified EVM Wallet Owner">
                          <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
                        </span>
                      )}
                      {isMe && <span className="px-1.5 py-0.5 rounded bg-[#38BDF8]/20 text-[#38BDF8] text-[10px] font-mono">YOU</span>}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{freelancer.title}</p>
                  </div>
                </div>

                {/* ZK Reputation Gauge & Tier Badge */}
                <div className="flex flex-col items-end">
                  <div className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${
                    isGold
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : isSilver
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}>
                    <Award className="w-3.5 h-3.5" />
                    <span>{freelancer.tier}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    Score: <strong className="text-white">{freelancer.reputationScore}</strong>
                  </span>
                </div>
              </div>

              {/* Bio snippet */}
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {freelancer.bio}
              </p>

              {/* Stats Summary Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-black/40 rounded-xl border border-white/[0.05] text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Completed</span>
                  <span className="text-xs font-bold text-white font-mono">{freelancer.completedEscrows} Escrows</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Disputes Lost</span>
                  <span className={`text-xs font-bold font-mono ${freelancer.disputesLost === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {freelancer.disputesLost}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">On-Time Delivery</span>
                  <span className="text-xs font-bold text-[#38BDF8] font-mono">
                    {freelancer.onTimeRate}%
                  </span>
                </div>
              </div>

              {/* Skill Tags */}
              <div className="flex flex-wrap gap-1.5">
                {freelancer.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Card Footer Action */}
              <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 mt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Rate</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{freelancer.hourlyRate}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/profile?address=${freelancer.walletAddress}`)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    View Profile
                  </button>

                  <button
                    onClick={() => onHireFreelancer(freelancer.walletAddress)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#818CF8] hover:from-[#38BDF8]/90 hover:to-[#818CF8]/90 text-[#0B0E17] text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    <span>Hire & Lock Escrow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {freelancers.length === 0 ? (
        <div className="uniswap-card p-12 text-center flex flex-col items-center justify-center gap-4 bg-[#131826]/80 border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-[#38BDF8]" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-white">No Registered Freelancer Profiles Yet</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Be the first verified developer or digital specialist listed in the NoxEscrow Talent Network! Connect your wallet and create your public profile.
            </p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="px-5 py-2.5 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] hover:opacity-90 text-[#0B0E17] text-xs font-bold rounded-xl shadow-lg cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create My Profile Dashboard</span>
          </button>
        </div>
      ) : filteredFreelancers.length === 0 ? (
        <div className="uniswap-card p-12 text-center flex flex-col items-center justify-center gap-4">
          <AlertCircle className="w-10 h-10 text-slate-500" />
          <h3 className="text-base font-bold text-white">No Freelancers Match Your Filter</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Try adjusting your search query or category filter to discover registered talent.
          </p>
          <button
            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
            className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-white rounded-xl cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : null}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleSaveProfile} className="uniswap-card p-6 md:p-8 w-full max-w-xl flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto">
            
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#38BDF8]" />
                {myProfile ? 'Customize Public Freelancer Profile' : 'Create Freelancer Profile'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your profile will be synced to Supabase Production Database and discoverable by clients.
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

              <div className="p-3.5 bg-black/40 border border-[#38BDF8]/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                    Auto-Bound EVM Payout Wallet
                  </span>
                  <span className="text-xs font-mono font-bold text-[#38BDF8]">
                    {walletAddress || 'Not Connected'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected Wallet
                </span>
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
                  id="availCheck"
                  checked={editIsAvailable}
                  onChange={(e) => setEditIsAvailable(e.target.checked)}
                  className="rounded border-white/[0.2] bg-[#0B0E17] text-[#38BDF8] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="availCheck" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Available for Hire
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-uniswap-primary px-6 py-2.5 text-xs cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isSaving ? 'Syncing to Supabase...' : 'Save Profile'}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
