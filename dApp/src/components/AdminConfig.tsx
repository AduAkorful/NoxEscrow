import { Settings, X } from 'lucide-react';

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
  const adminFields = [
    {
      title: "1. Escrow Implementation Template",
      current: currentImplementation,
      value: newImplementationInput,
      onChange: setNewImplementationInput,
      onUpdate: () => handleUpdateImplementation(newImplementationInput),
      placeholder: "New implementation address (0x...)"
    },
    {
      title: "2. Reputation Registry",
      current: currentRegistry,
      value: newRegistryInput,
      onChange: setNewRegistryInput,
      onUpdate: () => handleUpdateRegistry(newRegistryInput),
      placeholder: "New reputation registry address (0x...)"
    },
    {
      title: "3. Wrapped Token (cUSDC)",
      current: currentUSDCToken,
      value: newUSDCTokenInput,
      onChange: setNewUSDCTokenInput,
      onUpdate: () => handleUpdateUSDCToken(newUSDCTokenInput),
      placeholder: "New cUSDC address (0x...)"
    },
    {
      title: "4. Review Window (Seconds)",
      current: currentReviewWindow,
      value: newReviewWindowInput,
      onChange: setNewReviewWindowInput,
      onUpdate: () => handleUpdateReviewWindow(newReviewWindowInput),
      placeholder: "New review window in seconds"
    },
    {
      title: "5. Mutual Cancel Window (Seconds)",
      current: currentMutualCancelWindow,
      value: newMutualCancelWindowInput,
      onChange: setNewMutualCancelWindowInput,
      onUpdate: () => handleUpdateMutualCancelWindow(newMutualCancelWindowInput),
      placeholder: "New mutual cancel window in seconds"
    },
    {
      title: "6. TEE Arbiter Address",
      current: currentTeeArbiter,
      value: newTeeArbiterInput,
      onChange: setNewTeeArbiterInput,
      onUpdate: () => handleUpdateTeeArbiter(newTeeArbiterInput),
      placeholder: "New TEE Arbiter address (0x...)"
    },
    {
      title: "7. Platform Fee Basis Points (BPS)",
      current: currentPlatformFeeBps,
      value: newPlatformFeeBpsInput,
      onChange: setNewPlatformFeeBpsInput,
      onUpdate: () => handleUpdatePlatformFeeBps(newPlatformFeeBpsInput),
      placeholder: "New BPS (e.g. 50 = 0.5%)"
    },
    {
      title: "8. Platform Treasury Address",
      current: currentTreasury,
      value: newTreasuryInput,
      onChange: setNewTreasuryInput,
      onUpdate: () => handleUpdateTreasury(newTreasuryInput),
      placeholder: "New treasury address (0x...)"
    }
  ];

  return (
    <div className="uniswap-card p-6 md:p-8 flex flex-col gap-6 w-full max-w-4xl mx-auto animate-scale-in">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Protocol Admin Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Factory Contract: <span className="font-mono text-purple-300">{factoryAddress}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 rounded-xl bg-[#131826] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Grid of config fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminFields.map((field, idx) => (
          <div key={idx} className="uniswap-input-box p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white">{field.title}</span>
              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">
                {field.current || "Default"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder={field.placeholder}
                value={field.value} 
                onChange={(e) => field.onChange(e.target.value)}
                className="bg-transparent border-0 text-xs font-mono text-white focus:outline-none w-full p-0"
              />
              <button
                onClick={field.onUpdate}
                disabled={isLoading || !field.value.trim()}
                className="btn-uniswap-secondary px-3 py-1.5 text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-40"
              >
                Update
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
