import { useState, useEffect, useCallback } from 'react';
import { 
  Coins, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Wallet,
  Lock,
  ArrowUpDown
} from 'lucide-react';
import { ethers } from 'ethers';
import { 
  approvePublicUSDC, 
  checkPublicUSDCAllowance, 
  getPublicUSDCBalance, 
  wrapToken,
  unwrapToken,
  getConfidentialUSDCBalance
} from '../services/escrowService';

interface TokenWrapperProps {
  walletAddress: string;
  cUSDCAddress: string;
  publicUSDCAddress: string;
  gatewayUrl: string;
  getWeb3Signer: () => Promise<ethers.JsonRpcSigner>;
}

export function TokenWrapper({
  walletAddress,
  cUSDCAddress,
  publicUSDCAddress,
  gatewayUrl,
  getWeb3Signer
}: TokenWrapperProps) {
  // --- Component States ---
  const [swapDirection, setSwapDirection] = useState<'wrap' | 'unwrap'>('wrap');
  const [publicBalance, setPublicBalance] = useState<bigint>(0n);
  const [cUSDCBalance, setCUSDCBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [swapAmount, setSwapAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Fetch All Balances ---
  const fetchBalances = useCallback(async (showLoadingFeedback = false) => {
    if (!walletAddress || !publicUSDCAddress || !cUSDCAddress) return;
    
    if (showLoadingFeedback) setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const signer = await getWeb3Signer();
      
      const [pubBal, confidentialBal, currentAllowance] = await Promise.all([
        getPublicUSDCBalance(signer, publicUSDCAddress, walletAddress),
        getConfidentialUSDCBalance(signer, cUSDCAddress, walletAddress, gatewayUrl),
        checkPublicUSDCAllowance(signer, publicUSDCAddress, cUSDCAddress, walletAddress)
      ]);

      setPublicBalance(pubBal);
      setCUSDCBalance(confidentialBal);
      setAllowance(currentAllowance);
    } catch (err: any) {
      console.error("Failed to query wrapper balances:", err);
      setErrorMessage(err.message || "Failed to retrieve standard public USDC or cUSDC balances.");
    } finally {
      if (showLoadingFeedback) setIsRefreshing(false);
    }
  }, [walletAddress, publicUSDCAddress, cUSDCAddress, gatewayUrl, getWeb3Signer]);

  // Initial load
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // --- Execute Approval ---
  const handleApprove = async (amountToApprove: bigint) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const signer = await getWeb3Signer();
      await approvePublicUSDC(signer, publicUSDCAddress, cUSDCAddress, amountToApprove);
      
      setSuccessMessage("✔️ Public USDC approval successfully confirmed on-chain!");
      await fetchBalances();
    } catch (err: any) {
      setErrorMessage(err.message || "Approval transaction reverted.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Execute Wrapping ---
  const handleWrap = async (amountToWrap: bigint) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const signer = await getWeb3Signer();
      await wrapToken(signer, cUSDCAddress, walletAddress, amountToWrap);
      
      setSuccessMessage("🎉 Swap completed! Standard public USDC wrapped to confidential cUSDC.");
      setSwapAmount("");
      await fetchBalances();
    } catch (err: any) {
      setErrorMessage(err.message || "Wrapping transaction reverted.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Execute Unwrapping ---
  const handleUnwrap = async (amountToUnwrap: bigint) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const signer = await getWeb3Signer();
      await unwrapToken(signer, cUSDCAddress, walletAddress, amountToUnwrap, gatewayUrl);
      
      setSuccessMessage("🎉 Swap completed! Confidential cUSDC successfully unwrapped to standard public USDC.");
      setSwapAmount("");
      await fetchBalances();
    } catch (err: any) {
      setErrorMessage(err.message || "Unwrapping transaction reverted.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Toggle Swap Direction ---
  const handleToggleDirection = () => {
    setSwapDirection(prev => prev === 'wrap' ? 'unwrap' : 'wrap');
    setSwapAmount("");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // --- Process Action Button Click ---
  const executeSwap = async () => {
    if (!swapAmount || isNaN(Number(swapAmount)) || Number(swapAmount) <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0.");
      return;
    }

    const decimalAmount = BigInt(Math.floor(Number(swapAmount)));
    
    if (swapDirection === 'wrap') {
      if (decimalAmount > publicBalance) {
        setErrorMessage("Insufficient standard public USDC balance.");
        return;
      }

      if (decimalAmount > allowance) {
        // Step 1: Approve
        await handleApprove(decimalAmount);
      } else {
        // Step 2: Wrap
        await handleWrap(decimalAmount);
      }
    } else {
      // Unwrap path
      if (decimalAmount > cUSDCBalance) {
        setErrorMessage("Insufficient confidential cUSDC balance.");
        return;
      }

      await handleUnwrap(decimalAmount);
    }
  };

  const isApproved = swapAmount && !isNaN(Number(swapAmount)) && Number(swapAmount) > 0 
    ? BigInt(Math.floor(Number(swapAmount))) <= allowance 
    : true;

  return (
    <div className="bento-card p-6 md:p-8 flex flex-col gap-6 w-full animate-slide-up">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00F2FE]/5 border border-[#00F2FE]/20 flex items-center justify-center">
            <Coins className="w-4 h-4 text-[#00F2FE] drop-shadow-[0_0_8px_rgba(0,242,254,0.3)]" />
          </div>
          <h2 className="font-mono text-sm tracking-widest text-slate-200 font-bold uppercase">
            CONFIDENTIAL_TOKEN_WRAPPER
          </h2>
        </div>
        <button 
          onClick={() => fetchBalances(true)}
          disabled={isRefreshing || isLoading}
          className="w-8 h-8 rounded-lg border border-white/5 hover:border-[#00F2FE]/40 flex items-center justify-center text-slate-400 hover:text-[#00F2FE] transition-smooth cursor-pointer hover:bg-[#00F2FE]/5 disabled:opacity-45"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#00F2FE]" : ""}`} />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed font-sans">
        {swapDirection === 'wrap' 
          ? "Swap your standard public USDC for confidential cUSDC. Wrapping shields your volumes, token balances, and transactions under iExec Nox's zero-knowledge computational layer."
          : "Swap your confidential cUSDC back into standard public USDC. Unwrapping releases your locked public stablecoin tokens back into your standard wallet."
        }
      </p>

      {/* Notification panel */}
      {(errorMessage || successMessage) && (
        <div className="space-y-2">
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-[#FF1744] flex items-center gap-3 font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs text-[#00E676] flex items-center gap-3 font-mono">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Input Swap Grid */}
      <div className="flex flex-col gap-4 relative">
        {swapDirection === 'wrap' ? (
          <>
            {/* Box A: Public USDC */}
            <div className="bg-[#05070F] border border-white/5 p-4.5 rounded-xl flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-slate-500" /> From: public USDC (Standard)
                </span>
                <span className="font-mono text-[9px] text-slate-400 flex items-center gap-1">
                  Balance: <span className="text-slate-200 font-bold">{publicBalance.toLocaleString()}</span>
                  <button 
                    onClick={() => setSwapAmount(publicBalance.toString())}
                    className="ml-1 text-[8px] uppercase tracking-wider text-[#00F2FE] hover:underline bg-transparent border-0 cursor-pointer font-extrabold"
                  >
                    [Max]
                  </button>
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <input 
                  type="number" 
                  placeholder="0.0" 
                  value={swapAmount} 
                  onChange={(e) => setSwapAmount(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent border-0 text-lg font-mono font-bold text-slate-100 focus:outline-none w-full p-0"
                />
                <span className="font-mono text-[10px] text-slate-400 bg-white/5 px-2.5 py-1 rounded border border-white/5">USDC</span>
              </div>
            </div>

            {/* Arrow Divider / Direction Switcher */}
            <button 
              onClick={handleToggleDirection}
              disabled={isLoading}
              className="absolute left-[calc(50%-18px)] top-[calc(50%-18px)] w-9 h-9 rounded-full bg-[#05070F] border border-white/5 hover:border-[#00F2FE]/40 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(0,0,0,0.4)] transition-smooth hover:scale-105 active:scale-95 cursor-pointer hover:bg-[#00F2FE]/5"
            >
              <ArrowUpDown className="w-4 h-4 text-[#00F2FE]" />
            </button>

            {/* Box B: Confidential cUSDC */}
            <div className="bg-[#05070F] border border-[#7F00FF]/10 p-4.5 rounded-xl flex flex-col gap-2.5 shadow-[0_0_15px_rgba(127,0,255,0.01)] hover:border-[#7F00FF]/25 transition-smooth">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-500" /> To: confidential cUSDC (Nox)
                </span>
                <span className="font-mono text-[9px] text-purple-400">
                  Shielded: <span className="text-[#00F2FE] font-bold text-shadow-[#7F00FF]">{cUSDCBalance.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="font-mono text-lg font-bold text-slate-300">
                  {swapAmount && !isNaN(Number(swapAmount)) && Number(swapAmount) > 0 ? Number(swapAmount).toLocaleString() : "0.0"}
                </span>
                <span className="font-mono text-[10px] text-purple-400 bg-purple-950/10 px-2.5 py-1 rounded border border-[#7F00FF]/20 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00F2FE]" /> cUSDC
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Box A: Confidential cUSDC (From) */}
            <div className="bg-[#05070F] border border-[#7F00FF]/15 p-4.5 rounded-xl flex flex-col gap-2.5 shadow-[0_0_15px_rgba(127,0,255,0.01)] hover:border-[#7F00FF]/30 transition-smooth">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-500" /> From: confidential cUSDC (Nox)
                </span>
                <span className="font-mono text-[9px] text-purple-400 flex items-center gap-1">
                  Shielded: <span className="text-[#00F2FE] font-bold text-shadow-[#7F00FF]">{cUSDCBalance.toLocaleString()}</span>
                  <button 
                    onClick={() => setSwapAmount(cUSDCBalance.toString())}
                    className="ml-1 text-[8px] uppercase tracking-wider text-[#00F2FE] hover:underline bg-transparent border-0 cursor-pointer font-extrabold font-mono"
                  >
                    [Max]
                  </button>
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <input 
                  type="number" 
                  placeholder="0.0" 
                  value={swapAmount} 
                  onChange={(e) => setSwapAmount(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent border-0 text-lg font-mono font-bold text-slate-100 focus:outline-none w-full p-0"
                />
                <span className="font-mono text-[10px] text-purple-400 bg-purple-950/10 px-2.5 py-1 rounded border border-[#7F00FF]/20 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00F2FE]" /> cUSDC
                </span>
              </div>
            </div>

            {/* Arrow Divider / Direction Switcher */}
            <button 
              onClick={handleToggleDirection}
              disabled={isLoading}
              className="absolute left-[calc(50%-18px)] top-[calc(50%-18px)] w-9 h-9 rounded-full bg-[#05070F] border border-white/5 hover:border-[#00F2FE]/40 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(0,0,0,0.4)] transition-smooth hover:scale-105 active:scale-95 cursor-pointer hover:bg-[#00F2FE]/5"
            >
              <ArrowUpDown className="w-4 h-4 text-[#00F2FE]" />
            </button>

            {/* Box B: Public USDC (To) */}
            <div className="bg-[#05070F] border border-white/5 p-4.5 rounded-xl flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-slate-500" /> To: public USDC (Standard)
                </span>
                <span className="font-mono text-[9px] text-slate-400">
                  Balance: <span className="text-slate-200 font-bold">{publicBalance.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="font-mono text-lg font-bold text-slate-300">
                  {swapAmount && !isNaN(Number(swapAmount)) && Number(swapAmount) > 0 ? Number(swapAmount).toLocaleString() : "0.0"}
                </span>
                <span className="font-mono text-[10px] text-slate-400 bg-white/5 px-2.5 py-1 rounded border border-white/5">USDC</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Allowance / Gas info */}
      <div className="bg-[#05070F]/50 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
        {swapDirection === 'wrap' ? (
          <>
            <div className="flex justify-between items-center text-[10px] font-mono leading-none text-slate-400">
              <span>USDC Contract Allowance:</span>
              <span className="text-slate-200">{allowance.toLocaleString()} USDC</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono leading-none text-slate-400">
              <span>Active Swap Pathway:</span>
              <span className={isApproved ? "text-[#00E676]" : "text-[#7F00FF]"}>
                {isApproved ? "DIRECT_WRAP" : "REQUIRES_USDC_APPROVAL_FIRST"}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center text-[10px] font-mono leading-none text-slate-400">
            <span>Active Swap Pathway:</span>
            <span className="text-[#00E676]">
              DIRECT_UNWRAP (2-STEP ON-CHAIN SHIELDED EXIT)
            </span>
          </div>
        )}
      </div>

      {/* Swap Actions Row */}
      <div className="flex flex-col gap-4">
        {/* Core Swap Button */}
        <button
          onClick={executeSwap}
          disabled={isLoading || !swapAmount || Number(swapAmount) <= 0}
          className="w-full py-4.5 bg-[#00F2FE] text-[#05070F] font-mono text-xs font-bold uppercase tracking-widest transition-smooth hover:shadow-[0_0_20px_rgba(0,242,254,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 rounded-xl border border-transparent"
        >
          <ArrowUpDown className="w-4 h-4" />
          {isLoading 
            ? "Broadcasting..." 
            : swapDirection === 'wrap' 
              ? (isApproved ? "Wrap to cUSDC" : "Approve & Wrap")
              : "Unwrap to USDC"
          }
        </button>
      </div>
    </div>
  );
}
