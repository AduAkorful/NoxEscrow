import { ShieldCheck, Unlock } from 'lucide-react';

interface HeaderProps {
  walletAddress: string | null;
  pinataJWT: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export function Header({
  walletAddress,
  pinataJWT,
  supabaseUrl,
  supabaseKey
}: HeaderProps) {
  return (
    <header className="w-full top-0 sticky z-50 bg-[#05070F]/75 backdrop-blur-xl border-b border-white/5 transition-smooth">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#00F2FE]/5 border border-[#00F2FE]/20 flex items-center justify-center transition-smooth group-hover:border-[#00F2FE]/45 group-hover:bg-[#00F2FE]/10">
            <ShieldCheck className="w-4 h-4 text-[#00F2FE] drop-shadow-[0_0_8px_rgba(0,242,254,0.3)]" />
          </div>
          <h1 className="font-mono text-xs tracking-widest text-[#00F2FE] font-bold uppercase">NOX_ESCROW_CORE</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
              <span className="text-[9px] tracking-wider opacity-60">ADDRESS:</span>
              <span className="text-[#00F2FE] bg-[#00F2FE]/5 border border-[#00F2FE]/10 px-2 py-0.5 rounded font-semibold">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'DISCONNECTED'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
              <span className="text-[9px] tracking-wider opacity-60">SECURITY:</span>
              <span className={`font-semibold ${
                (pinataJWT && supabaseUrl && supabaseKey) 
                  ? 'text-[#00E676]' 
                  : 'text-[#00F2FE]'
              }`}>
                {(pinataJWT && supabaseUrl && supabaseKey) ? '🔒 CLOUD SYNC ENCRYPTED' : '🔒 LOCAL VAULT ENCRYPTED'}
              </span>
            </div>
          </div>

          <div className="px-3.5 py-1.5 border border-[#00F2FE]/20 bg-[#00F2FE]/5 rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.02)] transition-smooth hover:border-[#00F2FE]/40">
            <Unlock className="w-3.5 h-3.5 text-[#00F2FE] drop-shadow-[0_0_5px_rgba(0,242,254,0.3)] animate-pulse" />
            <span className="font-mono text-[9px] text-[#00F2FE] tracking-widest uppercase font-bold">[ VAULT DECRYPTED ]</span>
          </div>
        </div>
      </div>
    </header>
  );
}
