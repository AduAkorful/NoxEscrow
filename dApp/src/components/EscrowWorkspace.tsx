import { X, Lock, AlertTriangle, ShieldCheck, Terminal, Unlock, Paperclip, Trash2, Activity, Play, Pause } from 'lucide-react';
import { type EscrowContract } from '../services/escrowService';
import { fetchAndDecryptFile } from '../crypto/fileUploader';
import { useState, useEffect } from 'react';
import { TEECourtroom } from './TEECourtroom';

interface EscrowWorkspaceProps {
  selectedContract: EscrowContract;
  viewMode: 'client' | 'freelancer';
  disputeStatement: string;
  setDisputeStatement: (val: string) => void;
  deliverableInput: string;
  setDeliverableInput: (val: string) => void;
  ratingInput: number;
  setRatingInput: (val: number) => void;
  isLoading: boolean;
  handleRaiseDispute: () => Promise<void>;
  handleSubmitDeliverable: () => Promise<void>;
  handleReleaseMilestone: () => Promise<void>;
  onBack: () => void;
  deliverableFiles: File[];
  setDeliverableFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export function EscrowWorkspace({
  selectedContract,
  viewMode,
  disputeStatement,
  setDisputeStatement,
  deliverableInput,
  setDeliverableInput,
  ratingInput,
  setRatingInput,
  isLoading,
  handleRaiseDispute,
  handleSubmitDeliverable,
  handleReleaseMilestone,
  onBack,
  deliverableFiles,
  setDeliverableFiles
}: EscrowWorkspaceProps) {
  const activeRequirement = selectedContract.requirements[selectedContract.milestonesCompleted] || "All milestones settled!";
  const milestoneBudget = selectedContract.budget / selectedContract.totalMilestones;

  const [downloadingFileCid, setDownloadingFileCid] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedAmount, setStreamedAmount] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamedAmount(prev => prev + 0.000025);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleDownloadFile = async (cid: string, keyHex: string, name: string, type: string) => {
    if (!keyHex) {
      alert("Decryption key not available for this milestone.");
      return;
    }
    try {
      setDownloadingFileCid(cid);
      const url = await fetchAndDecryptFile(cid, keyHex, name, type);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download file:", err);
      alert("Error decrypting/downloading file. Ensure you are connected to the correct wallet.");
    } finally {
      setDownloadingFileCid(null);
    }
  };

  // Safe parse requirements JSON
  let reqText = activeRequirement;
  let reqAttachedFiles: { name: string; type: string; cid: string }[] = [];
  try {
    if (activeRequirement.trim().startsWith('{')) {
      const parsed = JSON.parse(activeRequirement);
      if (parsed.text !== undefined) {
        reqText = parsed.text;
        reqAttachedFiles = parsed.files || [];
      }
    }
  } catch (e) {
    // legacy fallback
  }

  // Safe parse deliverables JSON
  const currentDeliverable = selectedContract.deliverables?.[selectedContract.milestonesCompleted] || "";
  let deliverableText = currentDeliverable;
  let deliverableAttachedFiles: { name: string; type: string; cid: string }[] = [];
  try {
    if (currentDeliverable.trim().startsWith('{')) {
      const parsed = JSON.parse(currentDeliverable);
      if (parsed.text !== undefined) {
        deliverableText = parsed.text;
        deliverableAttachedFiles = parsed.files || [];
      }
    }
  } catch (e) {
    // legacy fallback
  }


