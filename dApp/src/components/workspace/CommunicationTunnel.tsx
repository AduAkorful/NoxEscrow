import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

interface CommunicationTunnelProps {
  chatKey: string | null;
  walletAddress: string | null;
  messages: { id: string; sender: string; text: string; time: string }[];
  newMessage: string;
  setNewMessage: (val: string) => void;
  isSendingMessage: boolean;
  handleSendMessage: () => Promise<void>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  hasSubmittedReview: boolean;
  bothReviewsSubmitted: boolean;
  decryptedReviews: { reviewer: string; rating: number; text: string }[];
  reviewRating: number;
  setReviewRating: (val: number) => void;
  reviewText: string;
  setReviewText: (val: string) => void;
  isSubmittingReview: boolean;
  handleSubmitReview: () => Promise<void>;
}

export function CommunicationTunnel({
  chatKey,
  walletAddress,
  messages,
  newMessage,
  setNewMessage,
  isSendingMessage,
  handleSendMessage,
  chatContainerRef,
  hasSubmittedReview,
  bothReviewsSubmitted,
  decryptedReviews,
  reviewRating,
  setReviewRating,
  reviewText,
  setReviewText,
  isSubmittingReview,
  handleSubmitReview
}: CommunicationTunnelProps) {
  return (
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
        <div 
          ref={chatContainerRef} 
          className="bg-[#020308] border border-white/5 p-4 rounded-xl flex flex-col gap-3 min-h-[220px] max-h-[220px] overflow-y-auto custom-scrollbar"
        >
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
            disabled={!newMessage.trim() || isSendingMessage || !chatKey}
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
              disabled={isSubmittingReview || !reviewText.trim() || !chatKey}
              className="w-full py-3 bg-amber-400 text-[#05070F] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-smooth hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmittingReview ? "Encrypting & Submitting..." : "Submit Double-Blind Review"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
