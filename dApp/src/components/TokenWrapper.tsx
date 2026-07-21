import { useState, useEffect, useCallback } from 'react';
import { 
  Coins, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  ArrowDown,
  Sparkles,
  Info
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
  walletAddress: string | null;
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
    if (!walletAddress) return;
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
    if (!walletAddress) return;
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
        await handleApprove(decimalAmount);
      } else {
        await handleWrap(decimalAmount);
      }
    } else {
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
    <div className="uniswap-card p-6 md:p-8 flex flex-col gap-6 w-full max-w-lg mx-auto relative overflow-hidden animate-scale-in">
      
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center border border-[#38BDF8]/20">
            <Coins className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <span className="font-bold text-[#F8FAFC] text-base">
            {swapDirection === 'wrap' ? 'Shielded Wrap' : 'Unshield USDC'}
          </span>
        </div>
        <button 
          onClick={() => fetchBalances(true)}
          disabled={isRefreshing || isLoading}
          title="Refresh balances"
          className="p-2 rounded-xl bg-[#131826] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#38BDF8]" : ""}`} />
        </button>
      </div>

      {/* Alerts */}
      {(errorMessage || successMessage) && (
        <div className="space-y-2">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Uniswap Swap Input Blocks Container */}
      <div className="flex flex-col gap-2 relative">
        
        {/* INPUT BOX 1: FROM */}
        <div className="uniswap-input-box p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-medium">You pay</span>
            <div className="flex items-center gap-1.5">
              <span>Balance: {swapDirection === 'wrap' ? publicBalance.toLocaleString() : cUSDCBalance.toLocaleString()}</span>
              <button 
                onClick={() => setSwapAmount(swapDirection === 'wrap' ? publicBalance.toString() : cUSDCBalance.toString())}
                className="text-[10px] font-bold text-[#38BDF8] hover:text-[#818CF8] bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
              >
                MAX
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <input 
              type="number" 
              placeholder="0" 
              value={swapAmount} 
              onChange={(e) => setSwapAmount(e.target.value)}
              disabled={isLoading}
              className="bg-transparent border-0 text-3xl font-bold text-white focus:outline-none w-full p-0 placeholder-slate-600"
            />
            
            {/* Token Badge */}
            <div className="flex items-center gap-2 bg-[#131826] border border-white/[0.1] px-3 py-2 rounded-2xl shadow-sm shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                swapDirection === 'wrap' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
              }`}>
                {swapDirection === 'wrap' ? '$' : '🔒'}
              </div>
              <span className="font-bold text-sm text-white">
                {swapDirection === 'wrap' ? 'USDC' : 'cUSDC'}
              </span>
            </div>
          </div>
        </div>

        {/* Direction Swap Button */}
        <div className="flex justify-center -my-3 z-10">
          <button 
            onClick={handleToggleDirection}
            disabled={isLoading}
            className="w-10 h-10 rounded-2xl bg-[#131826] border border-white/[0.12] hover:border-[#38BDF8]/50 text-slate-300 hover:text-[#38BDF8] flex items-center justify-center shadow-lg transition-all hover:rotate-180 duration-300 cursor-pointer active:scale-95"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        {/* INPUT BOX 2: TO */}
        <div className="uniswap-input-box p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-medium">You receive</span>
            <span>Balance: {swapDirection === 'wrap' ? cUSDCBalance.toLocaleString() : publicBalance.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-3xl font-bold text-slate-200">
              {swapAmount && !isNaN(Number(swapAmount)) && Number(swapAmount) > 0 ? Number(swapAmount).toLocaleString() : "0"}
            </span>
            
            {/* Token Badge */}
            <div className="flex items-center gap-2 bg-[#131826] border border-white/[0.1] px-3 py-2 rounded-2xl shadow-sm shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                swapDirection === 'wrap' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
              }`}>
                {swapDirection === 'wrap' ? '🔒' : '$'}
              </div>
              <span className="font-bold text-sm text-white">
                {swapDirection === 'wrap' ? 'cUSDC' : 'USDC'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Info Pill */}
      <div className="bg-[#131826]/60 border border-white/[0.06] p-3.5 rounded-2xl flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#38BDF8]" />
            Privacy Mode
          </span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> ZK-Shielded (iExec TEE)
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Allowance</span>
          <span className="font-mono text-slate-200">{allowance.toLocaleString()} USDC</span>
        </div>
      </div>

      {/* Primary Swap CTA Button */}
      <button
        onClick={executeSwap}
        disabled={isLoading || !swapAmount || Number(swapAmount) <= 0}
        className="btn-uniswap-primary w-full py-4 text-base flex items-center justify-center gap-2 cursor-pointer shadow-xl"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Broadcasting Transaction...
          </>
        ) : swapDirection === 'wrap' ? (
          isApproved ? 'Wrap to cUSDC' : 'Approve & Wrap USDC'
        ) : (
          'Unwrap to Public USDC'
        )}
      </button>

    </div>
  );
}
