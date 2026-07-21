import { useState } from 'react';
import { 
  Database, 
  Activity, 
  Coins, 
  ShieldCheck, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Share2,
  Copy,
  Check,
  X,
  FileCheck,
  Search
} from 'lucide-react';
import { type EscrowContract } from '../services/escrowService';

interface PortfolioFeedProps {
  activeEscrows: EscrowContract[];
  isFetchingContracts: boolean;
  setSelectedContract: (escrow: EscrowContract) => void;
}

export function PortfolioFeed({
  activeEscrows,
  isFetchingContracts,
  setSelectedContract
}: PortfolioFeedProps) {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState("");
  const [shareEscrow, setShareEscrow] = useState<EscrowContract | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const tvl = activeEscrows
    .filter(e => e.status === 'ACTIVE' || e.status === 'DISPUTED')
    .reduce((sum, e) => sum + e.budget, 0);

  const activeCount = activeEscrows.filter(e => e.status === 'ACTIVE').length;
  const disputedCount = activeEscrows.filter(e => e.status === 'DISPUTED').length;
  const completedCount = activeEscrows.filter(e => e.status === 'COMPLETED').length;

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
      
      {/* DeFi Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="uniswap-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Value Locked (TVL)</span>
            <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center">
              <Coins className="w-4 h-4 text-[#38BDF8]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {tvl.toLocaleString()} <span className="text-[#38BDF8] text-lg">cUSDC</span>
            </span>
            <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Shielded in smart contracts
            </p>
          </div>
        </div>

        <div className="uniswap-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Arbitration Enclave</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-white tracking-tight">
              iExec TEE Isolated
            </span>
            <p className="text-[11px] text-purple-300 font-medium mt-1">
              Intel SGX Zero-Knowledge Proofs
            </p>
          </div>
        </div>

        <div className="uniswap-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Agreements Overview</span>
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
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Escrow Vaults
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage active agreements, review deliverables, and authorize milestone releases.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vault, address or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="uniswap-input-box pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none w-full"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-[#131826]/80 p-1 rounded-2xl border border-white/[0.08]">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'DISPUTED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === tab
                    ? 'bg-[#38BDF8] text-[#0B0E17] font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contract Cards Grid */}
      {isFetchingContracts ? (
        <div className="uniswap-card p-12 text-center flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-[#38BDF8] animate-spin" />
          <span className="text-sm font-semibold text-slate-300">Fetching Escrow Contracts On-Chain...</span>
        </div>
      ) : filteredEscrows.length === 0 ? (
        <div className="uniswap-card p-12 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/[0.08]">
            <Database className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Escrow Vaults Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              No agreements matching the selected filter. Click "Deploy Escrow" to launch a new encrypted contract.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEscrows.map((escrow) => {
            const pct = escrow.totalMilestones > 0 
              ? (escrow.milestonesCompleted / escrow.totalMilestones) * 100 
              : 0;

            const isSubmitted = escrow.activeMilestoneSubmitted;
            const isSigning = escrow.status === 'SIGNING';

            return (
              <div 
                key={escrow.address}
                onClick={() => setSelectedContract(escrow)}
                className="uniswap-card p-6 flex flex-col gap-5 cursor-pointer relative overflow-hidden group hover:-translate-y-1 transition-all"
              >
                
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                      {escrow.address.slice(0, 8)}...{escrow.address.slice(-6)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Role: {escrow.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareEscrow(escrow);
                      }}
                      title="Share Escrow Agreement Link"
                      className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-[#38BDF8] transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      isSigning ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                      isSubmitted ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 animate-pulse' :
                      escrow.status === 'ACTIVE' ? 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30' :
                      escrow.status === 'DISPUTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' :
                      escrow.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isSigning ? 'bg-amber-400' :
                        isSubmitted ? 'bg-purple-400' :
                        escrow.status === 'ACTIVE' ? 'bg-[#38BDF8]' :
                        escrow.status === 'DISPUTED' ? 'bg-rose-400' :
                        escrow.status === 'COMPLETED' ? 'bg-emerald-400' :
                        'bg-slate-400'
                      }`}></span>
                      {isSigning ? 'Awaiting Funding' :
                       isSubmitted ? 'Deliverable Submitted' :
                       escrow.status === 'ACTIVE' ? 'In Progress' :
                       escrow.status === 'DISPUTED' ? 'TEE Dispute Active' :
                       escrow.status}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-[#131826]/60 p-4 rounded-2xl border border-white/[0.06]">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Counterparty</span>
                    <span className="font-mono text-white font-medium truncate">
                      {escrow.counterparty.slice(0, 6)}...{escrow.counterparty.slice(-4)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Total Budget</span>
                    <span className="font-bold text-[#38BDF8]">
                      {escrow.budget.toLocaleString()} cUSDC
                    </span>
                  </div>
                </div>

                {/* Progress Bar & CTA */}
                <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>Milestone Progress</span>
                    <span className="text-white font-semibold">{escrow.milestonesCompleted} of {escrow.totalMilestones} Completed</span>
                  </div>
                  
                  <div className="w-full h-2 bg-[#131826] rounded-full overflow-hidden border border-white/[0.08]">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold text-[#38BDF8]">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    {isSubmitted ? <FileCheck className="w-3.5 h-3.5 text-purple-400" /> : null}
                    {isSubmitted ? "Review Window Active" : "Click to view details"}
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    View Workspace <ChevronRight className="w-4 h-4" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Share Agreement Modal */}
      {shareEscrow && (
        <div className="fixed inset-0 z-50 bg-[#0B0E17]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="uniswap-card p-6 w-full max-w-md flex flex-col gap-5 relative animate-scale-in">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#38BDF8]" /> Share Escrow Agreement
              </h3>
              <button
                onClick={() => setShareEscrow(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Send this direct dApp contract link to your client or contractor for instant access and 1-click review.
            </p>

            <div className="flex items-center justify-between bg-[#131826] border border-white/[0.08] p-3 rounded-2xl text-xs font-mono text-slate-300">
              <span className="truncate pr-2">{window.location.origin}/escrow/{shareEscrow.address}</span>
              <button
                onClick={() => handleCopyLink(shareEscrow.address)}
                className="btn-uniswap-primary px-3 py-1.5 text-xs shrink-0 flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
