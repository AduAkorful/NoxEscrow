import { ArrowRightLeft, Plus, LogOut, HelpCircle } from 'lucide-react';

interface FooterProps {
  setViewMode: React.Dispatch<React.SetStateAction<'client' | 'freelancer'>>;
  setShowDraftWizard: (val: boolean) => void;
  logout: () => Promise<void>;
  setShowShortcutsHUD: (val: boolean) => void;
}

export function Footer({
  setViewMode,
  setShowDraftWizard,
  logout,
  setShowShortcutsHUD
}: FooterProps) {
  return (
    <footer className="w-full bottom-0 sticky z-50 bg-[#05070F]/75 backdrop-blur-xl border-t border-white/5 py-3 transition-smooth">
      <div className="flex flex-col md:flex-row justify-between items-center px-6 gap-3 w-full max-w-[1400px] mx-auto">
        
        {/* Left / Center Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-between sm:justify-start">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#00F2FE] font-bold drop-shadow-[0_0_8px_rgba(0,242,254,0.35)]">
            ©2026 NOX_ESCROW
          </span>
          
          <div className="flex flex-wrap gap-2.5 font-mono text-[9px] text-slate-300 uppercase font-bold">
            <button 
              className="hover:text-[#00F2FE] hover:bg-[#00F2FE]/5 hover:border-[#00F2FE]/25 hover:scale-[1.02] active:scale-[0.98] transition-smooth flex items-center gap-1.5 cursor-pointer bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-lg text-slate-300" 
              onClick={() => setViewMode(prev => prev === 'client' ? 'freelancer' : 'client')}
            >
              <ArrowRightLeft className="w-3 h-3 text-[#00F2FE]" />
              <span>Toggle Mode</span>
            </button>
            
            <button 
              className="hover:text-[#00F2FE] hover:bg-[#00F2FE]/5 hover:border-[#00F2FE]/25 hover:scale-[1.02] active:scale-[0.98] transition-smooth flex items-center gap-1.5 cursor-pointer bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-lg text-slate-300" 
              onClick={() => setShowDraftWizard(true)}
            >
              <Plus className="w-3 h-3 text-[#00F2FE]" />
              <span>Draft New</span>
            </button>
            
            <button 
              className="hover:text-[#FF1744] hover:bg-[#FF1744]/5 hover:border-[#FF1744]/25 hover:scale-[1.02] active:scale-[0.98] transition-smooth flex items-center gap-1.5 cursor-pointer bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-lg text-slate-300" 
              onClick={logout}
            >
              <LogOut className="w-3 h-3 text-[#FF1744]" />
              <span>Disconnect</span>
            </button>
            
            <button 
              className="hover:text-[#7F00FF] hover:bg-[#7F00FF]/5 hover:border-[#7F00FF]/25 hover:scale-[1.02] active:scale-[0.98] transition-smooth flex items-center gap-1.5 cursor-pointer bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-lg text-slate-300" 
              onClick={() => setShowShortcutsHUD(true)}
            >
              <HelpCircle className="w-3 h-3 text-[#7F00FF]" />
              <span>Shortcuts</span>
            </button>
          </div>
        </div>

        {/* Right Status Badge */}
        <div className="flex items-center gap-1.5 justify-end w-full md:w-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse"></span>
          <span className="font-mono text-[9px] text-[#00E676] uppercase tracking-wider font-bold">LINK_STABLE</span>
        </div>
      </div>
    </footer>
  );
}
