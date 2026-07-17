import { ShieldCheck, Fingerprint, Database, Plus, Settings, LogOut, Coins } from 'lucide-react';
import { type EscrowContract } from '../services/escrowService';

interface SidebarProps {
  selectedContract: EscrowContract | null;
  showDraftWizard: boolean;
  showSettings: boolean;
  showTokenWrapper: boolean;
  isAdmin: boolean;
  onSelectVaults: () => void;
  onSelectDeploy: () => void;
  onSelectWrapper: () => void;
  onToggleAdminConfig: () => void;
  logout: () => Promise<void>;
  viewMode: 'client' | 'freelancer';
  setViewMode: React.Dispatch<React.SetStateAction<'client' | 'freelancer'>>;
}

export function Sidebar({
  selectedContract,
  showDraftWizard,
  showSettings,
  showTokenWrapper,
  isAdmin,
  onSelectVaults,
  onSelectDeploy,
  onSelectWrapper,
  onToggleAdminConfig,
  logout,
  viewMode,
  setViewMode
}: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col h-screen left-0 fixed w-64 bg-[#05070F]/65 backdrop-blur-xl border-r border-white/5 z-40 transition-smooth">
      <div className="p-6 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3 mb-6 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-[#00F2FE]/5 border border-[#00F2FE]/20 flex items-center justify-center transition-smooth group-hover:border-[#00F2FE]/45 group-hover:bg-[#00F2FE]/10">
            <ShieldCheck className="w-4 h-4 text-[#00F2FE] drop-shadow-[0_0_8px_rgba(0,242,254,0.3)]" />
          </div>
          <span className="font-mono text-base font-bold tracking-widest text-slate-100 transition-smooth group-hover:text-[#00F2FE] uppercase">NOXESCROW</span>
        </div>

        <div className="flex items-center gap-3 px-3.5 py-3 border border-white/5 bg-white/[0.01] rounded-xl mb-6 transition-smooth hover:border-white/10 hover:bg-white/[0.02]">
          <div className="w-9 h-9 rounded-xl border border-[#00F2FE]/20 overflow-hidden flex items-center justify-center bg-[#070913]">
            <Fingerprint className="w-5 h-5 text-[#00F2FE] drop-shadow-[0_0_5px_rgba(0,242,254,0.3)] animate-pulse" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-mono text-xs text-[#00F2FE] truncate font-bold uppercase">NOX_DEV_0x42</span>
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-bold">Gold Overseer</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <button 
            onClick={onSelectVaults}
            className={`px-4 py-3 flex items-center gap-3.5 font-mono text-xs font-bold tracking-widest rounded-xl text-left transition-smooth border border-transparent ${!selectedContract && !showDraftWizard && !showTokenWrapper ? 'text-[#00F2FE] bg-[#00F2FE]/5 border-[#00F2FE]/25 shadow-[0_0_15px_rgba(0,242,254,0.03)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}
          >
            <Database className="w-4 h-4" /> Vaults
          </button>
          <button 
            onClick={onSelectDeploy}
            className={`px-4 py-3 flex items-center gap-3.5 font-mono text-xs font-bold tracking-widest rounded-xl text-left transition-smooth border border-transparent ${showDraftWizard ? 'text-[#00F2FE] bg-[#00F2FE]/5 border-[#00F2FE]/25 shadow-[0_0_15px_rgba(0,242,254,0.03)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}
          >
            <Plus className="w-4 h-4" /> Deploy Escrow
          </button>
          <button 
            onClick={onSelectWrapper}
            className={`px-4 py-3 flex items-center gap-3.5 font-mono text-xs font-bold tracking-widest rounded-xl text-left transition-smooth border border-transparent ${showTokenWrapper ? 'text-[#00F2FE] bg-[#00F2FE]/5 border-[#00F2FE]/25 shadow-[0_0_15px_rgba(0,242,254,0.03)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}
          >
            <Coins className="w-4 h-4" /> Swap Portal
          </button>
          {/* Protocol configuration sidebar trigger */}
          {isAdmin && (
            <button 
              onClick={onToggleAdminConfig}
              className={`px-4 py-3 flex items-center gap-3.5 font-mono text-xs font-bold tracking-widest rounded-xl text-left transition-smooth border border-transparent ${showSettings ? 'text-[#00E676] bg-[#00E676]/5 border-[#00E676]/25 shadow-[0_0_15px_rgba(0,230,118,0.03)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}
            >
              <Settings className="w-4 h-4" /> Admin Config
            </button>
          )}

          {/* View mode switcher */}
          <div className="flex flex-col gap-2 border-t border-white/5 pt-4 mt-4">
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-bold px-3">
              VIEW_MODE_GATEWAY
            </span>
            <div className="flex bg-[#05070F] border border-white/5 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode('client')}
                className={`flex-1 py-2 font-mono text-[9px] font-bold tracking-wider rounded-lg transition-smooth cursor-pointer ${
                  viewMode === 'client'
                    ? 'bg-[#00F2FE]/15 border border-[#00F2FE]/25 text-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.05)]'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent bg-transparent'
                }`}
              >
                CLIENT
              </button>
              <button
                onClick={() => setViewMode('freelancer')}
                className={`flex-1 py-2 font-mono text-[9px] font-bold tracking-wider rounded-lg transition-smooth cursor-pointer ${
                  viewMode === 'freelancer'
                    ? 'bg-[#00F2FE]/15 border border-[#00F2FE]/25 text-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.05)]'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent bg-transparent'
                }`}
              >
                FREELANCER
              </button>
            </div>
          </div>
        </nav>

        <button
          onClick={logout}
          className="w-full py-3 bg-red-950/10 hover:bg-red-950/30 border border-red-900/25 text-[#FF1744] font-mono text-[9px] tracking-widest uppercase rounded-xl transition-smooth cursor-pointer flex items-center justify-center gap-2 font-bold hover:shadow-[0_0_15px_rgba(255,23,68,0.1)] active:scale-[0.98]"
        >
          <LogOut className="w-3.5 h-3.5" />
          Disconnect Vault
        </button>
      </div>
    </aside>
  );
}
