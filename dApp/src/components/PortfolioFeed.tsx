import { useState } from 'react';
import { 
  Database, 
  Coins, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Share2,
  Copy,
  Check,
  X,
  FileCheck,
  Search,
  UserCheck,
  Briefcase,
  TrendingUp,
  Percent
} from 'lucide-react';
import { type EscrowContract } from '../services/escrowService';

interface PortfolioFeedProps {
  activeEscrows: EscrowContract[];
  isFetchingContracts: boolean;
  viewMode: 'client' | 'freelancer';
  setSelectedContract: (escrow: EscrowContract) => void;
}

export function PortfolioFeed({
  activeEscrows,
  isFetchingContracts,
  viewMode,
  setSelectedContract
}: PortfolioFeedProps) {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState("");
  const [shareEscrow, setShareEscrow] = useState<EscrowContract | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // --- Metrics Computation ---
  const activeCount = activeEscrows.filter(e => e.status === 'ACTIVE').length;
  const disputedCount = activeEscrows.filter(e => e.status === 'DISPUTED').length;
  const completedCount = activeEscrows.filter(e => e.status === 'COMPLETED').length;

  // Client Metrics
  const clientCapitalLocked = activeEscrows
    .filter(e => e.status === 'ACTIVE' || e.status === 'DISPUTED')
    .reduce((sum, e) => sum + e.budget * 1.01, 0); // Budget + 1.0% Client Fee

  const uniqueCounterparties = new Set(activeEscrows.map(e => e.counterparty.toLowerCase())).size;

  // Freelancer Metrics
  const totalNetEarnings = activeEscrows
    .filter(e => e.status === 'COMPLETED')
    .reduce((sum, e) => sum + (e.budget * 0.995), 0); // Budget minus 0.5% protocol fee

  const pendingReviewCount = activeEscrows.filter(e => e.activeMilestoneSubmitted).length;

  const filteredEscrows = activeEscrows.filter(e => {
    const matchesStatus = filterStatus === 'ALL' || e.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      e.address.toLowerCase().includes(q) || 
      e.counterparty.toLowerCase().includes(q) ||
      e.requirements.some(r => r.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const handleCopyLink = (escrowAddress: string) => {
    const url = `${window.location.origin}/escrow/${escrowAddress}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      
      {/* Dynamic Role-Based Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Primary Financial Metric */}
        {viewMode === 'client' ? (
          <div className="uniswap-card p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#131826] to-[#131826]/80 border-b-2 border-b-[#38BDF8]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Client Capital Deposited</span>
              <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center">
                <Coins className="w-4 h-4 text-[#38BDF8]" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white tracking-tight">
                {clientCapitalLocked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[#38BDF8] text-lg">cUSDC</span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                <Percent className="w-3 h-3 text-[#38BDF8]" /> Includes 1.0% Client Processing Fee
              </p>
            </div>
          </div>
        ) : (
          <div className="uniswap-card p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#131826] to-[#131826]/80 border-b-2 border-b-emerald-400">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Net Earnings</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white tracking-tight">
                {totalNetEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-emerald-400 text-lg">cUSDC</span>
              </span>
              <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Net payout (after 0.3%-0.5% fee)
              </p>
            </div>
          </div>
        )}

        {/* Card 2: Counterparties / Active Work */}
        {viewMode === 'client' ? (
          <div className="uniswap-card p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Hired Freelancers</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-[#C084FC]" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white tracking-tight">
                {uniqueCounterparties} <span className="text-[#C084FC] text-sm">Verified Talent</span>
              </span>
              <p className="text-[11px] text-purple-300 font-medium mt-1">
                Hardware Attested Escrow Protection
              </p>
            </div>
          </div>
        ) : (
          <div className="uniswap-card p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Deliverables Status</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-white tracking-tight">
                {pendingReviewCount} <span className="text-amber-400 text-sm">Awaiting Client Review</span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Milestones submitted for client sign-off
              </p>
            </div>
          </div>
        )}

        {/* Card 3: Agreements Overview */}
        <div className="uniswap-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Escrow Vaults Status</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm font-semibold">
            <span className="text-[#38BDF8] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {activeCount} Active
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {disputedCount} Dispute
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {completedCount} Done
            </span>
          </div>
        </div>

      </div>

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-[#38BDF8]" />
            <span>{viewMode === 'client' ? 'Client Escrow Portfolio' : 'Freelancer Work Contracts'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewMode === 'client' ? 'Manage funded escrows, review deliverables & release milestone payouts' : 'Submit deliverables, track reviews & receive net cUSDC payouts'}
          </p>
        </div>

        {/* Filter Pills & Search Box */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contracts or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#131826] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none w-48 sm:w-56"
            />
          </div>

          <div className="flex items-center bg-[#131826] p-1 rounded-xl border border-white/[0.08]">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'DISPUTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === status
                    ? 'bg-[#38BDF8] text-[#0B0E17] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contracts List */}
      {isFetchingContracts ? (
        <div className="uniswap-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Querying Sepolia on-chain smart contracts...</span>
        </div>
      ) : filteredEscrows.length === 0 ? (
        <div className="uniswap-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <FileCheck className="w-10 h-10 text-slate-500" />
          <h3 className="text-sm font-bold text-white">No Escrow Contracts Found</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchQuery ? `No escrows matching "${searchQuery}"` : viewMode === 'client' ? 'You have not deployed any client escrows yet.' : 'No active work contracts assigned to your address.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEscrows.map((escrow) => {
            const isClient = viewMode === 'client';
            const clientTotalDeposit = escrow.budget * 1.01;
            const freelancerNetEarnings = escrow.budget * 0.995;

            return (
              <div
                key={escrow.address}
                onClick={() => setSelectedContract(escrow)}
                className="uniswap-card p-5 flex flex-col justify-between gap-4 hover:border-[#38BDF8]/40 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs font-bold text-white group-hover:text-[#38BDF8] transition-colors flex items-center gap-1.5">
                      {escrow.address.slice(0, 10)}...{escrow.address.slice(-6)}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[220px]">
                      {isClient ? `Freelancer: ${escrow.counterparty.slice(0, 6)}...${escrow.counterparty.slice(-4)}` : `Client: ${escrow.counterparty.slice(0, 6)}...${escrow.counterparty.slice(-4)}`}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono uppercase tracking-wider ${
                    escrow.status === 'ACTIVE' ? 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20' :
                    escrow.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    escrow.status === 'DISPUTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {escrow.status}
                  </span>
                </div>

                {/* Requirements / Scope snippet */}
                {escrow.requirements.length > 0 && (
                  <p className="text-xs text-slate-300 line-clamp-2 bg-[#0B0E17]/60 p-2.5 rounded-xl border border-white/[0.04]">
                    {escrow.requirements[0]}
                  </p>
                )}

                {/* Footer: Budget & Action link */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">
                      {isClient ? 'Total Deposited (Budget + Fee)' : 'Net cUSDC Earnings'}
                    </span>
                    <span className="text-sm font-bold font-mono text-white">
                      {isClient ? `${clientTotalDeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cUSDC` : `${freelancerNetEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cUSDC`}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareEscrow(escrow);
                    }}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
                    title="Share Escrow Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Escrow Link Modal */}
      {shareEscrow && (
        <div className="fixed inset-0 z-50 bg-[#0B0E17]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="uniswap-card p-6 max-w-md w-full flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#38BDF8]" /> Share Escrow Agreement
              </h3>
              <button onClick={() => setShareEscrow(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Share this direct escrow link with your counterparty to view deliverables, chat end-to-end encrypted, and settle milestone payouts.
            </p>

            <div className="uniswap-input-box p-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#38BDF8] truncate">
                {`${window.location.origin}/escrow/${shareEscrow.address}`}
              </span>
              <button
                onClick={() => handleCopyLink(shareEscrow.address)}
                className="px-3 py-1.5 rounded-xl bg-[#38BDF8] text-[#0B0E17] text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-[#38BDF8]/90 transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
