import { X, Lock, AlertTriangle, Unlock, Paperclip } from 'lucide-react';
import { type EscrowContract, decryptMilestoneChatKey } from '../services/escrowService';
import { NoxEscrowContractABI } from '../contracts/NoxEscrowContract';
import { fetchAndDecryptFile, encryptText, decryptText } from '../crypto/fileUploader';
import { useState, useEffect, useRef, useCallback } from 'react';
import { TEECourtroom } from './TEECourtroom';
import { supabase } from '../services/supabaseClient';
import { getEscrowDisputeRecord, type EscrowDisputeRecord } from '../services/metadataService';
import { ethers } from 'ethers';

// Subcomponents
import { MilestoneProgress } from './workspace/MilestoneProgress';
import { SigningWorkspace } from './workspace/SigningWorkspace';
import { ActiveWorkspace } from './workspace/ActiveWorkspace';
import { CommunicationTunnel } from './workspace/CommunicationTunnel';
import { TelemetryAttestation } from './workspace/TelemetryAttestation';

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
  handleMutualCancel?: (address?: string) => Promise<void>;
  handleInitializeDeployedEscrow?: (
    escrowAddress: string,
    payouts: number[],
    requirements: string[],
    title: string,
    files: File[]
  ) => Promise<void>;
  onBack: () => void;
  deliverableFiles: File[];
  setDeliverableFiles: React.Dispatch<React.SetStateAction<File[]>>;
  vaultKey?: string | null;
  onDeriveKey?: () => void;
  getWeb3Signer?: () => Promise<ethers.JsonRpcSigner>;
  gatewayUrl?: string;
  loadOnChainContracts?: (allowInteractiveDecrypt: boolean) => Promise<void>;
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
  handleMutualCancel,
  handleInitializeDeployedEscrow,
  onBack,
  deliverableFiles,
  setDeliverableFiles,
  vaultKey,
  onDeriveKey,
  getWeb3Signer,
  gatewayUrl,
  loadOnChainContracts
}: EscrowWorkspaceProps) {
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState(() => {
    return selectedContract.milestonesCompleted < selectedContract.totalMilestones 
      ? selectedContract.milestonesCompleted 
      : selectedContract.totalMilestones - 1;
  });

  const activeRequirement = selectedContract.requirements[selectedMilestoneIndex] || "All milestones settled!";
  const milestoneBudget = selectedContract.budget / selectedContract.totalMilestones;

  // --- Deployed SIGNING Setup / Recovery states ---
  const [resumeTitle, setResumeTitle] = useState(selectedContract.title || "Confidential Escrow Agreement");
  const [resumeMilestones, setResumeMilestones] = useState(() => {
    const items = [];
    for (let i = 0; i < selectedContract.totalMilestones; i++) {
      items.push({ payout: "", requirements: "" });
    }
    return items;
  });
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [isInitializingDeployed, setIsInitializingDeployed] = useState(false);

  const [downloadingFileCid, setDownloadingFileCid] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
  const [disputeRecord, setDisputeRecord] = useState<EscrowDisputeRecord | null>(null);

  // Fetch live Gemini TEE dispute evaluation record from Supabase
  useEffect(() => {
    if (!selectedContract.address) return;
    const fetchDispute = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;
      if (supabaseUrl && supabaseKey) {
        const rec = await getEscrowDisputeRecord(
          supabaseUrl,
          supabaseKey,
          selectedContract.address,
          selectedContract.milestonesCompleted
        );
        if (rec) setDisputeRecord(rec);
      }
    };

    fetchDispute();
    const interval = setInterval(fetchDispute, 5000);
    return () => clearInterval(interval);
  }, [selectedContract.address, selectedContract.milestonesCompleted, selectedContract.status]);

  // Poll on-chain status to auto-refresh when dispute is settled
  useEffect(() => {
    if (!selectedContract.address || selectedContract.status !== 'DISPUTED' || !getWeb3Signer) return;

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const signer = await getWeb3Signer();
        const escrow = new ethers.Contract(selectedContract.address, NoxEscrowContractABI, signer);
        const onChainStatus = await escrow.status();
        const statusNames: EscrowContract['status'][] = ['SIGNING', 'ACTIVE', 'DISPUTED', 'COMPLETED', 'REFUNDED'];
        const currentOnChainStatus = statusNames[Number(onChainStatus)] || 'ACTIVE';

        if (!cancelled && currentOnChainStatus !== 'DISPUTED') {
          console.log(`⚖️ Dispute resolved on-chain to status: ${currentOnChainStatus}. Reloading contracts...`);
          if (loadOnChainContracts) {
            await loadOnChainContracts(true);
          } else {
            window.location.reload();
          }
        }
      } catch (err) {
        console.warn("Dispute status poll failed:", err);
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedContract.address, selectedContract.status, getWeb3Signer, loadOnChainContracts]);

  // Lazy chat key: derived on-demand from on-chain handle
  const [chatKey, setChatKey] = useState<string | null>(null);
  const [, setIsChatKeyDeriving] = useState(false);
  const chatKeyDerivedRef = useRef(false);

  // Reset key caches when selected contract address changes to prevent key carryover leak
  useEffect(() => {
    chatKeyDerivedRef.current = false;
    setChatKey(null);
  }, [selectedContract.address]);

  // Derive chat key lazily when vaultKey is unlocked (once per workspace open)
  useEffect(() => {
    if (chatKeyDerivedRef.current || !vaultKey || !getWeb3Signer || !selectedContract.address) return;
    // If we already have a milestoneKey from the contract, use it directly
    const existingKey = selectedContract.milestoneKeys?.[0];
    if (existingKey) {
      setChatKey(existingKey);
      chatKeyDerivedRef.current = true;
      return;
    }
    // Otherwise, lazily decrypt the milestone 0 handle
    let cancelled = false;
    const deriveChatKey = async () => {
      setIsChatKeyDeriving(true);
      try {
        const signer = await getWeb3Signer();
        const key = await decryptMilestoneChatKey(signer, selectedContract.address, 0, gatewayUrl);
        if (!cancelled) {
          setChatKey(key);
          chatKeyDerivedRef.current = true;
        }
      } catch (err) {
        console.warn("Failed to derive chat key:", err);
      } finally {
        if (!cancelled) setIsChatKeyDeriving(false);
      }
    };
    deriveChatKey();
    return () => { cancelled = true; };
  }, [vaultKey, getWeb3Signer, selectedContract.address, selectedContract.milestoneKeys, gatewayUrl]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Chat Subscribe, Load & High-Frequency Sync
  useEffect(() => {
    if (!selectedContract.address || !chatKey) return;
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

          setMessages(prev => {
            // Retain any pending optimistic temporary messages
            const pendingTemps = prev.filter(m => m.id.startsWith('temp-'));
            const fetchedIds = new Set(decrypted.map(d => d.id));
            const uniqueTemps = pendingTemps.filter(t => !fetchedIds.has(t.id));
            return [...decrypted, ...uniqueTemps];
          });
        }
      } catch (err) {
        console.error("Failed to load/decrypt messages:", err);
      }
    };

    loadMessages();

    // 1. Subscribe to realtime inserts
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
              const cleanPrev = prev.filter(m => !m.id.startsWith('temp-'));
              return [...cleanPrev, {
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

    // 2. High-frequency 3-second background polling loop for instant cross-party sync
    const pollInterval = setInterval(loadMessages, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [selectedContract.address, chatKey]);

  // Load reviews
  const loadReviews = useCallback(async () => {
    if (!selectedContract.address || !chatKey || !walletAddress) return;
    const escrowAddrClean = selectedContract.address.toLowerCase();
    const milestoneIndex = selectedMilestoneIndex;

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
  }, [selectedContract.address, chatKey, walletAddress, selectedMilestoneIndex]);

  // Double-Blind Review Auto-Polling
  useEffect(() => {
    loadReviews();
    const reviewInterval = setInterval(loadReviews, 4000);
    return () => clearInterval(reviewInterval);
  }, [loadReviews]);

  // Optimistic Chat Send Handler
  const handleSendMessage = async () => {
    if (!chatKey || !walletAddress || !newMessage.trim()) return;
    setIsSendingMessage(true);
    const textToSend = newMessage.trim();
    setNewMessage(""); // Clear input field instantly

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const optimisticMsg = {
      id: tempId,
      sender: walletAddress.toLowerCase(),
      text: textToSend,
      time: timeStr
    };

    // 1. Immediately render sent message in local chat box (0ms latency for sender)
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const encrypted = await encryptText(textToSend, chatKey);
      const { data, error } = await supabase
        .from('escrow_messages')
        .insert({
          escrow_address: selectedContract.address.toLowerCase(),
          sender_address: walletAddress.toLowerCase(),
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const realId = data[0].id;
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: realId } : m));
      }
    } catch (err) {
      console.error("Failed to send encrypted message:", err);
      alert("Error sending E2E encrypted message. Please try again.");
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(textToSend);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSubmitReview = async () => {
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
  } catch {
    // legacy fallback
  }

  // Safe parse deliverables JSON
  const currentDeliverable = selectedContract.deliverables?.[selectedMilestoneIndex] || "";
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
  } catch {
    // legacy fallback
  }

  return (
    <div className="bento-card p-6 md:p-8 flex flex-col gap-8 w-full animate-slide-up">
      {/* Key Locked Notice Banner */}
      {!vaultKey && (
        <div className="uniswap-card p-4 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-300">Vault Key Locked</h4>
              <p className="text-[11px] text-amber-200/80">
                Please click <span className="font-bold underline cursor-pointer text-amber-300" onClick={onDeriveKey}>"Unlock Vault Key"</span> in the top header menu to decrypt contract deliverables and execute actions.
              </p>
            </div>
          </div>
          {onDeriveKey && (
            <button 
              onClick={onDeriveKey}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0B0E17] font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              Unlock Vault Key
            </button>
          )}
        </div>
      )}

      {/* Header Back Action & Top Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-4">
        <button 
          onClick={onBack}
          className="font-mono text-xs text-slate-400 hover:text-[#00F2FE] cursor-pointer flex items-center gap-2 transition-smooth px-3 py-1.5 rounded-lg border border-white/5 hover:border-[#00F2FE]/25 bg-white/[0.01]"
        >
          <X className="w-3.5 h-3.5" /> [D] Back to Portfolio
        </button>

        <div className="flex items-center gap-2">
          {/* Export Receipt */}
          <button
            onClick={() => {
              const receiptData = {
                protocol: "NoxEscrow Confidential Escrow v2.0",
                contractAddress: selectedContract.address,
                counterpartyAddress: selectedContract.counterparty,
                role: selectedContract.role,
                status: selectedContract.status,
                totalBudget: `${selectedContract.budget} cUSDC`,
                milestonesCompleted: `${selectedContract.milestonesCompleted} of ${selectedContract.totalMilestones}`,
                exportedAt: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `NoxEscrow_Receipt_${selectedContract.address.slice(0, 8)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Paperclip className="w-3.5 h-3.5 text-[#38BDF8]" /> Export Receipt
          </button>

          {/* Request Mutual Cancellation */}
          {selectedContract.status === 'ACTIVE' && handleMutualCancel && (
            <button
              onClick={() => handleMutualCancel(selectedContract.address)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-mono text-rose-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Mutual Cancel & Refund
            </button>
          )}

          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg">
            <span className="font-mono text-[10px] text-slate-500 uppercase font-bold tracking-widest">ESCROW_ADDRESS:</span>
            <span className="font-mono text-xs text-[#00F2FE] font-extrabold">{selectedContract.address.slice(0, 10)}...{selectedContract.address.slice(-6)}</span>
          </div>
        </div>
      </div>

      {/* Milestone progress pipeline */}
      <MilestoneProgress 
        selectedContract={selectedContract}
        selectedMilestoneIndex={selectedMilestoneIndex}
        setSelectedMilestoneIndex={setSelectedMilestoneIndex}
      />

      {/* Workspace Details Split or Secure Enclave TEE Courtroom */}
      {selectedContract.status === 'SIGNING' ? (
        <SigningWorkspace 
          selectedContract={selectedContract}
          viewMode={viewMode}
          resumeTitle={resumeTitle}
          setResumeTitle={setResumeTitle}
          resumeMilestones={resumeMilestones}
          setResumeMilestones={setResumeMilestones}
          resumeFiles={resumeFiles}
          setResumeFiles={setResumeFiles}
          isInitializingDeployed={isInitializingDeployed}
          setIsInitializingDeployed={setIsInitializingDeployed}
          handleInitializeDeployedEscrow={handleInitializeDeployedEscrow}
        />
      ) : selectedContract.status === 'DISPUTED' ? (
        <TEECourtroom
          escrowAddress={selectedContract.address}
          clientAddress={selectedContract.role === 'CLIENT' ? 'Self' : selectedContract.counterparty}
          freelancerAddress={selectedContract.role === 'FREELANCER' ? 'Self' : selectedContract.counterparty}
          disputeReason={disputeStatement}
          disputeRecord={disputeRecord}
          milestoneIndex={selectedContract.milestonesCompleted}
          simulationMode={import.meta.env.DEV}
          onResolve={async (ruling) => {
            alert(`TEE Enclave consensus finalized: Dispute settled. Ruling: ${ruling}. Escrow state updated.`);
            (selectedContract as any).status = ruling === 'CLIENT' ? 'REFUNDED' : 'COMPLETED';
            window.location.reload();
          }}
        />
      ) : (
        <ActiveWorkspace 
          selectedContract={selectedContract}
          selectedMilestoneIndex={selectedMilestoneIndex}
          viewMode={viewMode}
          walletAddress={walletAddress}
          timeLeft={timeLeft}
          reqText={reqText}
          reqAttachedFiles={reqAttachedFiles}
          handleDownloadFile={handleDownloadFile}
          downloadingFileCid={downloadingFileCid}
          disputeStatement={disputeStatement}
          setDisputeStatement={setDisputeStatement}
          setShowDisputeConfirm={setShowDisputeConfirm}
          isLoading={isLoading}
          deliverableInput={deliverableInput}
          setDeliverableInput={setDeliverableInput}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          deliverableFiles={deliverableFiles}
          setDeliverableFiles={setDeliverableFiles}
          handleSubmitDeliverable={handleSubmitDeliverable}
          deliverableText={deliverableText}
          deliverableAttachedFiles={deliverableAttachedFiles}
          ratingInput={ratingInput}
          setRatingInput={setRatingInput}
          setShowReleaseConfirm={setShowReleaseConfirm}
          milestoneBudget={milestoneBudget}
        />
      )}

      {/* Workspace Collaboration Section */}
      {selectedContract.status !== 'SIGNING' && selectedContract.status !== 'DISPUTED' && (
        <CommunicationTunnel 
          chatKey={chatKey}
          walletAddress={walletAddress}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          isSendingMessage={isSendingMessage}
          handleSendMessage={handleSendMessage}
          chatContainerRef={chatContainerRef}
          hasSubmittedReview={hasSubmittedReview}
          bothReviewsSubmitted={bothReviewsSubmitted}
          decryptedReviews={decryptedReviews}
          reviewRating={reviewRating}
          setReviewRating={setReviewRating}
          reviewText={reviewText}
          setReviewText={setReviewText}
          isSubmittingReview={isSubmittingReview}
          handleSubmitReview={handleSubmitReview}
        />
      )}

      {/* TEE Hardware Attestation & Security Telemetry */}
      {selectedContract.status !== 'SIGNING' && (
        <TelemetryAttestation 
          selectedContract={selectedContract}
          disputeRecord={disputeRecord}
        />
      )}

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
