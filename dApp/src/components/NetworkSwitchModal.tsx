import { useState } from 'react';
import { Network, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';

interface NetworkSwitchModalProps {
  currentChainId: number | null;
  onSwitchSuccess: () => void;
  activeWallet?: any;
}

export function NetworkSwitchModal({ currentChainId, onSwitchSuccess, activeWallet }: NetworkSwitchModalProps) {
  const [isSwitching, setIsSwitching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    setErrorMsg(null);

    const targetChainIdHex = "0xaa36a7"; // Sepolia (11155111)

    try {
      // 1. Try via Privy active wallet if available
      if (activeWallet && typeof activeWallet.switchChain === 'function') {
        try {
          await activeWallet.switchChain(11155111);
          onSwitchSuccess();
          return;
        } catch (privyErr: any) {
          console.warn("Privy switchChain failed, falling back to window.ethereum:", privyErr);
        }
      }

      // 2. Fallback to injected window.ethereum provider
      const win = window as any;
      if (!win.ethereum) {
        throw new Error("No Web3 browser wallet detected.");
      }

      try {
        await win.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainIdHex }]
        });
        onSwitchSuccess();
      } catch (switchError: any) {
        // Error code 4902 indicates that the chain has not been added to wallet
        if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain")) {
          await win.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChainIdHex,
                chainName: "Sepolia Testnet",
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "ETH",
                  decimals: 18
                },
                rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com", "https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"]
              }
            ]
          });
          onSwitchSuccess();
        } else {
          throw switchError;
        }
      }
    } catch (err: any) {
      console.error("Network switch error:", err);
      setErrorMsg(err.message || "Failed to switch wallet network to Sepolia.");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="uniswap-card p-6 md:p-8 w-full max-w-md flex flex-col gap-6 relative shadow-2xl border border-rose-500/30 bg-[#131826]/95">
        
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Unsupported Network
            </h3>
            <p className="text-xs text-rose-300 font-mono mt-0.5">
              Connected to Chain ID: <span className="font-bold text-white">{currentChainId ?? "Unknown"}</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            NoxEscrow operates on <strong className="text-white">Sepolia Testnet (Chain ID 11155111)</strong>. Please switch your Web3 wallet network to proceed.
          </p>

          <div className="p-3 bg-black/40 rounded-xl border border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-slate-400">Current:</span>
              <span className="text-rose-300">Chain {currentChainId}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Target:</span>
              <span className="text-emerald-400 font-bold">Sepolia (11155111)</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 leading-relaxed font-mono">
            ⚠️ {errorMsg}
          </p>
        )}

        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitching}
          className="btn-uniswap-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
        >
          {isSwitching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0B0E17]" />
              <span>Switching Network in Wallet...</span>
            </>
          ) : (
            <>
              <Network className="w-4 h-4" />
              <span>Switch Network to Sepolia</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
}