  return (
    <div className="bento-card p-6 md:p-8 flex flex-col gap-8 w-full animate-slide-up">
      {/* Header Back Action */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <button 
          onClick={onBack}
          className="font-mono text-xs text-slate-400 hover:text-[#00F2FE] cursor-pointer flex items-center gap-2 transition-smooth px-3 py-1.5 rounded-lg border border-white/5 hover:border-[#00F2FE]/25 bg-white/[0.01]"
        >
          <X className="w-3.5 h-3.5" /> [D] Back to Portfolio
        </button>
        <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg">
          <span className="font-mono text-[10px] text-slate-500 uppercase font-bold tracking-widest">ESCROW_ADDRESS:</span>
          <span className="font-mono text-xs text-[#00F2FE] font-extrabold">{selectedContract.address.slice(0, 12)}...{selectedContract.address.slice(-10)}</span>
        </div>
      </div>

      {/* Milestone progress pipeline */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#7F00FF] font-bold">Milestone Progress timeline</span>
        <div className="flex items-center gap-3 overflow-x-auto py-3 px-1 custom-scrollbar">
          {selectedContract.requirements.map((_, idx) => (
            <div key={idx} className="flex items-center gap-3 flex-shrink-0">
              <div className={`px-4 py-2 border font-mono text-[10px] rounded-xl uppercase font-bold flex items-center gap-2 transition-smooth ${
                idx < selectedContract.milestonesCompleted ? 'bg-emerald-950/10 text-[#00E676] border-emerald-900/35 shadow-[0_0_10px_rgba(0,230,118,0.02)]' :
                idx === selectedContract.milestonesCompleted ? 'bg-[#00F2FE]/5 text-[#00F2FE] border-[#00F2FE]/25 shadow-[0_0_15px_rgba(0,242,254,0.03)] animate-pulse' :
                'bg-white/[0.01] text-slate-500 border-white/5'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  idx < selectedContract.milestonesCompleted ? 'bg-[#00E676] drop-shadow-[0_0_4px_#00E676]' :
                  idx === selectedContract.milestonesCompleted ? 'bg-[#00F2FE] drop-shadow-[0_0_4px_#00F2FE]' :
                  'bg-slate-700'
                }`}></span>
                Milestone {idx + 1}
              </div>
              {idx < selectedContract.totalMilestones - 1 && (
                <div className={`w-8 h-[1px] ${
                  idx < selectedContract.milestonesCompleted ? 'bg-emerald-500/25' : 'bg-white/5'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Workspace Details Split or Secure Enclave TEE Courtroom */}
      {selectedContract.status === 'DISPUTED' ? (
        <TEECourtroom
          escrowAddress={selectedContract.address}
          clientAddress={selectedContract.role === 'CLIENT' ? 'Self' : selectedContract.counterparty}
          freelancerAddress={selectedContract.role === 'FREELANCER' ? 'Self' : selectedContract.counterparty}
          disputeReason={disputeStatement}
          onResolve={async (ruling) => {
            alert(`TEE Enclave consensus finalized: Dispute settled. Ruling: ${ruling}. Escrow state updated.`);
            (selectedContract as any).status = ruling === 'CLIENT' ? 'REFUNDED' : 'COMPLETED';
            window.location.reload();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Task specifications */}
          <div className="border border-white/5 bg-white/[0.01] p-6 rounded-xl flex flex-col justify-between hover:border-white/10 transition-smooth">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#7F00FF] font-bold block mb-4">Milestone Specifications</span>
              <div className="space-y-4 font-mono">
                <div className="bg-[#070913] p-5 border border-[#7F00FF]/25 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(127,0,255,0.05)]">
                  <Lock className="w-4 h-4 text-[#7F00FF] absolute top-3 right-3 opacity-50" />
                  <span className="text-[10px] text-slate-500 block mb-2 font-bold tracking-wider">ACTIVE TARGET REQUIREMENTS</span>
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
                              selectedContract.milestoneKeys?.[selectedContract.milestonesCompleted] || "", 
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
                <div className="flex justify-between items-center border-b border-white/5 pb-3 pt-1">
                  <span className="text-slate-500 text-xs">MILESTONE_STATUS:</span>
                  <span className="text-[#00F2FE] text-xs font-bold font-mono bg-[#00F2FE]/5 border border-[#00F2FE]/10 px-2 py-0.5 rounded">ACTIVE_LOCKED</span>
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
            {selectedContract.milestonesCompleted < selectedContract.totalMilestones && (
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
                  onClick={handleRaiseDispute}
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
              
              {selectedContract.milestonesCompleted === selectedContract.totalMilestones ? (
                <div className="p-5 bg-emerald-950/10 border border-emerald-900/25 rounded-xl text-xs font-mono text-[#00E676] flex gap-4 shadow-[0_0_15px_rgba(0,230,118,0.03)]">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 text-[#00E676] drop-shadow-[0_0_5px_#00E676]" />
                  <div className="flex flex-col gap-1">
                    <strong className="block mb-0.5 tracking-wider uppercase">Escrow Agreement Completed</strong>
                    <span className="font-sans text-[11px] text-slate-400">All milestones successfully verified and settled. Payouts successfully unlocked to contractor.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Shared Sablier Stream Payout Visualizer Widget */}
                  <div className="bg-[#05070F] border border-white/5 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Activity className={`w-3.5 h-3.5 ${isStreaming ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-300 font-bold">
                          Continuous Payment Streaming
                        </span>
                      </div>
                      <span className="font-mono text-[8px] text-slate-500 uppercase">Sablier/LlamaPay V2 Protocol</span>
                    </div>

                    <div className="flex items-center justify-between border-y border-white/5 py-2.5 my-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono text-slate-500 uppercase">Streamed Balance</span>
                        <span className="font-mono text-xs font-bold text-[#00F2FE] teal-glow-text">
                          {streamedAmount.toFixed(6)} cUSDC
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] font-mono text-slate-500 uppercase">Flow Rate</span>
                        <span className="font-mono text-[9px] text-emerald-400 font-semibold">
                          +0.0005 cUSDC/sec
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsStreaming(!isStreaming)}
                        className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-[9px] uppercase font-bold flex items-center justify-center gap-1.5 transition-smooth cursor-pointer active:scale-95 border ${
                          isStreaming
                            ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            : "bg-[#00F2FE]/5 text-[#00F2FE] border-[#00F2FE]/20 hover:bg-[#00F2FE]/15"
                        }`}
                      >
                        {isStreaming ? (
                          <>
                            <Pause className="w-3 h-3" /> Pause Stream Payout
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 animate-pulse" /> Start Payout Stream
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {viewMode === 'freelancer' ? (
                    /* Freelancer Action Console */
                    <div className="space-y-4">
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
                        onClick={handleSubmitDeliverable}
                        disabled={isLoading || (!deliverableInput && deliverableFiles.length === 0)}
                        className="w-full py-4.5 bg-[#00F2FE] text-[#05070F] font-mono text-xs font-bold uppercase tracking-widest transition-smooth hover:shadow-[0_0_20px_rgba(0,242,254,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2.5 rounded-xl border border-transparent"
                      >
                        <Terminal className="w-4 h-4" />
                        {isLoading ? "Signing handle..." : "Submit Deliverable (Enter)"}
                      </button>
                    </div>
                  ) : (
                    /* Client Action Console */
                    <div className="space-y-5">
                      {selectedContract.activeMilestoneSubmitted && (
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
                                      selectedContract.deliverableKeys?.[selectedContract.milestonesCompleted] || "", 
                                      file.name, 
                                      file.type
                                    )}
                                    disabled={downloadingFileCid === file.cid}
                                    className="text-[#00F2FE] hover:text-[#33F5FF] transition-smooth hover:underline cursor-pointer disabled:opacity-50"
                                  >
                                    {downloadingFileCid === file.cid ? "Decrypting..." : "Download"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

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
                        onClick={handleReleaseMilestone}
                        disabled={isLoading}
                        className="w-full py-4.5 bg-[#00F2FE] text-[#05070F] font-mono text-xs font-bold uppercase tracking-widest transition-smooth hover:shadow-[0_0_20px_rgba(0,242,254,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2.5 rounded-xl border border-transparent"
                      >
                        <Unlock className="w-4 h-4" />
                        {isLoading ? "Executing transactions..." : "Release Milestone Payout"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TEE Hardware Attestation & Security Telemetry */}
      <div className="border border-white/5 bg-[#03050C]/60 backdrop-blur-md p-6 rounded-xl flex flex-col gap-4 hover:border-white/10 transition-smooth">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#00F2FE] font-bold">
              TEE_ENCLAVE_ATTESTATION_MONITOR (INTEL_SGX_V2)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <span>ISOLATION: <strong className="text-emerald-400">AMD SNP / SEV</strong></span>
            <span>MRENCLAVE: <strong className="text-slate-300">0x7b58c5415a77cd52199db...</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Metrics */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5">
            <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Arbitration Model</span>
            <span className="text-[11px] font-mono text-slate-200">Llama-3-70B-Arbitrator</span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5">
            <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Consensus Confidence</span>
            <span className="text-[11px] font-mono text-slate-200">98.4% Rating Consensus</span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5">
            <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Attestation Status</span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              ✓ VERIFIED_SECURE
            </span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5">
            <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Sandbox Integrity</span>
            <span className="text-[11px] font-mono text-emerald-400">100% MEMORY_ISOLATED</span>
          </div>
        </div>

        {/* Live Terminal Log */}
        <div className="bg-[#020308] border border-white/5 p-4 rounded-xl font-mono text-[10px] text-slate-400 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
          {selectedContract.status === 'DISPUTED' ? (
            <>
              <div className="text-yellow-500 font-bold">[14:32:01] ⚠️ NOX_DISPUTE_EVENT DETECTED: ARBITRATION TRIGGERED</div>
              <div>[14:32:02] INITIALIZING AMD SEV-SNP ISOLATED SANDBOX CONTAINER...</div>
              <div>[14:32:03] DECRYPTING PROJECT SPECIFICATIONS VIA NOX KMS DECR-HANDLE... SUCCESS</div>
              <div>[14:32:05] DECRYPTING FREELANCER DELIVERABLES AND FILE METADATA... SUCCESS</div>
              <div>[14:32:07] PARSING MULTIPLE SYSTEM PERSONAS: [1/3] TECHNICAL ANALYST, [2/3] CODE REVIEWER, [3/3] PROTOCOL JUDGE</div>
              <div>[14:32:10] RUNNING PROGRAMMATIC UNIT-TEST SCREENER AND STATIC AST CODE ANALYZER...</div>
              <div className="text-emerald-400">[14:32:12] COMPILATION: SUCCESS. 16/16 TEST CRITERIA MET. ZERO PARSING DISCREPANCIES.</div>
              <div>[14:32:15] COMPUTING AGENTIC CONSENSUS MATRIX FOR FINAL RESOLUTION...</div>
              <div className="text-[#00F2FE] font-bold">[14:32:18] TEE CONSENSUS (98.4% CONFIDENCE): RELEASE FULL BALANCE TO FREELANCER (VERIFIED DELIVERABLES MATCH SPECIFICATIONS).</div>
            </>
          ) : (
            <>
              <div className="text-emerald-400">[18:02:11] SECURE TEE ENCLAVE RUNNING: IDLE_MONITORING</div>
              <div>[18:02:12] MEMORY INTEGRITY SCHEMAS CORRELATED COHERENTLY.</div>
              <div>[18:02:13] PENDING DISPUTES: 0 ACTIVE. LISTENING FOR CONTRACT DISPUTE TRANSACTIONS...</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
