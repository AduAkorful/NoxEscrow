import { X, Lock, AlertTriangle, ShieldCheck, Terminal, Unlock, Paperclip, Trash2, Activity, Play, Pause } from 'lucide-react';
import { type EscrowContract } from '../services/escrowService';
import { fetchAndDecryptFile, encryptText, decryptText } from '../crypto/fileUploader';
import { useState, useEffect, useRef } from 'react';
import { TEECourtroom } from './TEECourtroom';
import { supabase } from '../services/supabaseClient';

interface EscrowWorkspaceProps {
  selectedContract: EscrowContract;
  walletAddress: string | null;
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
  walletAddress,
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
  const [showDisputeConfirm, setShowDisputeConfirm] = useState(false);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [disputeConsentChecked, setDisputeConsentChecked] = useState(false);

  // --- Secure E2E Chat & Reviews States ---
  const [messages, setMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
  const [bothReviewsSubmitted, setBothReviewsSubmitted] = useState(false);
  const [decryptedReviews, setDecryptedReviews] = useState<{ reviewer: string; rating: number; text: string }[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chat Subscribe & Load
  useEffect(() => {
    if (!selectedContract.address || !selectedContract.milestoneKeys?.[0]) return;

    const chatKey = selectedContract.milestoneKeys[0];
    const escrowAddrClean = selectedContract.address.toLowerCase();

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('escrow_messages')
          .select('*')
          .eq('escrow_address', escrowAddrClean)
          .order('created_at', { ascending: true });

        if (error) {
          console.error("Error loading chat messages:", error);
          return;
        }

        if (data) {
          const decrypted = await Promise.all(data.map(async (msg: any) => {
            try {
              const plain = await decryptText(msg.ciphertext, chatKey, msg.iv);
              return {
                id: msg.id,
                sender: msg.sender_address,
                text: plain,
                time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
            } catch (decErr) {
              console.warn("Failed to decrypt message:", decErr);
              return {
                id: msg.id,
                sender: msg.sender_address,
                text: "🔒 [Decryption failed - mismatching keys]",
                time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
            }
          }));
          setMessages(decrypted);
        }
      } catch (err) {
        console.error("Failed to load/decrypt messages:", err);
      }
    };

    loadMessages();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel(`chat:${escrowAddrClean}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'escrow_messages',
          filter: `escrow_address=eq.${escrowAddrClean}`
        },
        async (payload) => {
          const newMsg = payload.new;
          try {
            const plain = await decryptText(newMsg.ciphertext, chatKey, newMsg.iv);
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                sender: newMsg.sender_address,
                text: plain,
                time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }];
            });
          } catch (decErr) {
            console.warn("Failed to decrypt realtime message:", decErr);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContract.address, selectedContract.milestoneKeys]);

  // Load reviews
  const loadReviews = async () => {
    if (!selectedContract.address || !selectedContract.milestoneKeys?.[0] || !walletAddress) return;
    const chatKey = selectedContract.milestoneKeys[0];
    const escrowAddrClean = selectedContract.address.toLowerCase();
    const milestoneIndex = selectedContract.milestonesCompleted;

    try {
      const { data, error } = await supabase
        .from('double_blind_reviews')
        .select('*')
        .eq('escrow_address', escrowAddrClean)
        .eq('milestone_index', milestoneIndex);

      if (error) {
        console.error("Error fetching reviews:", error);
        return;
      }

      if (data) {
        const userReviewed = data.some((r: any) => r.reviewer_address.toLowerCase() === walletAddress.toLowerCase());
        setHasSubmittedReview(userReviewed);

        const hasTwoReviews = data.length >= 2;
        const isOlderThan14Days = data.length > 0 && (Date.now() - new Date(data[0].created_at).getTime() > 14 * 24 * 60 * 60 * 1000);

        if (hasTwoReviews || isOlderThan14Days) {
          setBothReviewsSubmitted(true);
          const decrypted = await Promise.all(data.map(async (rev: any) => {
            try {
              const plain = await decryptText(rev.ciphertext, chatKey, rev.iv);
              const parsed = JSON.parse(plain);
              return {
                reviewer: rev.reviewer_address,
                rating: parsed.rating || 5,
                text: parsed.text || ""
              };
            } catch (decErr) {
              console.warn("Failed to decrypt review:", decErr);
              return {
                reviewer: rev.reviewer_address,
                rating: 5,
                text: "🔒 [Failed to decrypt review]"
              };
            }
          }));
          setDecryptedReviews(decrypted);
        } else {
          setBothReviewsSubmitted(false);
        }
      }
    } catch (err) {
      console.error("Error in loadReviews:", err);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [selectedContract.address, selectedContract.milestonesCompleted, walletAddress, selectedContract.milestoneKeys]);

  const handleSendMessage = async () => {
    const chatKey = selectedContract.milestoneKeys?.[0];
    if (!chatKey || !walletAddress || !newMessage.trim()) return;
    setIsSendingMessage(true);
    try {
      const encrypted = await encryptText(newMessage, chatKey);
      const { error } = await supabase
        .from('escrow_messages')
        .insert({
          escrow_address: selectedContract.address.toLowerCase(),
          sender_address: walletAddress.toLowerCase(),
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv
        });
      if (error) throw error;
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send encrypted message:", err);
      alert("Error sending E2E encrypted message. Please try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSubmitReview = async () => {
    const chatKey = selectedContract.milestoneKeys?.[0];
    if (!chatKey || !walletAddress || !reviewText.trim()) return;
    setIsSubmittingReview(true);
    try {
      const payload = JSON.stringify({ rating: reviewRating, text: reviewText });
      const encrypted = await encryptText(payload, chatKey);
      
      const { error } = await supabase
        .from('double_blind_reviews')
        .insert({
          escrow_address: selectedContract.address.toLowerCase(),
          milestone_index: selectedContract.milestonesCompleted,
          reviewer_address: walletAddress.toLowerCase(),
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv
        });

      if (error) throw error;

      setReviewText("");
      setHasSubmittedReview(true);
      await loadReviews();
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Error submitting review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamedAmount(prev => prev + 0.000025);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!selectedContract.activeMilestoneSubmitted || !selectedContract.activeMilestoneSubmissionTime || !selectedContract.reviewWindow) {
      setTimeLeft(null);
      return;
    }

    const submissionTime = selectedContract.activeMilestoneSubmissionTime; // in seconds
    const reviewWindow = selectedContract.reviewWindow; // in seconds
    const expiryTimeMs = (submissionTime + reviewWindow) * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const difference = expiryTimeMs - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [
    selectedContract.activeMilestoneSubmitted,
    selectedContract.activeMilestoneSubmissionTime,
    selectedContract.reviewWindow
  ]);

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
                {timeLeft && (
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
                        {timeLeft.isExpired ? 'Auto-Release Window Expired' : 'Auto-Release Review Countdown'}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {timeLeft.isExpired ? 'Freelancer may trigger release' : 'Auto-release pending'}
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
                )}

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
                        onClick={() => setShowReleaseConfirm(true)}
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

      {/* Workspace Collaboration Section (Step 3.1 & 3.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Secure E2E Chat Box */}
        <div className="border border-white/5 bg-white/[0.01] p-6 rounded-xl flex flex-col gap-4 hover:border-white/10 transition-smooth">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F2FE] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F2FE]"></span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#00F2FE] font-bold">
                Private End-to-End Chat
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#00F2FE]" /> AES-GCM ENCRYPTED
            </span>
          </div>

          {/* Chat message display area */}
          <div className="bg-[#020308] border border-white/5 p-4 rounded-xl flex flex-col gap-3 min-h-[220px] max-h-[220px] overflow-y-auto custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <Lock className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">No previous E2E chat found.</span>
                <span className="font-sans text-[11px] text-slate-600 mt-1 max-w-[280px]">Your messages are encrypted client-side using derived PBKDF2 wallet keys. Only you and your counterparty can read them.</span>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.sender.toLowerCase() === walletAddress?.toLowerCase();
                return (
                  <div key={idx} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[8px] text-[#00F2FE] font-bold uppercase tracking-wider">
                        {isMe ? 'Me' : `${msg.sender.slice(0, 6)}...${msg.sender.slice(-4)}`}
                      </span>
                      <span className="text-[8px] text-slate-600 font-mono">{msg.time}</span>
                    </div>
                    <div className={`px-4 py-2.5 text-xs font-sans rounded-2xl ${
                      isMe 
                        ? 'bg-[#7F00FF]/10 text-[#E0AAFF] border border-[#7F00FF]/20 rounded-tr-none' 
                        : 'bg-white/[0.02] text-slate-200 border border-white/5 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Send message input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your secure message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
              className="flex-1 bg-[#05070F] border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:border-[#00F2FE]/40 focus:outline-none transition-smooth"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSendingMessage}
              className="px-6 py-3 bg-[#00F2FE] text-[#05070F] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-smooth hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSendingMessage ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        {/* Double-Blind Written Reviews */}
        <div className="border border-white/5 bg-white/[0.01] p-6 rounded-xl flex flex-col gap-4 hover:border-white/10 transition-smooth">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]"></span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                Double-Blind Written Reviews
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-amber-400" /> PREVENTING RETALIATION
            </span>
          </div>

          {/* Existing Reviews List / Status */}
          {hasSubmittedReview ? (
            <div className="bg-[#020308] border border-white/5 p-4 rounded-xl flex flex-col gap-3 flex-1 justify-center min-h-[220px]">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                <Lock className="w-3.5 h-3.5" />
                <span>Your Double-Blind feedback has been submitted!</span>
              </div>
              {bothReviewsSubmitted ? (
                <div className="space-y-4 border-t border-white/5 pt-3 mt-1 overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
                  {decryptedReviews.map((rev, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5 font-mono text-[10px]">
                      <div className="flex justify-between text-slate-400 border-b border-white/5 pb-1 mb-1">
                        <span>REVIEWER: {rev.reviewer.slice(0, 6)}...{rev.reviewer.slice(-4)}</span>
                        <span className="text-amber-400 font-bold">RATING: {rev.rating}★</span>
                      </div>
                      <p className="text-xs text-slate-200 font-sans leading-relaxed">{rev.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-amber-950/15 border border-amber-500/20 rounded-xl text-amber-400 font-sans text-xs leading-relaxed">
                  Waiting for the other party to submit their review. All reviews will remain E2E-encrypted and completely hidden until both counterparties submit, preventing retaliatory reviewing patterns.
                </div>
              )}
            </div>
          ) : (
            /* Review Submission Form */
            <div className="flex flex-col gap-3 flex-1 justify-between min-h-[220px]">
              <div>
                <p className="text-xs text-slate-400 font-sans leading-normal mb-3">
                  Submit honest rating feedback for this milestone escrow. Written feedback remains E2E-encrypted and will only be revealed once both parties have submitted.
                </p>
                <div className="flex items-center gap-2 mb-3.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`w-9 h-9 border font-mono text-xs rounded-xl transition-smooth cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${
                        reviewRating === star 
                          ? 'bg-amber-400 text-[#05070F] font-extrabold border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                          : 'border-white/5 text-slate-400 hover:text-white bg-[#05070F] hover:border-white/20'
                      }`}
                    >
                      {star}★
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Write your E2E encrypted double-blind written review here..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full bg-[#05070F] border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:border-amber-400/40 focus:outline-none transition-smooth resize-none"
                />
              </div>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !reviewText.trim()}
                className="w-full py-3 bg-amber-400 text-[#05070F] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-smooth hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmittingReview ? "Encrypting & Submitting..." : "Submit Double-Blind Review"}
              </button>
            </div>
          )}
        </div>
      </div>

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

      {/* Dispute Confirmation Modal */}
      {showDisputeConfirm && (
        <div className="fixed inset-0 bg-[#05070F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-red-500/20 max-w-md w-full p-6 rounded-2xl flex flex-col gap-5 shadow-[0_0_50px_rgba(255,23,68,0.15)] animate-slide-up font-sans">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="font-mono text-xs font-extrabold tracking-widest text-red-400 uppercase">INITIATE_TEE_ARBITRATION_PROTOCOL</span>
              </div>
              <button 
                onClick={() => { setShowDisputeConfirm(false); setDisputeConsentChecked(false); }}
                className="text-slate-400 hover:text-white transition-smooth bg-transparent border-transparent border cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>You are about to raise a formal dispute on **Milestone {selectedContract.milestonesCompleted + 1}**. Please review the protocol actions that will trigger immediately:</p>
              <ul className="list-disc pl-4 space-y-1.5 font-mono text-[10px] text-slate-400">
                <li><strong className="text-white">ON-CHAIN FREEZE</strong>: Milestone payout will be locked securely.</li>
                <li><strong className="text-white">TEE INITIALIZATION</strong>: AMD SEV/Intel SGX isolated sandbox spins up.</li>
                <li><strong className="text-white">AI DECISION</strong>: Google Gemini decrypts deliverables and makes a deterministic ruling.</li>
                <li><strong className="text-white">REPUTATION PENALTY</strong>: The losing party incurs a severe -500 NERM rating drop.</li>
              </ul>
            </div>
            <label className="flex items-start gap-3 bg-red-950/10 border border-red-900/20 p-3 rounded-xl cursor-pointer hover:bg-red-950/15 transition-smooth">
              <input 
                type="checkbox" 
                checked={disputeConsentChecked}
                onChange={(e) => setDisputeConsentChecked(e.target.checked)}
                className="mt-0.5 accent-red-500 cursor-pointer w-4 h-4"
              />
              <span className="text-[10px] text-red-300 font-sans leading-normal">
                I understand that TEE AI Arbitration is binding, permanent, on-chain, and irreversible.
              </span>
            </label>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => { setShowDisputeConfirm(false); setDisputeConsentChecked(false); }}
                className="flex-1 py-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl font-mono text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-smooth cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!disputeConsentChecked}
                onClick={() => {
                  setShowDisputeConfirm(false);
                  setDisputeConsentChecked(false);
                  handleRaiseDispute();
                }}
                className="flex-1 py-3 bg-red-500 text-white hover:bg-red-600 rounded-xl font-mono text-[10px] uppercase font-bold transition-smooth cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(255,23,68,0.4)]"
              >
                Raise Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Payout Confirmation Modal */}
      {showReleaseConfirm && (
        <div className="fixed inset-0 bg-[#05070F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-[#00F2FE]/20 max-w-md w-full p-6 rounded-2xl flex flex-col gap-5 shadow-[0_0_50px_rgba(0,242,254,0.15)] animate-slide-up font-sans">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Unlock className="w-5 h-5 text-[#00F2FE]" />
                <span className="font-mono text-xs font-extrabold tracking-widest text-[#00F2FE] uppercase">RELEASE_ESCROW_PAYOUT_CONFIRMATION</span>
              </div>
              <button 
                onClick={() => setShowReleaseConfirm(false)}
                className="text-slate-400 hover:text-white transition-smooth bg-transparent border-transparent border cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>You are about to authorize an irreversible payout release of <strong className="text-[#00F2FE] font-mono">{milestoneBudget.toLocaleString()} cUSDC</strong> for **Milestone {selectedContract.milestonesCompleted + 1}**.</p>
              <p>The funds will be transferred instantly from the secure escrow contract directly to the freelancer's wallet address.</p>
              <p>Your quality satisfaction rating of <strong className="text-amber-400 font-mono">{ratingInput}★</strong> will be finalized and recorded on-chain, dynamically increasing the freelancer's NERM reputation rating.</p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowReleaseConfirm(false)}
                className="flex-1 py-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl font-mono text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-smooth cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowReleaseConfirm(false);
                  handleReleaseMilestone();
                }}
                className="flex-1 py-3 bg-[#00F2FE] text-[#05070F] hover:bg-[#33F5FF] rounded-xl font-mono text-[10px] uppercase font-bold transition-smooth cursor-pointer hover:shadow-[0_0_15px_rgba(0,242,254,0.4)]"
              >
                Release Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
