import { useState, useEffect } from 'react';
import { Plus, X, Coins, Paperclip, Trash2 } from 'lucide-react';

interface DraftWizardProps {
  walletAddress: string | null;
  draftFreelancer: string;
  setDraftFreelancer: (val: string) => void;
  draftTotalMilestones: number;
  setDraftTotalMilestones: (val: number) => void;
  draftMilestonePayouts: string;
  setDraftMilestonePayouts: (val: string) => void;
  draftMilestoneReqs: string;
  setDraftMilestoneReqs: (val: string) => void;
  isLoading: boolean;
  handleDeployEscrow: () => Promise<void>;
  onClose: () => void;
  draftFiles: File[];
  setDraftFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

interface MilestoneItem {
  payout: string;
  requirements: string;
}

export function DraftWizard({
  walletAddress,
  draftFreelancer,
  setDraftFreelancer,
  draftTotalMilestones,
  setDraftTotalMilestones,
  draftMilestonePayouts,
  setDraftMilestonePayouts,
  draftMilestoneReqs,
  setDraftMilestoneReqs,
  isLoading,
  handleDeployEscrow,
  onClose,
  draftFiles,
  setDraftFiles
}: DraftWizardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isGasless, setIsGasless] = useState(false);

  // Initialize milestone items state from parent states or fallback to a default
  const [milestoneItems, setMilestoneItems] = useState<MilestoneItem[]>(() => {
    const payouts = draftMilestonePayouts ? draftMilestonePayouts.split(',').map(p => p.trim()) : ["1000"];
    const reqs = draftMilestoneReqs ? draftMilestoneReqs.split(';').map(r => r.trim()) : ["Build a responsive collapsible sidebar using React."];
    const length = Math.max(payouts.length, reqs.length, draftTotalMilestones || 1);
    const items: MilestoneItem[] = [];
    for (let i = 0; i < length; i++) {
      items.push({
        payout: payouts[i] || "1000",
        requirements: reqs[i] || ""
      });
    }
    return items;
  });

  // Synchronize internal milestoneItems array state back to parent states
  useEffect(() => {
    const payoutsStr = milestoneItems.map(item => item.payout.trim()).join(',');
    const reqsStr = milestoneItems.map(item => item.requirements.trim()).join(';');
    setDraftMilestonePayouts(payoutsStr);
    setDraftMilestoneReqs(reqsStr);
    setDraftTotalMilestones(milestoneItems.length);
  }, [milestoneItems, setDraftMilestonePayouts, setDraftMilestoneReqs, setDraftTotalMilestones]);

  const handleAddMilestone = () => {
    if (milestoneItems.length >= 20) return;
    setMilestoneItems(prev => [...prev, { payout: "1000", requirements: "" }]);
  };

