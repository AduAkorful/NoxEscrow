import React from 'react';
import { Database, Coins, Plus, Settings, UserCheck, Briefcase } from 'lucide-react';

interface SidebarProps {
  activeTab: 'home' | 'swap' | 'vaults' | 'deploy' | 'admin';
  isAdmin: boolean;
  onSelectVaults: () => void;
  onSelectDeploy: () => void;
  onSelectWrapper: () => void;
  onToggleAdminConfig: () => void;
  viewMode: 'client' | 'freelancer';
  setViewMode: React.Dispatch<React.SetStateAction<'client' | 'freelancer'>>;
}

export function Sidebar({
  activeTab,
  isAdmin,
  onSelectVaults,
  onSelectDeploy,
  onSelectWrapper,
  onToggleAdminConfig,
  viewMode,
  setViewMode
}: SidebarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0E17]/95 backdrop-blur-2xl border-t border-white/[0.08] z-50 flex items-center justify-around px-2 pb-safe shadow-2xl">
      <button
        onClick={onSelectVaults}
        className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 text-xs font-semibold transition-all cursor-pointer ${
          activeTab === 'vaults' ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Database className="w-4 h-4" />
        <span>Vaults</span>
      </button>

      <button
        onClick={onSelectWrapper}
        className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 text-xs font-semibold transition-all cursor-pointer ${
          activeTab === 'swap' ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Coins className="w-4 h-4" />
        <span>Swap</span>
      </button>

      <button
        onClick={onSelectDeploy}
        className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 text-xs font-semibold transition-all cursor-pointer ${
          activeTab === 'deploy' ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Plus className="w-4 h-4" />
        <span>Deploy</span>
      </button>

      {isAdmin && (
        <button
          onClick={onToggleAdminConfig}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'admin' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Admin</span>
        </button>
      )}

      <button
        onClick={() => setViewMode(viewMode === 'client' ? 'freelancer' : 'client')}
        className="flex flex-col items-center justify-center flex-1 py-1 gap-1 text-xs font-semibold transition-all cursor-pointer text-slate-400 hover:text-white"
      >
        {viewMode === 'client' ? <UserCheck className="w-4 h-4 text-[#38BDF8]" /> : <Briefcase className="w-4 h-4 text-[#C084FC]" />}
        <span className="capitalize">{viewMode}</span>
      </button>
    </div>
  );
}
