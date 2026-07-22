import React, { useState } from 'react';
import { 
  KeyRound, 
  UserCheck, 
  Briefcase, 
  LogOut,
  Wallet,
  Unlock,
  User,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  walletAddress: string | null;
  pinataJWT: string;
  supabaseUrl: string;
  supabaseKey: string;
  activeTab: 'home' | 'swap' | 'vaults' | 'deploy' | 'marketplace' | 'profile' | 'admin';
  isAdmin: boolean;
  onSelectHome: () => void;
  onSelectVaults: () => void;
  onSelectDeploy: () => void;
  onSelectWrapper: () => void;
  onSelectMarketplace?: () => void;
  onSelectProfile?: () => void;
  onToggleAdminConfig: () => void;
  viewMode: 'client' | 'freelancer';
  setViewMode: React.Dispatch<React.SetStateAction<'client' | 'freelancer'>>;
  onLogin: () => void;
  onLogout: () => Promise<void>;
  vaultKey: string | null;
  onDeriveKey: () => void;
  isDerivingKey: boolean;
}

export function Header({
  walletAddress,
  pinataJWT,
  supabaseUrl,
  supabaseKey,
  activeTab,
  isAdmin,
  onSelectHome,
  onSelectVaults,
  onSelectDeploy,
  onSelectWrapper,
  onSelectMarketplace,
  onSelectProfile,
  onToggleAdminConfig,
  viewMode,
  setViewMode,
  onLogin,
  onLogout,
  vaultKey,
  onDeriveKey,
  isDerivingKey
}: HeaderProps) {
  const isCloudEncrypted = Boolean(pinataJWT && supabaseUrl && supabaseKey);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0B0E17]/90 backdrop-blur-2xl border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
        
        {/* Left Section: Brand Logo + Navigation Links */}
        <div className="flex items-center gap-8">
          
          {/* NoxEscrow Typographic Wordmark Logo */}
          <div 
            onClick={onSelectHome}
            className="flex items-center gap-2 cursor-pointer group shrink-0 select-none"
            title="NoxEscrow Protocol"
          >
            <div className="flex items-center tracking-tight text-xl font-black transition-transform group-hover:scale-[1.02]">
              <span className="text-white group-hover:text-slate-100 transition-colors">Nox</span>
              <span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent font-extrabold ml-0.5">Escrow</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] ml-1 shadow-[0_0_8px_#38BDF8] animate-pulse" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <button
              onClick={onSelectMarketplace}
              className={`transition-colors cursor-pointer ${
                activeTab === 'marketplace'
                  ? 'text-[#38BDF8] font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Marketplace
            </button>

            <button
              onClick={onSelectWrapper}
              className={`transition-colors cursor-pointer ${
                activeTab === 'swap'
                  ? 'text-[#38BDF8] font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shielded Swap
            </button>

            <button
              onClick={onSelectVaults}
              className={`transition-colors cursor-pointer ${
                activeTab === 'vaults'
                  ? 'text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Escrow Vaults
            </button>

            <button
              onClick={onSelectDeploy}
              className={`transition-colors cursor-pointer ${
                activeTab === 'deploy'
                  ? 'text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Deploy Escrow
            </button>

            {isAdmin && (
              <button
                onClick={onToggleAdminConfig}
                className={`transition-colors cursor-pointer ${
                  activeTab === 'admin'
                    ? 'text-purple-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Admin
              </button>
            )}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          
          {/* Client / Freelancer Switcher */}
          <div className="hidden lg:flex items-center bg-[#131826]/80 p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setViewMode('client')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'client'
                  ? 'bg-[#38BDF8] text-[#0B0E17] shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Client
            </button>
            <button
              onClick={() => setViewMode('freelancer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'freelancer'
                  ? 'bg-[#C084FC] text-[#0B0E17] shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Freelancer
            </button>
          </div>

          {/* Key Derivation Status Pill */}
          {walletAddress && (
            <div className="hidden sm:flex items-center">
              {vaultKey ? (
                <div 
                  title={isCloudEncrypted ? "Cloud Sync Encrypted Vault Key Active" : "Local Vault Encrypted"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono"
                >
                  <Unlock className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span className="font-semibold hidden xl:inline">Key Unlocked</span>
                </div>
              ) : (
                <button
                  onClick={onDeriveKey}
                  disabled={isDerivingKey}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <KeyRound className={`w-3.5 h-3.5 ${isDerivingKey ? 'animate-spin' : ''}`} />
                  <span>{isDerivingKey ? 'Deriving Key...' : 'Unlock Vault Key'}</span>
                </button>
              )}
            </div>
          )}

          {/* Privy Wallet & User Dropdown */}
          {walletAddress ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 bg-[#131826] border border-white/[0.1] px-3.5 py-2 rounded-2xl shadow-sm hover:border-[#38BDF8]/40 transition-all cursor-pointer"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="font-mono text-xs text-white font-semibold">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {isDropdownOpen && (
                <div 
                  onMouseLeave={() => setIsDropdownOpen(false)}
                  className="absolute right-0 top-full mt-2 w-56 bg-[#131826] border border-white/[0.15] rounded-2xl shadow-2xl p-2 z-50 animate-fade-in space-y-1"
                >
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      if (onSelectProfile) onSelectProfile();
                    }}
                    className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-white/[0.08] text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#38BDF8]" />
                    <span>My Profile Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onSelectVaults();
                    }}
                    className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-white/[0.08] text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 text-[#C084FC]" />
                    <span>My Escrow Vaults</span>
                  </button>

                  <div className="border-t border-white/[0.08] my-1" />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-rose-500/10 text-xs font-semibold text-rose-400 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="btn-uniswap-primary px-5 py-2.5 text-sm flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
