import React from 'react';
import { Lock, Paperclip } from 'lucide-react';
import { type EscrowContract } from '../../services/escrowService';

interface SigningWorkspaceProps {
  selectedContract: EscrowContract;
  viewMode: 'client' | 'freelancer';
  resumeTitle: string;
  setResumeTitle: (val: string) => void;
  resumeMilestones: { payout: string; requirements: string }[];
  setResumeMilestones: React.Dispatch<React.SetStateAction<{ payout: string; requirements: string }[]>>;
  resumeFiles: File[];
  setResumeFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isInitializingDeployed: boolean;
  setIsInitializingDeployed: (val: boolean) => void;
  handleInitializeDeployedEscrow?: (
    escrowAddress: string,
    payouts: number[],
    requirements: string[],
    title: string,
    files: File[]
  ) => Promise<void>;
}

export function SigningWorkspace({
  selectedContract,
  viewMode,
  resumeTitle,
  setResumeTitle,
  resumeMilestones,
  setResumeMilestones,
  resumeFiles,
  setResumeFiles,
  isInitializingDeployed,
  setIsInitializingDeployed,
  handleInitializeDeployedEscrow
}: SigningWorkspaceProps) {
  const isFormValid = resumeMilestones.every(
    m => m.payout.trim() && !isNaN(Number(m.payout)) && Number(m.payout) > 0 && m.requirements.trim()
  );

  return (
    <div className="uniswap-card p-6 md:p-8 border border-[#7F00FF]/25 bg-[#7F00FF]/5 rounded-2xl flex flex-col gap-6 animate-scale-in">
      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
        <div className="w-10 h-10 rounded-xl bg-[#7F00FF]/15 flex items-center justify-center border border-[#7F00FF]/30">
          <Lock className="w-5 h-5 text-[#C084FC] animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            🔒 Escrow Vault Setup & Funding Required
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            This lightweight escrow proxy was deployed on-chain, but its budget has not been locked and milestone specs are uninitialized.
          </p>
        </div>
      </div>

      {viewMode === 'client' ? (
        <div className="flex flex-col gap-6 font-sans">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Project Title / Agreement Name
            </label>
            <input 
              type="text" 
              value={resumeTitle} 
              onChange={(e) => setResumeTitle(e.target.value)}
              placeholder="e.g. DeFi Smart Contract Security Audit"
              className="uniswap-input-box px-4 py-3 text-sm text-white focus:outline-none w-full"
            />
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold text-slate-300">
              Configure Milestone Budgets and Requirements ({selectedContract.totalMilestones} Milestones total)
            </span>
            {resumeMilestones.map((milestone, idx) => (
              <div key={idx} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-3">
                <span className="font-mono text-[10px] text-slate-500 font-bold uppercase">Milestone {idx + 1}</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <input 
                      type="number" 
                      placeholder="Budget (USDC)" 
                      value={milestone.payout}
                      onChange={(e) => {
                        const newMils = [...resumeMilestones];
                        newMils[idx].payout = e.target.value;
                        setResumeMilestones(newMils);
                      }}
                      className="uniswap-input-box px-3 py-2 text-xs text-white focus:outline-none w-full text-center"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input 
                      type="text" 
                      placeholder="What needs to be delivered for this milestone?" 
                      value={milestone.requirements}
                      onChange={(e) => {
                        const newMils = [...resumeMilestones];
                        newMils[idx].requirements = e.target.value;
                        setResumeMilestones(newMils);
                      }}
                      className="uniswap-input-box px-3 py-2 text-xs text-white focus:outline-none w-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Attachment selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-[#38BDF8]" /> Confidential File Attachments (Optional)
            </label>
            <input 
              type="file" 
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setResumeFiles(Array.from(e.target.files));
                }
              }}
              className="uniswap-input-box p-2 text-xs text-slate-300 focus:outline-none w-full cursor-pointer file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-white/[0.08] file:text-white hover:file:bg-white/[0.12]"
            />
          </div>

          <button
            disabled={isInitializingDeployed || !isFormValid}
            onClick={async () => {
              if (handleInitializeDeployedEscrow) {
                setIsInitializingDeployed(true);
                try {
                  await handleInitializeDeployedEscrow(
                    selectedContract.address,
                    resumeMilestones.map(m => Number(m.payout)),
                    resumeMilestones.map(m => m.requirements),
                    resumeTitle,
                    resumeFiles
                  );
                } catch (e) {
                  console.error("Initialize error:", e);
                } finally {
                  setIsInitializingDeployed(false);
                }
              }
            }}
            className="w-full py-3.5 bg-gradient-to-r from-[#7F00FF] to-[#C084FC] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-smooth hover:shadow-[0_0_20px_rgba(127,0,255,0.35)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isInitializingDeployed ? "Encrypting & Locking Funds..." : "Fund & Initialize Escrow Vault"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-center py-6 font-sans items-center justify-center">
          <div className="relative flex h-3 w-3 mb-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
          </div>
          <h4 className="text-sm font-bold text-[#C084FC]">Awaiting Client Setup & Funding</h4>
          <p className="text-xs text-slate-300 max-w-md leading-relaxed">
            The client deployed this contract clone proxy on-chain, but has not yet funded the escrow vault or encrypted the milestones requirements. Once funded, this workspace will activate automatically.
          </p>
        </div>
      )}
    </div>
  );
}
