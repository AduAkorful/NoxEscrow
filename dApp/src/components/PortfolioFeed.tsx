import { Terminal, Activity, User, Coins, ShieldCheck, Server } from 'lucide-react';
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
  const tvl = activeEscrows
    .filter(e => e.status === 'ACTIVE' || e.status === 'DISPUTED')
    .reduce((sum, e) => sum + e.budget, 0);

  const activeCount = activeEscrows.filter(e => e.status === 'ACTIVE').length;
  const disputedCount = activeEscrows.filter(e => e.status === 'DISPUTED').length;
  const completedCount = activeEscrows.filter(e => e.status === 'COMPLETED').length;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* DeFi Statistics Overview Dashboard Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TVL */}
        <div className="bento-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Total Value Locked (TVL)</span>
              <span className="font-mono text-lg font-bold text-[#00F2FE] teal-glow-text">
                {tvl.toLocaleString()} cUSDC
              </span>
            </div>
            <Coins className="w-4 h-4 text-[#00F2FE] opacity-60" />
          </div>
          <span className="text-[8px] font-mono text-emerald-400 mt-2">✓ SECURED IN DEPOSITS</span>
        </div>

        {/* Attestation integrity status */}
        <div className="bento-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Arbitration SLA Success</span>
              <span className="font-mono text-lg font-bold text-slate-200">
                100% hardware isolated
              </span>
            </div>
            <ShieldCheck className="w-4 h-4 text-slate-400 opacity-60" />
          </div>
          <span className="text-[8px] font-mono text-slate-500 mt-2">INTEL SGX CONFIDENTIAL ENCLAVES</span>
        </div>

        {/* Breakdown of agreements */}
        <div className="bento-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Nodes Overview</span>
              <div className="flex gap-3 text-xs font-mono mt-1">
                <span className="text-[#00F2FE]">{activeCount}a</span>
                <span className="text-rose-500">{disputedCount}d</span>
                <span className="text-emerald-400">{completedCount}c</span>
              </div>
            </div>
            <Server className="w-4 h-4 text-[#7F00FF] opacity-60" />
          </div>
          <span className="text-[8px] font-mono text-[#7F00FF] mt-2">ACTIVE / DISPUTED / SETTLED</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00F2FE]/5 border border-[#00F2FE]/20 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-[#00F2FE]" />
          </div>
          <h2 className="font-mono text-sm tracking-widest text-slate-200 font-bold uppercase">
            CONTRACT_ESCROW_AGREEMENTS
          </h2>
        </div>
        <span className="font-mono text-[9px] text-slate-500 tracking-wider flex items-center gap-2">
          {isFetchingContracts ? (
            <>
              <Activity className="w-3.5 h-3.5 animate-spin text-[#00F2FE]" />
              <span>FETCHING ON-CHAIN DATA...</span>
            </>
          ) : (
            <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-md font-semibold">{activeEscrows.length} NODES INDEXED</span>
          )}
        </span>
      </div>

      {activeEscrows.length === 0 ? (
        <div className="p-12 border border-dashed border-white/5 rounded-2xl text-center font-mono text-slate-500 text-xs bg-white/[0.01]">
          No active agreements deployed for this mode. Use "Deploy Escrow" to compile and fund one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeEscrows.map((escrow) => {
            const pct = escrow.totalMilestones > 0 
              ? (escrow.milestonesCompleted / escrow.totalMilestones) * 100 
              : 0;

            return (
              <div 
                key={escrow.address}
                onClick={() => setSelectedContract(escrow)}
                className={`bento-card p-6 flex flex-col gap-5 cursor-pointer relative overflow-hidden group ${
                  escrow.role === 'CLIENT' ? 'hover:border-[#00F2FE]/35' : 'bento-card-violet hover:border-[#7F00FF]/35'
                }`}
              >
                {/* Subtle corner highlight */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl opacity-10 pointer-events-none ${
                  escrow.role === 'CLIENT' ? 'from-[#00F2FE] to-transparent' : 'from-[#7F00FF] to-transparent'
                }`} />

                {/* Header: address and status */}
                <div className="flex justify-between items-start z-10">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-slate-400 font-bold group-hover:text-white transition-smooth">
                      {escrow.address.slice(0, 8)}...{escrow.address.slice(-6)}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono tracking-wider">ADDRESS_NODE</span>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 font-mono text-[9px] border rounded-md uppercase font-bold ${
                    escrow.status === 'ACTIVE' ? 'bg-[#00F2FE]/5 text-[#00F2FE] border-[#00F2FE]/20' :
                    escrow.status === 'DISPUTED' ? 'bg-[#FF1744]/5 text-[#FF1744] border-[#FF1744]/20 animate-pulse' :
                    escrow.status === 'COMPLETED' ? 'bg-[#00E676]/5 text-[#00E676] border-[#00E676]/20' :
                    'bg-slate-500/5 text-slate-400 border-slate-500/20'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${
                      escrow.status === 'ACTIVE' ? 'bg-[#00F2FE]' :
                      escrow.status === 'DISPUTED' ? 'bg-[#FF1744]' :
                      escrow.status === 'COMPLETED' ? 'bg-[#00E676]' :
                      'bg-slate-400'
                    }`}></span>
                    {escrow.status}
                  </span>
                </div>

                {/* Body details */}
                <div className="flex flex-col gap-3.5 z-10">
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-3.5 h-3.5 opacity-60" />
                      <span>Counterparty:</span>
                    </div>
                    <span className="font-mono font-medium text-slate-200">
                      {escrow.counterparty.slice(0, 6)}...{escrow.counterparty.slice(-4)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Coins className="w-3.5 h-3.5 opacity-60" />
                      <span>Total Budget:</span>
                    </div>
                    <span className={`font-mono font-extrabold ${
                      escrow.role === 'CLIENT' ? 'text-[#00F2FE] teal-glow-text' : 'text-[#7F00FF] violet-glow-text'
                    }`}>
                      {escrow.budget.toLocaleString()} cUSDC
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Your Assigned Role:</span>
                    <span className={`font-mono text-[9px] font-extrabold px-2 py-0.5 border rounded-md uppercase tracking-wider ${
                      escrow.role === 'CLIENT' 
                        ? 'text-[#00F2FE] bg-[#00F2FE]/5 border-[#00F2FE]/20' 
                        : 'text-[#7F00FF] bg-[#7F00FF]/5 border-[#7F00FF]/20'
                    }`}>
                      {escrow.role}
                    </span>
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                <div className="flex flex-col gap-2 z-10 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center font-mono text-[9px] text-slate-400 font-bold">
                    <span>MILESTONES_PROGRESS</span>
                    <span className="text-white">{escrow.milestonesCompleted} / {escrow.totalMilestones}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#05070F] rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        escrow.role === 'CLIENT' 
                          ? 'bg-[#00F2FE] shadow-[0_0_8px_#00F2FE]' 
                          : 'bg-[#7F00FF] shadow-[0_0_8px_#7F00FF]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
