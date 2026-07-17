import { Settings, X } from 'lucide-react';

interface AdminConfigProps {
  factoryAddress: string;
  currentImplementation: string;
  currentRegistry: string;
  currentUSDCToken: string;
  currentReviewWindow: string;
  currentMutualCancelWindow: string;

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

  isLoading: boolean;
  handleUpdateImplementation: (newVal: string) => Promise<void>;
  handleUpdateRegistry: (newVal: string) => Promise<void>;
  handleUpdateUSDCToken: (newVal: string) => Promise<void>;
  handleUpdateReviewWindow: (newVal: string) => Promise<void>;
  handleUpdateMutualCancelWindow: (newVal: string) => Promise<void>;
  onClose: () => void;
}

export function AdminConfig({
  factoryAddress,
  currentImplementation,
  currentRegistry,
  currentUSDCToken,
  currentReviewWindow,
  currentMutualCancelWindow,
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
  isLoading,
  handleUpdateImplementation,
  handleUpdateRegistry,
  handleUpdateUSDCToken,
  handleUpdateReviewWindow,
  handleUpdateMutualCancelWindow,
  onClose
}: AdminConfigProps) {
  return (
    <div className="glass-panel p-5 border border-[#1E293B] rounded-lg flex flex-col gap-4 bg-[#161F30]/90">
      <div className="flex justify-between items-center border-b border-[#1E293B] pb-2">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#FF1744] font-bold flex items-center gap-2">
          <Settings className="w-4 h-4 animate-spin" /> Protocol Admin Smart Contract Upgrades
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
        As the protocol administrator, you can modify global escrow configurations. Submitting any change will initiate an on-chain transaction to the <span className="font-mono text-white">{factoryAddress}</span> factory contract.
      </p>

      <div className="space-y-6 pt-2">
        {/* Parameter 1: Escrow Implementation Template */}
        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">1. Escrow Implementation Template</span>
            <span className="text-[9px] text-slate-500 font-mono">Current: {currentImplementation || "Not Loaded"}</span>
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
              Sign & Update
            </button>
          </div>
        </div>

        {/* Parameter 2: Reputation Registry */}
        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">2. Reputation Registry</span>
            <span className="text-[9px] text-slate-500 font-mono">Current: {currentRegistry || "Not Loaded"}</span>
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
              Sign & Update
            </button>
          </div>
        </div>

        {/* Parameter 3: Wrapping Token */}
        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">3. Wrapped Token (cUSDC)</span>
            <span className="text-[9px] text-slate-500 font-mono">Current: {currentUSDCToken || "Not Loaded"}</span>
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
              Sign & Update
            </button>
          </div>
        </div>

        {/* Parameter 4: Default Review Window */}
        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">4. Default Review Window (seconds)</span>
            <span className="text-[9px] text-slate-500 font-mono">Current: {currentReviewWindow || "Not Loaded"}s</span>
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
              Sign & Update
            </button>
          </div>
        </div>

        {/* Parameter 5: Default Mutual Cancellation Expiration Window */}
        <div className="border border-[#1E293B] bg-[#0B0F19]/40 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F2FE] font-bold">5. Mutual Cancellation Window (seconds)</span>
            <span className="text-[9px] text-slate-500 font-mono">Current: {currentMutualCancelWindow || "Not Loaded"}s</span>
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
              Sign & Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
