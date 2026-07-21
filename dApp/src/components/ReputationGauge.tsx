import { useState, useEffect } from 'react';
import { Loader2, Award, Zap } from 'lucide-react';
import { ethers } from 'ethers';
import { getOnChainReputation } from '../services/escrowService';

interface ReputationGaugeProps {
  signer: ethers.JsonRpcSigner | null;
  reputationRegistryAddress: string;
  walletAddress: string | null;
  gatewayUrl: string;
  completedCount?: number;
  disputedCount?: number;
}

export function ReputationGauge({
  signer,
  reputationRegistryAddress,
  walletAddress,
  gatewayUrl,
  completedCount = 0,
  disputedCount = 0
}: ReputationGaugeProps) {
  const [onChainScore, setOnChainScore] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReputation() {
      if (!signer || !reputationRegistryAddress || !walletAddress) {
        setOnChainScore(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const score = await getOnChainReputation(
          signer,
          reputationRegistryAddress,
          walletAddress,
          gatewayUrl
        );
        setOnChainScore(score);
      } catch (err) {
        console.error("Failed to fetch on-chain reputation:", err);
        setError("Failed to load on-chain reputation");
      } finally {
        setIsLoading(false);
      }
    }

    fetchReputation();
  }, [signer, reputationRegistryAddress, walletAddress, gatewayUrl]);

  const displayScore = onChainScore !== null ? Number(onChainScore) : null;
  
  const clampedScore = displayScore !== null 
    ? Math.max(100, Math.min(999, displayScore))
    : Math.max(100, Math.min(999, 600 + (completedCount * 100) - (disputedCount * 150)));

  let rank = "Initiate Gatekeeper";
  let cert = "Bronze TEE Certified";
  let certBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/30";

  if (clampedScore >= 800) {
    rank = "Elite Overseer";
    cert = "Gold TEE Certified";
    certBadgeClass = "bg-yellow-500/10 text-yellow-300 border-yellow-500/30";
  } else if (clampedScore >= 650) {
    rank = "Senior Arbiter";
    cert = "Silver TEE Certified";
    certBadgeClass = "bg-slate-300/10 text-slate-200 border-slate-300/30";
  }

  const dashOffset = 351.8 - (351.8 * (clampedScore - 100)) / (999 - 100);

  return (
    <div className="uniswap-card p-6 flex flex-col gap-5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#38BDF8]" />
          <h3 className="font-bold text-white text-base">Reputation Matrix</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${certBadgeClass}`}>
          {cert}
        </span>
      </div>

      <div className="flex flex-col items-center py-2 relative">
        <svg className="w-36 h-36 transform -rotate-90">
          <defs>
            <linearGradient id="repGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
          </defs>
          <circle cx="72" cy="72" fill="transparent" r="56" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="8"></circle>
          <circle 
            cx="72" 
            cy="72" 
            fill="transparent" 
            r="56" 
            stroke="url(#repGradient)" 
            strokeWidth="8" 
            strokeDasharray="351.8" 
            strokeDashoffset={dashOffset} 
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          ></circle>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <Loader2 className="w-7 h-7 text-[#38BDF8] animate-spin" />
          ) : (
            <>
              <span className="font-bold text-3xl text-white">
                {displayScore !== null ? displayScore.toLocaleString() : clampedScore}
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                {displayScore !== null ? "On-Chain Score" : "Local Score"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-3 bg-[#131826]/70 border border-white/[0.06] rounded-2xl flex flex-col gap-1">
          <span className="text-slate-400">Rank</span>
          <span className="font-bold text-[#38BDF8]">{rank}</span>
        </div>
        <div className="p-3 bg-[#131826]/70 border border-white/[0.06] rounded-2xl flex flex-col gap-1">
          <span className="text-slate-400">Escrow Records</span>
          <span className="font-bold text-slate-200">{completedCount} done, {disputedCount} dispute</span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}

      <div className="flex items-start gap-2 text-xs text-slate-400 bg-[#131826]/40 p-3 rounded-xl border border-white/[0.04]">
        <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Reputation is computed zero-knowledge inside iExec TEE hardware enclaves. Gold cert grants a 0.2% fee reduction.
        </p>
      </div>
    </div>
  );
}