  const handleRemoveMilestone = (idx: number) => {
    if (milestoneItems.length <= 1) return;
    setMilestoneItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMilestone = (idx: number, field: keyof MilestoneItem, value: string) => {
    setMilestoneItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const totalBudget = milestoneItems.reduce((acc, item) => {
    const val = Number(item.payout);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  // Validations
  const isValidAddress = /^0x[a-fA-F0-9]{42}$/.test(draftFreelancer.trim());
  const isMilestonesValid = milestoneItems.every(
    item => item.payout.trim() !== "" && !isNaN(Number(item.payout)) && Number(item.payout) > 0 && item.requirements.trim().length > 0
  );
  const isValidCount = milestoneItems.length > 0 && milestoneItems.length <= 20;
  const isFormValid = isValidAddress && isMilestonesValid && isValidCount;

  // Compile descriptive validation errors
  let validationError = "";
  if (draftFreelancer.trim() && !isValidAddress) {
    validationError = "Freelancer Address must be a valid 42-character hex (starting with 0x).";
  } else if (!isValidAddress) {
    validationError = "Please enter a valid Freelancer Address.";
  } else if (!isMilestonesValid) {
    validationError = "Every milestone must have a positive budget and non-empty requirements.";
  } else if (!isValidCount) {
    validationError = "You must configure between 1 and 20 milestones.";
  }

  return (
    <div className="bento-card bento-card-violet p-6 md:p-8 flex flex-col gap-6 w-full animate-slide-up">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7F00FF]/10 border border-[#7F00FF]/20 flex items-center justify-center">
            <Plus className="w-4 h-4 text-[#7F00FF]" />
          </div>
          <h2 className="font-mono text-sm tracking-widest text-slate-200 font-bold uppercase">
            DRAFT_NEW_ESCROW_AGREEMENT
          </h2>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 rounded-lg border border-white/5 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-smooth cursor-pointer hover:bg-white/[0.02]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs Column */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">Freelancer Address</label>
            <input 
              type="text" 
              placeholder="0x..." 
              value={draftFreelancer} 
              onChange={(e) => setDraftFreelancer(e.target.value)}
              className={`w-full bg-[#05070F] border rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none transition-smooth ${
                draftFreelancer.trim() && !isValidAddress 
                  ? 'border-red-500/50 focus:border-red-500' 
                  : 'border-white/5 focus:border-[#7F00FF]/40'
              }`}
            />
          </div>

          {/* Dynamic Milestones Section */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center pb-1">
              <label className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">Milestone Configurations</label>
              <button 
                type="button"
                onClick={handleAddMilestone}
                disabled={milestoneItems.length >= 20}
                className="px-2.5 py-1 rounded-lg border border-[#7F00FF]/30 bg-[#7F00FF]/10 hover:bg-[#7F00FF]/25 font-mono text-[9px] text-[#00F2FE] uppercase tracking-wider font-bold transition-smooth flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3 h-3 text-[#00F2FE]" />
                Add Milestone
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
              {milestoneItems.map((item, idx) => (
                <div key={idx} className="bg-[#05070F]/60 border border-white/5 p-4 rounded-xl flex flex-col gap-3 relative hover:border-white/10 transition-smooth">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-mono text-[10px] text-[#00F2FE] tracking-widest font-bold">MILESTONE_{idx + 1}</span>
                    {milestoneItems.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        className="text-slate-500 hover:text-red-400 transition-smooth cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5 sm:col-span-1">
                      <label className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">Payout (cUSDC)</label>
                      <input 
                        type="number"
                        min="1"
                        placeholder="1000"
                        value={item.payout}
                        onChange={(e) => handleUpdateMilestone(idx, 'payout', e.target.value)}
                        className="w-full bg-[#05070F] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-[#7F00FF]/40 focus:outline-none transition-smooth"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">Requirements</label>
                      <input 
                        type="text"
                        placeholder="Describe deliverables..."
                        value={item.requirements}
                        onChange={(e) => handleUpdateMilestone(idx, 'requirements', e.target.value)}
                        className="w-full bg-[#05070F] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-[#7F00FF]/40 focus:outline-none transition-smooth"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secure File Attachments Field */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">Encrypted File Attachments (Optional)</label>
            <div 
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={() => setIsDragging(false)}
              className={`relative border border-dashed p-4 rounded-xl flex flex-col items-center gap-1.5 transition-smooth cursor-pointer ${
                isDragging 
                  ? "border-[#7F00FF] bg-[#7F00FF]/5 shadow-[0_0_15px_rgba(127,0,255,0.15)] scale-[1.02]" 
                  : "border-white/10 hover:border-[#7F00FF]/40 bg-white/[0.01] hover:bg-white/[0.02]"
              }`}
            >
              <input 
                type="file" 
                multiple 
                onChange={(e) => {
                  if (e.target.files) {
                    setDraftFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Paperclip className={`w-4 h-4 transition-smooth ${isDragging ? "text-[#00F2FE] scale-110" : "text-[#7F00FF]"}`} />
              <span className="text-[10px] font-mono text-slate-400">
                {isDragging ? "Drop your files here!" : "Drag & drop files or click to upload"}
              </span>
              <span className="text-[8px] font-mono text-slate-500 uppercase">Supports PDF, ZIP, PNG, JSON</span>
            </div>

            {draftFiles.length > 0 && (
              <div className="flex flex-col gap-2 bg-[#05070F]/50 border border-white/5 p-3 rounded-xl max-h-32 overflow-y-auto custom-scrollbar">
                {draftFiles.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#070913]/80 border border-white/5 px-3 py-1.5 rounded-lg">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="w-3 h-3 text-[#00F2FE] flex-shrink-0" />
                      <span className="font-mono text-[10px] text-slate-300 truncate max-w-[160px]">{file.name}</span>
                      <span className="font-mono text-[8px] text-slate-500 flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button 
                      onClick={() => setDraftFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-400 transition-smooth cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live contract preview JSON compiler Column */}
        <div className="border border-white/5 bg-white/[0.01] p-6 rounded-xl flex flex-col justify-between hover:border-white/10 transition-smooth">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#7F00FF] font-bold block pb-2 border-b border-white/5">
              Live Contract Preview
            </span>
            <div className="flex flex-col gap-3 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">CLIENT:</span>
                <span className="text-slate-300 font-bold truncate max-w-[200px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : 'DISCONNECTED'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">FREELANCER:</span>
                <span className="text-slate-300 font-bold truncate max-w-[200px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {draftFreelancer ? `${draftFreelancer.slice(0, 10)}...${draftFreelancer.slice(-8)}` : 'NOT_SPECIFIED'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">MILESTONES:</span>
                <span className="text-slate-300 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {milestoneItems.length}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-3">
                <span className="text-slate-500">TOTAL_BUDGET:</span>
                <span className="text-[#00F2FE] font-extrabold teal-glow-text">
                  {totalBudget.toLocaleString()} cUSDC
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">KMS_ENCRYPTION:</span>
                <span className="text-[#7F00FF] font-bold animate-pulse">ACTIVE_PENDING</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex flex-col">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Gas Sponsored</span>
                  <span className="text-[8px] text-slate-500 font-sans">NoxRelayer (ERC-2771 meta-tx)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGasless(!isGasless)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-smooth focus:outline-none cursor-pointer ${
                    isGasless ? 'bg-[#00F2FE]' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-[#05070F] shadow-md transform transition-smooth ${
                    isGasless ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {isGasless && (
                <div className="bg-emerald-950/15 border border-emerald-900/30 p-2.5 rounded-lg text-[9px] text-emerald-400 leading-normal font-sans">
                  🚀 **Relayer Gasless Mode Active**: Deployment gas fee will be sponsored. You will only sign a cryptographic EIP-712 approval signature.
                </div>
              )}

              {/* Validation Warning Panel */}
              {validationError && (
                <div className="bg-amber-950/15 border border-amber-900/30 p-2.5 rounded-lg text-[9px] text-amber-400 leading-normal font-sans mt-2">
                  ⚠️ **Validation Status**: {validationError}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDeployEscrow}
            disabled={isLoading || !isFormValid}
            className="w-full py-4.5 bg-[#00F2FE] text-[#05070F] font-mono text-xs font-bold uppercase tracking-widest transition-smooth hover:shadow-[0_0_20px_rgba(0,242,254,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2.5 rounded-xl border border-transparent mt-4"
          >
            <Coins className="w-4 h-4" />
            {isLoading ? "Executing transactions..." : "Deploy & Initialize (Enter)"}
          </button>
        </div>
      </div>

      {/* AI Arbitration Engine Safeguards & Specs Panel */}
      <div className="border-t border-white/5 pt-6 mt-2 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h3 className="font-mono text-[10px] tracking-widest text-[#00F2FE] uppercase font-bold">
              SECURE TEE ARBITRATION PROTOCOL & SAFEGUARDS
            </h3>
          </div>
          <span className="font-mono text-[9px] text-slate-500 border border-white/5 px-2 py-0.5 rounded bg-[#05070F]/60">
            ENCLAVE: Intel_SGX_v2_Attested
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#05070F]/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 hover:border-[#7F00FF]/30 transition-smooth">
            <span className="font-mono text-[9px] text-[#7F00FF] font-bold tracking-wider uppercase">TEE Enclave Validation</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Disputes are evaluated in a hardware-isolated, encrypted memory space. Models decrypt proof submissions only inside secure CPU enclaves, preventing information leakage.
            </p>
          </div>
          <div className="bg-[#05070F]/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 hover:border-[#00F2FE]/30 transition-smooth">
            <span className="font-mono text-[9px] text-[#00F2FE] font-bold tracking-wider uppercase">Anti-Hallucination Consensus</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Utilizes a strict **3-Agent Jury Consensus** matching submission evidence against defined milestones. Hallucination anomalies are statistically filtered.
            </p>
          </div>
          <div className="bg-[#05070F]/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 hover:border-[#7F00FF]/30 transition-smooth">
            <span className="font-mono text-[9px] text-purple-400 font-bold tracking-wider uppercase">Escalation Threshold (85%)</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Decisions must cross an 85% algorithmic confidence rating. If the model's arbitration is ambiguous, the dispute is automatically escalated to a Human Arbitration DAO.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
