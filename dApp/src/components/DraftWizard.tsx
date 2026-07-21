import React, { useState, useEffect } from 'react';
import { Plus, X, Paperclip, Trash2, ShieldCheck, User, ArrowRight, Briefcase, Copy, Check } from 'lucide-react';

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
  const [deploymentIntent, setDeploymentIntent] = useState<'client' | 'freelancer'>('client');
  const [copiedLink, setCopiedLink] = useState(false);

  const [milestoneItems, setMilestoneItems] = useState<MilestoneItem[]>(() => {
    const payouts = draftMilestonePayouts ? draftMilestonePayouts.split(',').map(p => p.trim()) : ["1000"];
    const reqs = draftMilestoneReqs ? draftMilestoneReqs.split(';').map(r => r.trim()) : ["Build core deliverables & UI components."];
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

  const isValidAddress = /^0x[a-fA-F0-9]{42}$/.test(draftFreelancer.trim());
  const isMilestonesValid = milestoneItems.every(
    item => item.payout.trim() !== "" && !isNaN(Number(item.payout)) && Number(item.payout) > 0 && item.requirements.trim().length > 0
  );
  const isValidCount = milestoneItems.length > 0 && milestoneItems.length <= 20;
  const isFormValid = isValidAddress && isMilestonesValid && isValidCount;

  let validationError = "";
  if (draftFreelancer.trim() && !isValidAddress) {
    validationError = deploymentIntent === 'client' 
      ? "Freelancer Address must be a valid 0x wallet address." 
      : "Client Address must be a valid 0x wallet address.";
  } else if (!isValidAddress) {
    validationError = deploymentIntent === 'client' 
      ? "Please enter a valid Freelancer wallet address." 
      : "Please enter a valid Client wallet address.";
  } else if (!isMilestonesValid) {
    validationError = "Each milestone requires a valid budget and description.";
  } else if (!isValidCount) {
    validationError = "Configure between 1 and 20 milestones.";
  }

  const handleCopyProposalLink = () => {
    const params = new URLSearchParams({
      freelancer: walletAddress || draftFreelancer,
      payouts: draftMilestonePayouts,
      reqs: draftMilestoneReqs
    });
    const url = `${window.location.origin}/deploy?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="uniswap-card p-6 md:p-8 flex flex-col gap-8 w-full max-w-4xl mx-auto animate-scale-in">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Plus className="w-6 h-6 text-[#38BDF8]" /> Deploy Encrypted Escrow
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure milestone budgets and requirements. Smart contract funds will be locked securely on-chain.
          </p>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 rounded-xl bg-[#131826] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Inputs */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Creator Role / Intent Selector */}
          <div className="flex flex-col gap-2 p-3 bg-[#131826]/70 rounded-2xl border border-white/[0.08]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Deployment Mode
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0E17] rounded-xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setDeploymentIntent('client')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  deploymentIntent === 'client'
                    ? 'bg-[#38BDF8] text-[#0B0E17] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Client (Direct Deposit)
              </button>
              <button
                type="button"
                onClick={() => setDeploymentIntent('freelancer')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  deploymentIntent === 'freelancer'
                    ? 'bg-[#C084FC] text-[#0B0E17] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Freelancer (Invoice / Proposal)
              </button>
            </div>
          </div>

          {/* Counterparty Address Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              {deploymentIntent === 'client' ? (
                <>
                  <User className="w-3.5 h-3.5 text-[#38BDF8]" /> Freelancer Wallet Address (Counterparty)
                </>
              ) : (
                <>
                  <Briefcase className="w-3.5 h-3.5 text-[#C084FC]" /> Client Wallet Address (Funding Party)
                </>
              )}
            </label>
            <input 
              type="text" 
              placeholder="0x74B4...0ffd" 
              value={draftFreelancer} 
              onChange={(e) => setDraftFreelancer(e.target.value)}
              className={`uniswap-input-box px-4 py-3 text-sm font-mono text-white focus:outline-none w-full ${
                draftFreelancer.trim() && !isValidAddress ? 'border-rose-500/50' : ''
              }`}
            />
          </div>

          {/* Milestones Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">
              Milestone Breakdown ({milestoneItems.length})
            </span>
            <button
              onClick={handleAddMilestone}
              disabled={milestoneItems.length >= 20}
              className="btn-uniswap-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5 text-[#38BDF8]" /> Add Milestone
            </button>
          </div>

          {/* Milestone List */}
          <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
            {milestoneItems.map((item, idx) => (
              <div key={idx} className="uniswap-input-box p-4 flex flex-col gap-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#38BDF8] flex items-center gap-1.5">
                    Milestone #{idx + 1}
                  </span>
                  {milestoneItems.length > 1 && (
                    <button
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Deliverable Requirement</span>
                    <input 
                      type="text" 
                      placeholder="e.g. Design responsive UI components" 
                      value={item.requirements}
                      onChange={(e) => handleUpdateMilestone(idx, 'requirements', e.target.value)}
                      className="bg-transparent border-b border-white/[0.1] focus:border-[#38BDF8] text-xs text-white py-1 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Payout (cUSDC)</span>
                    <input 
                      type="number" 
                      placeholder="1000" 
                      value={item.payout}
                      onChange={(e) => handleUpdateMilestone(idx, 'payout', e.target.value)}
                      className="bg-transparent border-b border-white/[0.1] focus:border-[#38BDF8] text-xs font-bold text-white py-1 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* File Attachments Dropzone */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-[#38BDF8]" /> Encrypted Specs & Attachments (Optional)
            </label>
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  setDraftFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                }
              }}
              className={`uniswap-input-box p-4 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border-dashed ${
                isDragging ? 'border-[#38BDF8] bg-[#38BDF8]/10' : ''
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
                className="hidden" 
                id="file-upload-wizard" 
              />
              <label htmlFor="file-upload-wizard" className="cursor-pointer flex flex-col items-center gap-1">
                <Paperclip className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-300 font-medium">
                  Drop specification PDF/images here or <span className="text-[#38BDF8] underline">browse files</span>
                </span>
                <span className="text-[10px] text-slate-500">Files will be encrypted end-to-end via Pinata IPFS</span>
              </label>
            </div>

            {/* Selected file pills */}
            {draftFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {draftFiles.map((file, fIdx) => (
                  <span key={fIdx} className="bg-white/[0.05] border border-white/[0.08] text-xs text-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-2">
                    <Paperclip className="w-3 h-3 text-[#38BDF8]" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button 
                      onClick={() => setDraftFiles(prev => prev.filter((_, i) => i !== fIdx))}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Overview & Summary Card */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="uniswap-card p-5 flex flex-col gap-4 bg-[#131826]/70">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#38BDF8]" /> Summary & Escrow Terms
            </h3>

            <div className="flex flex-col gap-3 text-xs border-y border-white/[0.08] py-4">
              <div className="flex justify-between items-center text-slate-400">
                <span className="shrink-0">Total Milestones</span>
                <span className="font-bold text-white font-mono">{milestoneItems.length}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="shrink-0">Platform Fee (0.5%)</span>
                <span className="font-mono text-emerald-400 font-medium">{(totalBudget * 0.005).toFixed(2)} cUSDC</span>
              </div>
              <div className="bg-[#0B0E17]/60 p-3.5 rounded-2xl border border-white/[0.06] flex flex-col gap-1 mt-1">
                <span className="text-xs text-slate-400 font-medium">Total Budget Required</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-[#38BDF8] tracking-tight">
                    {totalBudget.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">cUSDC</span>
                </div>
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-rose-400 leading-relaxed font-medium bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                ⚠️ {validationError}
              </p>
            )}

            {deploymentIntent === 'freelancer' && isFormValid && (
              <button
                onClick={handleCopyProposalLink}
                className="w-full py-3 px-4 rounded-2xl bg-[#C084FC]/10 hover:bg-[#C084FC]/20 text-[#C084FC] border border-[#C084FC]/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> Invoice Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Invoice Proposal Link
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleDeployEscrow}
              disabled={isLoading || !isFormValid}
              className="btn-uniswap-primary w-full py-4 text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-1"
            >
              {isLoading ? (
                <span>Deploying On-Chain...</span>
              ) : deploymentIntent === 'client' ? (
                <>
                  Deploy & Lock Budget <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Deploy Proposal Contract <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
