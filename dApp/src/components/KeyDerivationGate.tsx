import { ShieldCheck, ArrowRightLeft, KeyRound } from 'lucide-react';

interface KeyDerivationGateProps {
  walletAddress: string | null;
  errorMessage: string | null;
  successMessage: string | null;
  isUnsupportedNetwork: boolean;
  isDeriving: boolean;
  connectWallet: () => Promise<void>;
  triggerKeyDerivation: () => Promise<void>;
}

export function KeyDerivationGate({
  walletAddress,
  errorMessage,
  successMessage,
  isUnsupportedNetwork,
  isDeriving,
  connectWallet,
  triggerKeyDerivation
}: KeyDerivationGateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative z-10 w-full max-w-[380px] mx-auto px-6 animate-fade-in">
      <div className="mb-6 flex justify-center">
        <div className="px-4 py-1.5 glass-panel rounded-full flex items-center gap-2 border-[#1E293B]">
          <div className="w-2 h-2 rounded-full bg-[#7F00FF] animate-pulse shadow-[0_0_8px_#7F00FF]"></div>
          <span className="font-mono text-[10px] text-slate-400 tracking-tight uppercase font-medium">
            Status: [🔒 CONFIDENTIAL SESSION LOCKED]
          </span>
        </div>
      </div>


      <div className="glass-panel p-8 rounded-xl relative overflow-hidden w-full border-[#1E293B]">
        <div className="scanline"></div>
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 text-[#00F2FE] animate-pulse">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-[0.2em] text-[#dce4e4] violet-glow-text uppercase">
            🛡️ NOXESCROW
          </h1>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed max-w-[260px] mx-auto">
            Secure non-custodial gateway for confidential asset escrow and automated TEE arbitration.
          </p>
        </header>

        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded text-[11px] text-[#FF1744] leading-relaxed font-mono">
              ERROR: {errorMessage}
            </div>
          )}
          {isUnsupportedNetwork && (
            <button
              onClick={connectWallet}
              className="w-full py-2.5 bg-yellow-950/20 hover:bg-yellow-950/40 border border-yellow-750/30 text-yellow-500 font-mono text-xs uppercase tracking-wider rounded transition-all duration-300 hover:shadow-[0_0_15px_#e8c423] hover:scale-[1.02] flex items-center justify-center gap-2 font-bold cursor-pointer active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 animate-spin" /> Switch to Sepolia
            </button>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded text-[11px] text-[#00E676] leading-relaxed font-mono">
              INFO: {successMessage}
            </div>
          )}

          <button
            onClick={triggerKeyDerivation}
            disabled={isDeriving || isUnsupportedNetwork}
            className="w-full h-12 border border-[#7F00FF] bg-[#161F30]/50 text-[#d5baff] flex items-center justify-center gap-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:bg-[#7F00FF]/20 hover:shadow-[0_0_15px_#7F00FF] hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            {isDeriving ? 'Deriving key...' : 'Derive Vault Key (C)'}
          </button>
          
          <div className="bg-[#05070F] p-3 rounded-lg border border-white/5 mt-3 text-left">
            <span className="text-[9px] font-mono text-[#7F00FF] uppercase tracking-wider font-extrabold block mb-1">
              🔒 Local Key Derivation
            </span>
            <p className="text-[9px] font-sans text-slate-400 leading-normal">
              A temporary key is generated in your browser memory via a wallet signature. This key is never transmitted or stored on any server, keeping all milestones and file deliverables fully zero-knowledge encrypted.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1E293B]/60 text-center">
          <p className="font-mono text-[9px] text-slate-500 mb-2 uppercase tracking-widest">
            Connected Signer Wallet
          </p>
          <div className="bg-[#0B0F19]/80 py-2 px-3 rounded border border-[#1E293B] flex items-center justify-center">
            <code className="font-mono text-xs text-[#00F2FE]/70 block truncate">
              {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : "m/44'/60'/0'/0/0"}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
