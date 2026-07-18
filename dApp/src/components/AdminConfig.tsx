import { Settings, X, Shield, Percent, Wallet } from 'lucide-react';

interface AdminConfigProps {
  factoryAddress: string;
  currentImplementation: string;
  currentRegistry: string;
  currentUSDCToken: string;
  currentReviewWindow: string;
  currentMutualCancelWindow: string;
  currentTeeArbiter: string;
  currentPlatformFeeBps: string;
  currentTreasury: string;

  newImplementationInput: string;
  setNewImplementationInput: (val: string) => void;
  newRegistryInput: string;
  setNewRegistryInput: (val: string) => void;
  newUSDCTokenInput: string;
  setNewUSDCTokenInput: (val: string) => void;
  newReviewWindowInput: string;
  setNewReviewWindowInput: (val: string) => void;
  newMutualCancelWindowInput: string;
  setNewMutualCancelWindowInput: (val: string) => void;
  newTeeArbiterInput: string;
  setNewTeeArbiterInput: (val: string) => void;
  newPlatformFeeBpsInput: string;
  setNewPlatformFeeBpsInput: (val: string) => void;
  newTreasuryInput: string;
  setNewTreasuryInput: (val: string) => void;

  isLoading: boolean;
  handleUpdateImplementation: (newVal: string) => Promise<void>;
  handleUpdateRegistry: (newVal: string) => Promise<void>;
  handleUpdateUSDCToken: (newVal: string) => Promise<void>;
  handleUpdateReviewWindow: (newVal: string) => Promise<void>;
  handleUpdateMutualCancelWindow: (newVal: string) => Promise<void>;
  handleUpdateTeeArbiter: (newVal: string) => Promise<void>;
  handleUpdatePlatformFeeBps: (newVal: string) => Promise<void>;
  handleUpdateTreasury: (newVal: string) => Promise<void>;
  onClose: () => void;
}

