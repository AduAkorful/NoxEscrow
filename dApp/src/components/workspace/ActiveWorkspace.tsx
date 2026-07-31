import React from 'react';
import { Lock, Paperclip, AlertTriangle, Activity, ShieldCheck, Terminal, Unlock, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { type EscrowContract } from '../../services/escrowService';

interface ActiveWorkspaceProps {
  selectedContract: EscrowContract;
  selectedMilestoneIndex: number;
  viewMode: 'client' | 'freelancer';
  walletAddress: string | null;
  timeLeft: { days: number; hours: number; minutes: number; seconds: number; isExpired: boolean } | null;
  reqText: string;
  reqAttachedFiles: { name: string; type: string; cid: string }[];
  handleDownloadFile: (cid: string, keyHex: string, name: string, type: string) => Promise<void>;
  downloadingFileCid: string | null;
  disputeStatement: string;
  setDisputeStatement: (val: string) => void;
  setShowDisputeConfirm: (val: boolean) => void;
  isLoading: boolean;
  deliverableInput: string;
  setDeliverableInput: (val: string) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  deliverableFiles: File[];
  setDeliverableFiles: React.Dispatch<React.SetStateAction<File[]>>;
  handleSubmitDeliverable: (contractAddress?: string) => Promise<void>;
  handleReleaseMilestone: (contractAddress?: string) => Promise<void>;
  deliverableText: string;
  deliverableAttachedFiles: { name: string; type: string; cid: string }[];
  ratingInput: number;
  setRatingInput: (val: number) => void;
  setShowReleaseConfirm: (val: boolean) => void;
  milestoneBudget: number;
}

export function ActiveWorkspace({
  selectedContract,
  selectedMilestoneIndex,
  viewMode,
  walletAddress,
  timeLeft,
  reqText,
  reqAttachedFiles,
  handleDownloadFile,
  downloadingFileCid,
  disputeStatement,
  setDisputeStatement,
  setShowDisputeConfirm,
  isLoading,
  deliverableInput,
  setDeliverableInput,
  isDragging,
  setIsDragging,
  deliverableFiles,
  setDeliverableFiles,
  handleSubmitDeliverable,
  handleReleaseMilestone,
  deliverableText,
  deliverableAttachedFiles,
  ratingInput,
  setRatingInput,
  setShowReleaseConfirm,
  milestoneBudget
}: ActiveWorkspaceProps) {
  const isRefunded = selectedContract.milestoneRefunded?.[selectedMilestoneIndex] || (selectedContract.status === 'REFUNDED' && (selectedContract.disputeRecord ? selectedMilestoneIndex >= selectedContract.disputeRecord.milestone_index : selectedMilestoneIndex >= selectedContract.milestonesCompleted - 1));
  const isPastMilestone = selectedMilestoneIndex < selectedContract.milestonesCompleted && !isRefunded;
  const isCurrentMilestone = selectedMilestoneIndex === selectedContract.milestonesCompleted && selectedContract.status !== 'REFUNDED';
  const isFutureMilestone = selectedMilestoneIndex > selectedContract.milestonesCompleted && selectedContract.status !== 'REFUNDED';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Task specifications */}
      <div className="border border-white/5 bg-white/[0.01] p-6 rounded-xl flex flex-col justify-between hover:border-white/10 transition-smooth">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#7F00FF] font-bold block mb-4">Milestone Specifications</span>
          <div className="space-y-4 font-mono">
            {isRefunded ? (
              <div className="p-4 border border-rose-500/30 bg-rose-950/20 rounded-xl text-rose-400 font-mono text-xs flex items-center justify-between shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                <span className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Milestone {selectedMilestoneIndex + 1} Refunded to Client
                </span>
                <span className="text-[9px] text-rose-300">Settled via TEE Dispute Resolution</span>
              </div>
            ) : isPastMilestone ? (
              <div className="p-4 border border-emerald-500/20 bg-emerald-950/15 rounded-xl text-emerald-400 font-mono text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                  <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                  Milestone {selectedMilestoneIndex + 1} Settled
                </span>
                <span className="text-[9px] text-slate-400">Payout released on-chain</span>
              </div>
            ) : isFutureMilestone ? (
              <div className="p-4 border border-slate-800 bg-slate-900/30 rounded-xl text-slate-400 font-mono text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                  <Lock className="w-4 h-4 text-slate-500" />
                  Milestone {selectedMilestoneIndex + 1} Locked
                </span>
                <span className="text-[9px] text-slate-500">Unlocks after Milestone {selectedContract.milestonesCompleted + 1} completion</span>
              </div>
            ) : isCurrentMilestone && selectedContract.activeMilestoneSubmitted && timeLeft ? (
              <div className={`p-4 border rounded-xl flex flex-col gap-2 font-mono transition-smooth ${
                timeLeft.isExpired 
                  ? 'bg-emerald-950/15 border-emerald-500/20 text-emerald-400' 
                  : (timeLeft.days === 0 && timeLeft.hours < 12)
                    ? 'bg-red-950/15 border-red-500/20 text-red-400 animate-pulse'
                    : 'bg-amber-950/15 border-amber-500/20 text-amber-400'
              }`}>
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${timeLeft.isExpired ? 'bg-[#00E676] drop-shadow-[0_0_4px_#00E676]' : 'bg-amber-400 animate-pulse drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]'}`}></span>
                    {timeLeft.isExpired 
                      ? 'Auto-Release Window Expired' 
                      : viewMode === 'client' 
                        ? 'Client Review Countdown' 
                        : 'Client Review Window'}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {timeLeft.isExpired 
                      ? (viewMode === 'freelancer' ? 'You may claim auto-release' : 'Freelancer may claim release') 
                      : (viewMode === 'client' ? 'Approve or dispute before timer expires' : 'Auto-release when timer expires')}
                  </span>
                </div>
                <div className="flex gap-4 items-center justify-center py-2 border-y border-white/5">
                  {!timeLeft.isExpired ? (
                    <>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold font-mono">{timeLeft.days}</span>
                        <span className="text-[8px] text-slate-500 uppercase">Days</span>
                      </div>
                      <span className="text-slate-600">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="text-[8px] text-slate-500 uppercase">Hrs</span>
                      </div>
                      <span className="text-slate-600">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="text-[8px] text-slate-500 uppercase">Min</span>
                      </div>
                      <span className="text-slate-600">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold font-mono">{String(timeLeft.seconds).padStart(2, '0')}</span>
                        <span className="text-[8px] text-slate-500 uppercase">Sec</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-1">
                      <span className="text-sm font-bold font-mono tracking-wide">READY FOR RELEASE BY CONTRACTOR</span>
                      <span className="text-[8px] text-slate-500 uppercase">No client objections were raised during the review window</span>
                    </div>
                  )}
                </div>
              </div>
            ) : isCurrentMilestone ? (
              <div className="p-4 border border-amber-500/20 bg-amber-950/10 rounded-xl text-amber-300 font-mono text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Awaiting Work Submission
                </span>
                <span className="text-[9px] text-slate-400">Freelancer has not yet submitted deliverable on-chain</span>
              </div>
            ) : null}

            <div className="bg-[#070913] p-5 border border-[#7F00FF]/25 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(127,0,255,0.05)]">
              <Lock className="w-4 h-4 text-[#7F00FF] absolute top-3 right-3 opacity-50" />
              <span className="text-[10px] text-slate-500 block mb-2 font-bold tracking-wider">TARGET REQUIREMENTS</span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {reqText}
              </p>
              {reqAttachedFiles.length > 0 && (
                <div className="border-t border-white/5 pt-3 mt-3 flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">Project Specification Files:</span>
                  {reqAttachedFiles.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300">
                      <span className="truncate max-w-[160px]">{file.name}</span>
                      <button
                        onClick={() => handleDownloadFile(
                          file.cid, 
                          selectedContract.milestoneKeys?.[selectedMilestoneIndex] || "", 
                          file.name, 
                          file.type
                        )}
                        disabled={downloadingFileCid === file.cid}
                        className="text-[#7F00FF] hover:text-[#9D4EDD] transition-smooth hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {downloadingFileCid === file.cid ? "Decrypting..." : "Download"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(deliverableText || deliverableAttachedFiles.length > 0 || isPastMilestone || (isCurrentMilestone && selectedContract.activeMilestoneSubmitted)) && (
              <div className="bg-[#070913] p-5 border border-[#00E676]/30 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(0,230,118,0.05)]">
                <Terminal className="w-4 h-4 text-[#00E676] absolute top-3 right-3 opacity-60" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider uppercase">SUBMITTED FREELANCER DELIVERABLE</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {deliverableText || "Deliverable submitted on-chain. Decrypting details..."}
                </p>
                {deliverableAttachedFiles.length > 0 && (
                  <div className="border-t border-white/5 pt-3 mt-3 flex flex-col gap-2">
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">Submitted Deliverable Files:</span>
                    {deliverableAttachedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-3 py-2 rounded-lg text-[10px] font-mono text-slate-300">
                        <div className="flex items-center gap-2 truncate max-w-[180px]">
                          <Paperclip className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(
                            file.cid, 
                            selectedContract.deliverableKeys?.[selectedMilestoneIndex] || selectedContract.milestoneKeys?.[selectedMilestoneIndex] || "", 
                            file.name, 
                            file.type
                          )}
                          disabled={downloadingFileCid === file.cid}
                          className="px-2.5 py-1 bg-[#00E676]/10 hover:bg-[#00E676]/20 border border-[#00E676]/30 text-[#00E676] rounded text-[10px] transition-smooth hover:underline cursor-pointer disabled:opacity-50 font-bold"
                        >
                          {downloadingFileCid === file.cid ? "Decrypting..." : "Download File"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between items-center border-b border-white/5 pb-3 pt-1">
              <span className="text-slate-500 text-xs">MILESTONE_STATUS:</span>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                isRefunded
                  ? 'text-rose-400 bg-rose-950/20 border-rose-500/30'
                  : isPastMilestone 
                    ? 'text-[#00E676] bg-emerald-950/20 border-emerald-500/30' 
                    : isCurrentMilestone 
                      ? (selectedContract.activeMilestoneSubmitted ? 'text-[#00F2FE] bg-[#00F2FE]/10 border-[#00F2FE]/30' : 'text-amber-400 bg-amber-950/20 border-amber-500/30')
                      : 'text-slate-500 bg-slate-900/40 border-slate-700/30'
              }`}>
                {isRefunded
                  ? 'DISPUTED_REFUNDED'
                  : isPastMilestone 
                    ? 'SETTLED_COMPLETED' 
                    : isCurrentMilestone 
                      ? (selectedContract.activeMilestoneSubmitted ? 'ACTIVE_SUBMITTED' : 'ACTIVE_LOCKED')
                      : 'LOCKED_PENDING'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">BUDGET_SECURED:</span>
              <span className="text-[#00F2FE] text-xs font-extrabold font-mono teal-glow-text">
                {milestoneBudget.toLocaleString()} cUSDC
              </span>
            </div>
          </div>
        </div>

        {/* Dispute actions */}
        {isCurrentMilestone && selectedContract.status === 'ACTIVE' && selectedContract.milestonesCompleted < selectedContract.totalMilestones && (
          <div className="mt-8 border-t border-white/5 pt-5 flex flex-col gap-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#FF1744]/70 font-bold block">TEE Arbiter Dispute Statement Context</span>
            <textarea
              rows={3}
              placeholder="State your reasons for raising a dispute. This statement will be uploaded encrypted to Supabase/IPFS for the TEE Arbiter evaluation."
              value={disputeStatement}
              onChange={(e) => setDisputeStatement(e.target.value)}
              className="w-full bg-[#05070F] border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:border-red-500/40 focus:outline-none transition-smooth resize-none"
            />
            <button
              onClick={() => setShowDisputeConfirm(true)}
              disabled={isLoading}
              className="w-full py-4 bg-red-950/10 hover:bg-red-950/20 border border-red-900/25 text-[#FF1744] font-mono text-xs tracking-widest uppercase rounded-xl flex items-center justify-center gap-2.5 cursor-pointer font-bold transition-smooth hover:shadow-[0_0_15px_rgba(255,23,68,0.1)] active:scale-[0.98]"
            >
              <AlertTriangle className="w-4 h-4" />
              Raise Dispute (D)
            </button>
          </div>
        )}
      </div>

      {/* Actions Console */}
      <div className="border border-white/5 bg-white/[0.01] p-6 rounded-xl flex flex-col justify-between hover:border-white/10 transition-smooth">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#7F00FF] font-bold block mb-4">Actions Console</span>
          
          <div className="space-y-6">
            {/* Top Agreement Summary Banner if Refunded or Completed */}
            {selectedContract.status === 'REFUNDED' && (
              <div className="p-4 bg-rose-950/15 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-400 flex gap-3 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 drop-shadow-[0_0_5px_#f43f5e]" />
                <div className="flex flex-col gap-0.5">
                  <strong className="block tracking-wider uppercase">Escrow Agreement Refunded</strong>
                  <span className="font-sans text-[11px] text-slate-300">
                    Dispute settled in favor of client by Intel TDX TEE AI Arbiter. Remaining milestone funds returned to client.
                  </span>
                </div>
              </div>
            )}

            {selectedContract.status === 'COMPLETED' && (
              <div className="p-4 bg-emerald-950/10 border border-emerald-900/25 rounded-xl text-xs font-mono text-[#00E676] flex gap-3 shadow-[0_0_15px_rgba(0,230,118,0.03)]">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-[#00E676] drop-shadow-[0_0_5px_#00E676]" />
                <div className="flex flex-col gap-0.5">
                  <strong className="block tracking-wider uppercase">Escrow Agreement Completed</strong>
                  <span className="font-sans text-[11px] text-slate-400">
                    All milestones successfully verified and settled on-chain.
                  </span>
                </div>
              </div>
            )}

            {/* Real-time Milestone Escrow Financial Ledger Panel */}
            <div className="bg-[#05070F] border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#00F2FE]" />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-300 font-bold">
                    Escrow Vault Financial Ledger
                  </span>
                </div>
                <span className="font-mono text-[8px] text-emerald-400 uppercase">✓ Hardware Attested</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 border-y border-white/5 py-3 my-1">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">Total Locked</span>
                  <span className="font-mono text-xs font-bold text-white mt-0.5">
                    {selectedContract.budget.toLocaleString()} cUSDC
                  </span>
                </div>
                <div className="flex flex-col text-center border-x border-white/5 px-2">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">Released</span>
                  <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">
                    {((selectedContract.earnedPayout ? selectedContract.earnedPayout / 0.995 : (selectedContract.budget / selectedContract.totalMilestones) * selectedContract.milestonesCompleted)).toLocaleString()} cUSDC
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">
                    {selectedContract.status === 'REFUNDED' ? 'Refunded' : 'Remaining'}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#38BDF8] mt-0.5">
                    {(selectedContract.status === 'REFUNDED' && selectedContract.refundedAmount ? selectedContract.refundedAmount / 1.01 : (selectedContract.status === 'COMPLETED' ? 0 : selectedContract.budget - ((selectedContract.budget / selectedContract.totalMilestones) * selectedContract.milestonesCompleted))).toLocaleString()} cUSDC
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 mt-0.5">
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-slate-400 uppercase">Ledger Settlement progress</span>
                  <span className="text-white font-bold">{Math.round((selectedContract.milestonesCompleted / selectedContract.totalMilestones) * 100)}% Settled</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00F2FE] to-[#7F00FF] transition-all duration-500"
                    style={{ width: `${(selectedContract.milestonesCompleted / selectedContract.totalMilestones) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-2.5 bg-[#0B0E17]/60 border border-white/[0.04] rounded-xl text-[10px] font-sans text-slate-400 leading-normal flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                <span>
                  <strong>ZK Budget Assurance:</strong> All settlement variables are processed cryptographically on-chain. Decrypted balances are only visible to verified contract counterparties.
                </span>
              </div>
            </div>

              {isRefunded ? (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-950/15 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-400 flex gap-3 shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 drop-shadow-[0_0_5px_#f43f5e]" />
                    <div className="flex flex-col gap-0.5">
                      <strong className="block tracking-wider uppercase">Milestone {selectedMilestoneIndex + 1} Refunded to Client</strong>
                      <span className="font-sans text-[11px] text-slate-300">TEE AI Arbiter ruled in favor of client. Milestone budget returned on-chain.</span>
                    </div>
                  </div>

                  {selectedContract.disputeRecord && (
                    <div className="bg-[#070913] p-4 border border-rose-500/20 rounded-xl space-y-2">
                      <span className="text-[10px] text-rose-400 font-mono font-bold uppercase tracking-wider">Gemini 2.5 Flash TEE Arbiter Reasoning</span>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
                        "{selectedContract.disputeRecord.reasoning}"
                      </p>
                    </div>
                  )}

                  {deliverableText && (
                    <div className="bg-[#070913] p-5 border border-rose-500/20 rounded-xl relative overflow-hidden">
                      <Terminal className="w-4 h-4 text-rose-400 absolute top-3 right-3 opacity-50" />
                      <span className="text-[10px] text-slate-500 block mb-2 font-bold tracking-wider uppercase">SUBMITTED DELIVERABLE (DISPUTED)</span>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans mb-3 whitespace-pre-wrap">
                        {deliverableText}
                      </p>
                    </div>
                  )}
                </div>
              ) : isPastMilestone ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-950/10 border border-emerald-900/25 rounded-xl text-xs font-mono text-[#00E676] flex gap-3 shadow-[0_0_15px_rgba(0,230,118,0.03)]">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#00E676] drop-shadow-[0_0_5px_#00E676]" />
                    <div className="flex flex-col gap-0.5">
                      <strong className="block tracking-wider uppercase">Milestone {selectedMilestoneIndex + 1} Settled & Released</strong>
                      <span className="font-sans text-[11px] text-slate-400">Payout successfully unlocked to contractor on-chain.</span>
                    </div>
                  </div>

                  {deliverableText && (
                    <div className="bg-[#070913] p-5 border border-[#00E676]/25 rounded-xl relative overflow-hidden">
                      <Terminal className="w-4 h-4 text-[#00E676] absolute top-3 right-3 opacity-50" />
                      <span className="text-[10px] text-slate-500 block mb-2 font-bold tracking-wider uppercase">ARCHIVED FREELANCER DELIVERABLE</span>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans mb-3 whitespace-pre-wrap">
                        {deliverableText}
                      </p>
                      {deliverableAttachedFiles.length > 0 && (
                        <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">Attached Deliverable Files:</span>
                          {deliverableAttachedFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300">
                              <span className="truncate max-w-[160px]">{file.name}</span>
                              <button
                                onClick={() => handleDownloadFile(
                                  file.cid, 
                                  selectedContract.deliverableKeys?.[selectedMilestoneIndex] || "", 
                                  file.name, 
                                  file.type
                                )}
                                disabled={downloadingFileCid === file.cid}
                                className="text-[#00E676] hover:text-emerald-300 transition-smooth hover:underline cursor-pointer disabled:opacity-50 font-bold"
                              >
                                {downloadingFileCid === file.cid ? "Decrypting..." : "Download"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : isFutureMilestone ? (
                <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2 text-slate-300 font-bold uppercase">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span>Milestone {selectedMilestoneIndex + 1} Locked</span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    This milestone is currently locked. Complete Milestone {selectedContract.milestonesCompleted + 1} first to advance the contract.
                  </p>
                </div>
              ) : viewMode === 'freelancer' ? (
                /* Freelancer Action Console for Current Milestone */
                selectedContract.activeMilestoneSubmitted ? (
                  <div className="space-y-4">
                    {timeLeft?.isExpired ? (
                      <div className="p-5 bg-emerald-950/15 border border-emerald-500/30 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Review Window Expired — Auto-Release Ready</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          The client did not raise any dispute during the review window. You are authorized to claim the full milestone payout on-chain.
                        </p>
                        <button
                          onClick={() => handleReleaseMilestone(selectedContract.address)}
                          disabled={isLoading}
                          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-[#05070F] font-mono text-xs font-bold uppercase tracking-widest transition-smooth cursor-pointer shadow-lg flex items-center justify-center gap-2 rounded-xl"
                        >
                          <Unlock className="w-4 h-4" />
                          {isLoading ? "Executing Payout..." : "Claim Auto-Release Payout"}
                        </button>
                      </div>
                    ) : (
                      <div className="p-5 bg-[#070913] border border-[#00F2FE]/25 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-[#00F2FE] font-mono text-xs font-bold uppercase">
                          <Clock className="w-4 h-4 text-[#00F2FE]" />
                          <span>Deliverable Submitted — Client Review In Progress</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          Your milestone deliverable has been encrypted and submitted on-chain. The client is reviewing your submission. You can claim auto-release if the timer expires without objection.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(!walletAddress || walletAddress.toLowerCase() !== (selectedContract.role === 'FREELANCER' ? walletAddress.toLowerCase() : selectedContract.counterparty.toLowerCase())) && (
                      <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs font-mono text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <span className="font-bold uppercase block text-[10px] text-amber-400 mb-0.5">Wallet Role Mismatch</span>
                          Your connected wallet is the <strong>Client</strong> for this contract. Switch your Web3 wallet (MetaMask/Rabby) to the assigned <strong>Freelancer wallet</strong> ({selectedContract.role === 'FREELANCER' ? walletAddress?.slice(0,6) : selectedContract.counterparty.slice(0,6)}...{selectedContract.role === 'FREELANCER' ? walletAddress?.slice(-4) : selectedContract.counterparty.slice(-4)}) to submit deliverables on-chain.
                        </div>
                      </div>
                    )}

                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Submit Code Deliverable / Git diff</label>
                    <textarea 
                      rows={3}
                      placeholder="Tested Collapsible sidebar. Full GPU acceleration and responsive Chrome/Safari/Firefox compatibility."
                      value={deliverableInput} 
                      onChange={(e) => setDeliverableInput(e.target.value)}
                      className="w-full bg-[#05070F] border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:border-[#7F00FF]/40 focus:outline-none transition-smooth resize-none"
                    />

                    {/* Encrypted Deliverables Uploader */}
                    <div className="flex flex-col gap-2">
                      <label className="font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">Attach Deliverable Files (Optional)</label>
                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={() => setIsDragging(false)}
                        className={`relative border border-dashed p-4 rounded-xl flex flex-col items-center gap-1.5 transition-smooth cursor-pointer ${
                          isDragging 
                            ? "border-[#00F2FE] bg-[#00F2FE]/5 shadow-[0_0_15px_rgba(0,242,254,0.15)] scale-[1.02]" 
                            : "border-white/10 hover:border-[#00F2FE]/40 bg-white/[0.01] hover:bg-white/[0.02]"
                        }`}
                      >
                        <input 
                          type="file" 
                          multiple 
                          onChange={(e) => {
                            if (e.target.files) {
                              setDeliverableFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Paperclip className={`w-4 h-4 transition-smooth ${isDragging ? "text-[#7F00FF] scale-110" : "text-[#00F2FE]"}`} />
                        <span className="text-[10px] font-mono text-slate-400">
                          {isDragging ? "Drop your files here!" : "Drag & drop files or click to upload"}
                        </span>
                      </div>

                      {deliverableFiles.length > 0 && (
                        <div className="flex flex-col gap-2 bg-[#05070F]/50 border border-white/5 p-3 rounded-xl max-h-32 overflow-y-auto custom-scrollbar">
                          {deliverableFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-[#070913]/80 border border-white/5 px-3 py-1.5 rounded-lg">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Paperclip className="w-3 h-3 text-[#00F2FE] flex-shrink-0" />
                                <span className="font-mono text-[10px] text-slate-300 truncate max-w-[160px]">{file.name}</span>
                                <span className="font-mono text-[8px] text-slate-500 flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                              </div>
                              <button 
                                onClick={() => setDeliverableFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="text-slate-500 hover:text-red-400 transition-smooth cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSubmitDeliverable(selectedContract.address)}
                      disabled={isLoading || (!deliverableInput.trim() && deliverableFiles.length === 0)}
                      className="w-full py-4.5 bg-[#00F2FE] text-[#05070F] font-mono text-xs font-bold uppercase tracking-widest transition-smooth hover:shadow-[0_0_20px_rgba(0,242,254,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2.5 rounded-xl border border-transparent"
                    >
                      <Terminal className="w-4 h-4" />
                      {isLoading ? "Signing handle..." : "Submit Deliverable (Enter)"}
                    </button>
                  </div>
                )
              ) : (
                /* Client Action Console for Current Milestone */
                selectedContract.activeMilestoneSubmitted ? (
                  <div className="space-y-5">
                    <div className="bg-[#070913] p-5 border border-[#00F2FE]/25 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(0,242,254,0.05)]">
                      <Terminal className="w-4 h-4 text-[#00F2FE] absolute top-3 right-3 opacity-50" />
                      <span className="text-[10px] text-slate-500 block mb-2 font-bold tracking-wider">SUBMITTED FREELANCER DELIVERABLES</span>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans mb-3 whitespace-pre-wrap">
                        {deliverableText || "No description text provided."}
                      </p>
                      {deliverableAttachedFiles.length > 0 && (
                        <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">Deliverable Files:</span>
                          {deliverableAttachedFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300">
                              <span className="truncate max-w-[160px]">{file.name}</span>
                              <button
                                onClick={() => handleDownloadFile(
                                  file.cid, 
                                  selectedContract.deliverableKeys?.[selectedMilestoneIndex] || "", 
                                  file.name, 
                                  file.type
                                )}
                                disabled={downloadingFileCid === file.cid}
                                className="text-[#00F2FE] hover:text-[#33F5FF] transition-smooth hover:underline cursor-pointer disabled:opacity-50 font-bold"
                              >
                                {downloadingFileCid === file.cid ? "Decrypting..." : "Download"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Approve & Release Milestone</label>
                    <p className="text-[12px] text-slate-400 leading-relaxed font-sans">
                      Award contractor reputation rating (1-5 stars) to execute the release payout on-chain.
                    </p>
                    <div className="flex gap-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRatingInput(star)}
                          className={`w-12 h-12 border font-mono text-sm rounded-xl transition-smooth cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${
                            ratingInput === star 
                              ? 'bg-[#00F2FE] text-[#05070F] font-extrabold border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.3)]' 
                              : 'border-white/5 text-slate-400 hover:text-white bg-[#05070F] hover:border-white/20'
                          }`}
                        >
                          {star}★
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowReleaseConfirm(true)}
                      disabled={isLoading}
                      className="w-full py-4.5 bg-[#00F2FE] text-[#05070F] font-mono text-xs font-bold uppercase tracking-widest transition-smooth hover:shadow-[0_0_20px_rgba(0,242,254,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2.5 rounded-xl border border-transparent"
                    >
                      <Unlock className="w-4 h-4" />
                      {isLoading ? "Executing transactions..." : "Release Milestone Payout"}
                    </button>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-950/10 border border-amber-500/20 rounded-xl space-y-2 text-xs font-mono text-amber-300">
                    <div className="flex items-center gap-2 font-bold uppercase">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Awaiting Freelancer Deliverable</span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      The freelancer is currently working on Milestone {selectedMilestoneIndex + 1}. Once they submit their deliverable, you will be able to review decrypted files, rate performance, and release payout on-chain.
                    </p>
                  </div>
                )
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
