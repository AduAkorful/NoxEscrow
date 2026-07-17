import { X } from 'lucide-react';

interface ShortcutsHUDProps {
  onClose: () => void;
}

export function ShortcutsHUD({ onClose }: ShortcutsHUDProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="glass-panel p-6 rounded-xl max-w-sm w-full relative border border-[#1E293B]">
        <header className="flex justify-between items-center mb-4 pb-2 border-b border-[#1E293B]">
          <h3 className="font-mono text-sm text-[#00F2FE] font-bold uppercase tracking-wider">Keyboard HUD Help</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-[#FF1744] font-mono text-xs uppercase cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" /> [ESC]
          </button>
        </header>
        <ul className="space-y-3 font-mono text-xs text-slate-300">
          <li className="flex justify-between border-b border-[#1E293B]/40 pb-1">
            <span>Connect Wallet / Sign Key:</span>
            <span className="text-[#00F2FE] font-bold">[C]</span>
          </li>
          <li className="flex justify-between border-b border-[#1E293B]/40 pb-1">
            <span>Toggle Client / Worker Mode:</span>
            <span className="text-[#00F2FE] font-bold">[T]</span>
          </li>
          <li className="flex justify-between border-b border-[#1E293B]/40 pb-1">
            <span>Reset / Disconnect Vault:</span>
            <span className="text-[#00F2FE] font-bold">[D]</span>
          </li>
          <li className="flex justify-between border-b border-[#1E293B]/40 pb-1">
            <span>Toggle shortcuts HUD:</span>
            <span className="text-[#00F2FE] font-bold">[H]</span>
          </li>
          <li className="flex justify-between">
            <span>Close Active Overlay:</span>
            <span className="text-[#00F2FE] font-bold">[ESC]</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
