import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowDownUp, 
  Lock, 
  Coins, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Info,
  Eye
} from 'lucide-react';
import { ethers } from 'ethers';
import { 
  getPublicUSDCBalance, 
  getConfidentialUSDCBalance, 
  checkPublicUSDCAllowance, 
  approvePublicUSDC, 
  wrapToken, 
  unwrapToken 
} from '../services/escrowService';
import { TransactionStepper, type StepItem } from './TransactionStepper';

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
  const [mode, setMode] = useState<'wrap' | 'unwrap'>('wrap');
  const [swapAmount, setSwapAmount] = useState('');
  
  // Standard 6 decimals for both public USDC and confidential cUSDC wrapper
  const USDC_DECIMALS = 6;

  // Balances
  const [publicBalance, setPublicBalance] = useState<bigint>(0n);
  const [cUSDCBalance, setCUSDCBalance] = useState<bigint>(0n);
  const [isConfidentialRevealed, setIsConfidentialRevealed] = useState(false);
  const [isDecryptingBalance, setIsDecryptingBalance] = useState(false);
  const [allowance, setAllowance] = useState<bigint>(0n);

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stepper State
  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [stepperTitle, setStepperTitle] = useState("SHIELDED_SWAP_PIPELINE");
  const [stepperSteps, setStepperSteps] = useState<StepItem[]>([]);
  const [stepperSubtext, setStepperSubtext] = useState("");

  // Non-blocking public balance query (0 wallet popups on page mount)
  const fetchPublicBalances = useCallback(async (showLoadingFeedback: boolean = false) => {
    if (!walletAddress) return;
    if (showLoadingFeedback) setIsRefreshing(true);

    try {
      const signer = await getWeb3Signer();
      const [pubBal, currentAllowance] = await Promise.all([
        getPublicUSDCBalance(signer, publicUSDCAddress, walletAddress),
        checkPublicUSDCAllowance(signer, publicUSDCAddress, cUSDCAddress, walletAddress)
      ]);

      setPublicBalance(pubBal);
      setAllowance(currentAllowance);
    } catch (err: any) {
      console.error("Failed to query wrapper balances:", err);
      setErrorMessage(err.message || "Failed to retrieve standard public USDC balances.");
    } finally {
      if (showLoadingFeedback) setIsRefreshing(false);
    }
  }, [walletAddress, publicUSDCAddress, cUSDCAddress, getWeb3Signer]);

  // On-demand KMS decryption for confidential cUSDC balance
  const revealConfidentialBalance = useCallback(async () => {
    if (!walletAddress) return;
    setIsDecryptingBalance(true);
    setErrorMessage(null);

    try {
      const signer = await getWeb3Signer();
      const confidentialBal = await getConfidentialUSDCBalance(signer, cUSDCAddress, walletAddress, gatewayUrl);
      setCUSDCBalance(confidentialBal);
      setIsConfidentialRevealed(true);
    } catch (err: any) {
      console.error("Failed to decrypt confidential balance:", err);
      setErrorMessage(err.message || "Failed to decrypt confidential cUSDC balance.");
    } finally {
      setIsDecryptingBalance(false);
    }
  }, [walletAddress, cUSDCAddress, gatewayUrl, getWeb3Signer]);

  // Initial load on page mount (0 signature popups!)
  useEffect(() => {
    fetchPublicBalances();
  }, [fetchPublicBalances]);

  // --- Execute Approval ---
  const handleApprove = async (amountToApprove: bigint) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    setIsStepperOpen(true);
    setStepperTitle("USDC_ALLOWANCE_PIPELINE");
    setStepperSubtext("Authorize the public USDC allowance in your Web3 wallet.");
    setStepperSteps([
      { label: "Public USDC ERC-20 Approval (On-Chain Gas)", status: "active" }
    ]);

    try {
      const signer = await getWeb3Signer();
      await approvePublicUSDC(signer, publicUSDCAddress, cUSDCAddress, amountToApprove);
      
      setStepperSteps([
        { label: "Public USDC ERC-20 Approval (On-Chain Gas)", status: "completed" }
      ]);
      setSuccessMessage("✔️ Public USDC approval successfully confirmed on-chain!");
      await fetchPublicBalances();
    } catch (err: any) {
      setErrorMessage(err.message || "Approval transaction reverted.");
    } finally {
      setIsLoading(false);
      setIsStepperOpen(false);
    }
  };

  // --- Execute Wrapping ---
  const handleWrap = async (amountToWrap: bigint) => {
    if (!walletAddress) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    setIsStepperOpen(true);
    setStepperTitle("SHIELDED_WRAP_PIPELINE");
    setStepperSubtext("1) On-chain Wrap transaction locks public USDC. 2) DataAccessAuthorization grants your wallet decryption access.");
    setStepperSteps([
      { label: "On-Chain Shielded Wrap Transaction (Gas)", status: "active" },
      { label: "Balance Decryption Authorization (Gasless Signature)", status: "pending" }
    ]);

    try {
      const signer = await getWeb3Signer();
      await wrapToken(signer, cUSDCAddress, walletAddress, amountToWrap);
      
      setStepperSteps([
        { label: "On-Chain Shielded Wrap Transaction (Gas)", status: "completed" },
        { label: "Balance Decryption Authorization (Gasless Signature)", status: "active" }
      ]);

      setSuccessMessage("🎉 Swap completed! Standard public USDC wrapped to confidential cUSDC.");
      setSwapAmount("");
      await fetchPublicBalances();
      await revealConfidentialBalance();
      setStepperSteps([
        { label: "On-Chain Shielded Wrap Transaction (Gas)", status: "completed" },
        { label: "Balance Decryption Authorization (Gasless Signature)", status: "completed" }
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || "Wrapping transaction reverted.");
    } finally {
      setIsLoading(false);
      setIsStepperOpen(false);
    }
  };

  // --- Execute Unwrapping ---
  const handleUnwrap = async (amountToUnwrap: bigint) => {
    if (!walletAddress) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    setIsStepperOpen(true);
    setStepperTitle("SHIELDED_UNWRAP_PIPELINE");
    setStepperSubtext("1) KMS Input Encryption. 2) Burn cUSDC. 3) KMS Public Decryption. 4) Claim Public USDC.");
    setStepperSteps([
      { label: "Input Encryption Authorization (Gasless Signature)", status: "active" },
      { label: "On-Chain Unwrap Initiation (Gas)", status: "pending" },
      { label: "KMS Decryption Proof Generation", status: "pending" },
      { label: "Finalize Unwrap & Receive USDC (Gas)", status: "pending" }
    ]);

    try {
      const signer = await getWeb3Signer();
      await unwrapToken(signer, cUSDCAddress, walletAddress, amountToUnwrap, gatewayUrl);
      
      setStepperSteps([
        { label: "Input Encryption Authorization (Gasless Signature)", status: "completed" },
        { label: "On-Chain Unwrap Initiation (Gas)", status: "completed" },
        { label: "KMS Decryption Proof Generation", status: "completed" },
        { label: "Finalize Unwrap & Receive USDC (Gas)", status: "completed" }
      ]);

      setSuccessMessage("🎉 Swap completed! Confidential cUSDC successfully unwrapped to standard public USDC.");
      setSwapAmount("");
      await fetchPublicBalances();
      await revealConfidentialBalance();
    } catch (err: any) {
      setErrorMessage(err.message || "Unwrapping transaction reverted.");
    } finally {
      setIsLoading(false);
      setIsStepperOpen(false);
    }
  };

  // --- Toggle Swap Direction ---
  const toggleMode = () => {
    setMode(prev => (prev === 'wrap' ? 'unwrap' : 'wrap'));
    setSwapAmount('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const isWrap = mode === 'wrap';
  const parsedAmount = swapAmount ? ethers.parseUnits(swapAmount, USDC_DECIMALS) : 0n;

  const needsApproval = isWrap && parsedAmount > 0n && allowance < parsedAmount;
  const hasInsufficientBalance = isWrap && parsedAmount > 0n && parsedAmount > publicBalance;

  return (
    <div className="uniswap-card p-6 md:p-8 w-full max-w-xl mx-auto flex flex-col gap-6 relative overflow-hidden animate-scale-in">
      
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center">
            <Coins className="w-4.5 h-4.5 text-[#38BDF8]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
              Shielded Token Swap
            </h3>
            <p className="text-xs text-slate-400">
              Convert public USDC ↔ confidential zero-knowledge cUSDC.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchPublicBalances(true)}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          title="Refresh balances"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#38BDF8]' : ''}`} />
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Input Box 1: Paying */}
      <div className="uniswap-input-box p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">You Pay</span>
          <span className="text-slate-400 font-mono flex items-center gap-1.5">
            Balance: {isWrap ? (
              `${ethers.formatUnits(publicBalance, USDC_DECIMALS)} USDC`
            ) : isConfidentialRevealed ? (
              `${ethers.formatUnits(cUSDCBalance, USDC_DECIMALS)} cUSDC`
            ) : (
              <button
                onClick={revealConfidentialBalance}
                disabled={isDecryptingBalance}
                className="text-[#38BDF8] hover:underline flex items-center gap-1 font-sans cursor-pointer"
              >
                <Eye className="w-3 h-3" /> {isDecryptingBalance ? 'Decrypting...' : '🔒 Decrypt cUSDC'}
              </button>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <input
            type="number"
            placeholder="0.0"
            value={swapAmount}
            onChange={(e) => setSwapAmount(e.target.value)}
            className="bg-transparent text-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none w-full font-mono"
          />

          <div className="flex items-center gap-2">
            {isWrap && publicBalance > 0n && (
              <button
                onClick={() => setSwapAmount(ethers.formatUnits(publicBalance, USDC_DECIMALS))}
                className="px-2.5 py-1 rounded-lg bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] text-[11px] font-bold cursor-pointer transition-colors"
              >
                MAX
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-[#131826] border border-white/[0.08] px-3 py-1.5 rounded-2xl shrink-0">
              {isWrap ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="text-xs font-bold text-white">USDC</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-white">cUSDC</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher Button */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={toggleMode}
          className="w-10 h-10 rounded-2xl bg-[#131826] hover:bg-[#1C2333] border border-white/[0.1] text-slate-300 hover:text-[#38BDF8] flex items-center justify-center transition-all cursor-pointer shadow-lg hover:rotate-180 duration-300"
          title="Switch swap direction"
        >
          <ArrowDownUp className="w-4 h-4" />
        </button>
      </div>

      {/* Input Box 2: Receiving */}
      <div className="uniswap-input-box p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">You Receive</span>
          <span className="text-slate-400 font-mono flex items-center gap-1.5">
            Balance: {!isWrap ? (
              `${ethers.formatUnits(publicBalance, USDC_DECIMALS)} USDC`
            ) : isConfidentialRevealed ? (
              `${ethers.formatUnits(cUSDCBalance, USDC_DECIMALS)} cUSDC`
            ) : (
              <button
                onClick={revealConfidentialBalance}
                disabled={isDecryptingBalance}
                className="text-[#38BDF8] hover:underline flex items-center gap-1 font-sans cursor-pointer"
              >
                <Eye className="w-3 h-3" /> {isDecryptingBalance ? 'Decrypting...' : '🔒 Decrypt cUSDC'}
              </button>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            readOnly
            placeholder="0.0"
            value={swapAmount}
            className="bg-transparent text-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none w-full font-mono cursor-not-allowed"
          />

          <div className="flex items-center gap-1.5 bg-[#131826] border border-white/[0.08] px-3 py-1.5 rounded-2xl shrink-0">
            {isWrap ? (
              <>
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-white">cUSDC</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-xs font-bold text-white">USDC</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="bg-[#131826]/60 p-3.5 rounded-2xl border border-white/[0.06] flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
        <span>
          {isWrap 
            ? "1) Approval (Gas), 2) On-chain Wrap (Gas), 3) DataAccessAuthorization Signature (Gasless) to unlock confidential cUSDC." 
            : "KMS handles unwrap requests zero-knowledge. 2 gasless signatures + 2 contract transactions required."}
        </span>
      </div>

      {/* Action CTA Buttons */}
      {!walletAddress ? (
        <button
          disabled
          className="btn-uniswap-primary w-full py-4 text-sm opacity-50 cursor-not-allowed"
        >
          Connect Web3 Wallet to Swap
        </button>
      ) : hasInsufficientBalance ? (
        <button
          disabled
          className="w-full py-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-sm font-bold opacity-60 cursor-not-allowed"
        >
          Insufficient Public USDC Balance
        </button>
      ) : needsApproval ? (
        <button
          onClick={() => handleApprove(parsedAmount)}
          disabled={isLoading}
          className="btn-uniswap-primary w-full py-4 text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? 'Approving Public USDC...' : `Approve ${swapAmount} USDC`}
        </button>
      ) : (
        <button
          onClick={() => (isWrap ? handleWrap(parsedAmount) : handleUnwrap(parsedAmount))}
          disabled={isLoading || parsedAmount <= 0n}
          className="btn-uniswap-primary w-full py-4 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span>Executing Shielded Swap...</span>
          ) : isWrap ? (
            <>
              <Lock className="w-4 h-4" /> Wrap USDC to cUSDC
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" /> Unwrap cUSDC to USDC
            </>
          )}
        </button>
      )}

      {/* Transaction Stepper Modal */}
      <TransactionStepper
        isOpen={isStepperOpen}
        title={stepperTitle}
        steps={stepperSteps}
        subtext={stepperSubtext}
      />

    </div>
  );
}