export function AdminConfig({
  factoryAddress,
  currentImplementation,
  currentRegistry,
  currentUSDCToken,
  currentReviewWindow,
  currentMutualCancelWindow,
  currentTeeArbiter,
  currentPlatformFeeBps,
  currentTreasury,
  newImplementationInput,
  setNewImplementationInput,
  newRegistryInput,
  setNewRegistryInput,
  newUSDCTokenInput,
  setNewUSDCTokenInput,
  newReviewWindowInput,
  setNewReviewWindowInput,
  newMutualCancelWindowInput,
  setNewMutualCancelWindowInput,
  newTeeArbiterInput,
  setNewTeeArbiterInput,
  newPlatformFeeBpsInput,
  setNewPlatformFeeBpsInput,
  newTreasuryInput,
  setNewTreasuryInput,
  isLoading,
  handleUpdateImplementation,
  handleUpdateRegistry,
  handleUpdateUSDCToken,
  handleUpdateReviewWindow,
  handleUpdateMutualCancelWindow,
  handleUpdateTeeArbiter,
  handleUpdatePlatformFeeBps,
  handleUpdateTreasury,
  onClose
}: AdminConfigProps) {
  return (
    <div className="glass-panel p-5 border border-[#1E293B] rounded-lg flex flex-col gap-4 bg-[#161F30]/90">
      <div className="flex justify-between items-center border-b border-[#1E293B] pb-2">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#FF1744] font-bold flex items-center gap-2">
          <Settings className="w-4 h-4 animate-spin" /> Protocol Admin Configuration
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
        As the protocol administrator, you can modify global escrow configurations. Submitting any change will initiate an on-chain transaction to the <span className="font-mono text-white">{factoryAddress}</span> factory contract.
      </p>

      <div className="space-y-6 pt-2">
        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">1. Escrow Implementation Template</span>
            <span className="text-[9px] text-slate-500 font-mono truncate max-w-[180px]">{currentImplementation || "Not Loaded"}</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="New implementation address (0x...)"
              value={newImplementationInput} 
              onChange={(e) => setNewImplementationInput(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#dce4e4] focus:border-[#00F2FE] focus:outline-none"
            />
            <button 
              onClick={() => handleUpdateImplementation(newImplementationInput)}
              disabled={isLoading}
              className="px-4 py-2 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 font-mono text-[10px] tracking-wider uppercase rounded transition-colors font-bold"
            >
              Update
            </button>
          </div>
        </div>

        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">2. Reputation Registry</span>
            <span className="text-[9px] text-slate-500 font-mono truncate max-w-[180px]">{currentRegistry || "Not Loaded"}</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="New reputation registry address (0x...)"
              value={newRegistryInput} 
              onChange={(e) => setNewRegistryInput(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#dce4e4] focus:border-[#00F2FE] focus:outline-none"
            />
            <button 
              onClick={() => handleUpdateRegistry(newRegistryInput)}
              disabled={isLoading}
              className="px-4 py-2 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 font-mono text-[10px] tracking-wider uppercase rounded transition-colors font-bold"
            >
              Update
            </button>
          </div>
        </div>

        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">3. Wrapped Token (cUSDC)</span>
            <span className="text-[9px] text-slate-500 font-mono truncate max-w-[180px]">{currentUSDCToken || "Not Loaded"}</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="New cUSDC address (0x...)"
              value={newUSDCTokenInput} 
              onChange={(e) => setNewUSDCTokenInput(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#dce4e4] focus:border-[#00F2FE] focus:outline-none"
            />
            <button 
              onClick={() => handleUpdateUSDCToken(newUSDCTokenInput)}
              disabled={isLoading}
              className="px-4 py-2 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 font-mono text-[10px] tracking-wider uppercase rounded transition-colors font-bold"
            >
              Update
            </button>
          </div>
        </div>

        <div className="border border-[#7F00FF]/30 bg-[#7F00FF]/5 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7F00FF] font-bold flex items-center gap-2">
              <Shield className="w-3 h-3" /> 4. Canonical TEE Arbiter
            </span>
            <span className="text-[9px] text-slate-500 font-mono truncate max-w-[180px]">{currentTeeArbiter || "Not Loaded"}</span>
          </div>
          <p className="text-[9px] text-slate-500">The trusted arbiter address that resolves disputes. Only this address can call resolveDispute on escrows.</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="New arbiter address (0x...)"
              value={newTeeArbiterInput} 
              onChange={(e) => setNewTeeArbiterInput(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#dce4e4] focus:border-[#7F00FF] focus:outline-none"
            />
            <button 
              onClick={() => handleUpdateTeeArbiter(newTeeArbiterInput)}
              disabled={isLoading}
              className="px-4 py-2 bg-[#7F00FF]/10 hover:bg-[#7F00FF]/20 text-[#7F00FF] border border-[#7F00FF]/30 font-mono text-[10px] tracking-wider uppercase rounded transition-colors font-bold"
            >
              Update
            </button>
          </div>
        </div>

        <div className="border border-[#00E676]/30 bg-[#00E676]/5 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00E676] font-bold flex items-center gap-2">
              <Percent className="w-3 h-3" /> 5. Platform Fee (Basis Points)
            </span>
            <span className="text-[9px] text-slate-500 font-mono">{currentPlatformFeeBps || "0"} bps ({Number(currentPlatformFeeBps || 0) / 100}%)</span>
          </div>
          <p className="text-[9px] text-slate-500">Fee collected on successful payouts. 50 bps = 0.5%. Max 1000 bps (10%).</p>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="Fee in basis points (0-1000)"
              value={newPlatformFeeBpsInput} 
              onChange={(e) => setNewPlatformFeeBpsInput(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#dce4e4] focus:border-[#00E676] focus:outline-none"
            />
            <button 
              onClick={() => handleUpdatePlatformFeeBps(newPlatformFeeBpsInput)}
              disabled={isLoading}
              className="px-4 py-2 bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 font-mono text-[10px] tracking-wider uppercase rounded transition-colors font-bold"
            >
              Update
            </button>
          </div>
        </div>

        <div className="border border-[#00E676]/30 bg-[#00E676]/5 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00E676] font-bold flex items-center gap-2">
              <Wallet className="w-3 h-3" /> 6. Protocol Treasury
            </span>
            <span className="text-[9px] text-slate-500 font-mono truncate max-w-[180px]">{currentTreasury || "Not Loaded"}</span>
          </div>
          <p className="text-[9px] text-slate-500">Address that receives platform fees from successful escrow completions.</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="New treasury address (0x...)"
              value={newTreasuryInput} 
              onChange={(e) => setNewTreasuryInput(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#dce4e4] focus:border-[#00E676] focus:outline-none"
            />
            <button 
              onClick={() => handleUpdateTreasury(newTreasuryInput)}
              disabled={isLoading}
              className="px-4 py-2 bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 font-mono text-[10px] tracking-wider uppercase rounded transition-colors font-bold"
            >
              Update
            </button>
          </div>
        </div>

        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">7. Default Review Window (seconds)</span>
            <span className="text-[9px] text-slate-500 font-mono">{currentReviewWindow || "Not Loaded"}s</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="New review window in seconds"
              value={newReviewWindowInput} 
              onChange={(e) => setNewReviewWindowInput(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#dce4e4] focus:border-[#00F2FE] focus:outline-none"
            />
            <button 
              onClick={() => handleUpdateReviewWindow(newReviewWindowInput)}
              disabled={isLoading}
              className="px-4 py-2 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 font-mono text-[10px] tracking-wider uppercase rounded transition-colors font-bold"
            >
              Update
            </button>
          </div>
        </div>

        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">8. Mutual Cancellation Window (seconds)</span>
            <span className="text-[9px] text-slate-500 font-mono">{currentMutualCancelWindow || "Not Loaded"}s</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="New cancellation window in seconds"
              value={newMutualCancelWindowInput} 
              onChange={(e) => setNewMutualCancelWindowInput(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#dce4e4] focus:border-[#00F2FE] focus:outline-none"
            />
            <button 
              onClick={() => handleUpdateMutualCancelWindow(newMutualCancelWindowInput)}
              disabled={isLoading}
              className="px-4 py-2 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 font-mono text-[10px] tracking-wider uppercase rounded transition-colors font-bold"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
