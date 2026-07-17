import { ShieldCheck } from 'lucide-react';

interface ReputationGaugeProps {
  completedCount?: number;
  disputedCount?: number;
  totalCount?: number;
}

export function ReputationGauge({
  completedCount = 0,
  disputedCount = 0,
  totalCount = 0
}: ReputationGaugeProps) {
  void totalCount;
  // Base reputation score is 600. Each completed contract adds 100 points, each dispute subtracts 150 points.
  // Gated between 100 and 999.
  const score = Math.max(100, Math.min(999, 600 + (completedCount * 100) - (disputedCount * 150)));
  
  let rank = "INITIATE_GATEKEEPER";
  let cert = "BRONZE TEE-CERTIFIED";
  let certColor = "#cd7f32"; // Bronze

  if (score >= 800) {
    rank = "ELITE_OVERSEER";
    cert = "GOLD TEE-CERTIFIED";
    certColor = "#e8c423"; // Gold
  } else if (score >= 650) {
    rank = "SENIOR_ARBITER";
    cert = "SILVER TEE-CERTIFIED";
    certColor = "#c0c0c0"; // Silver
  }

  // Calculate Dash Offset (full circle is 351.8)
  const dashOffset = 351.8 - (351.8 * (score - 100)) / (999 - 100);

  return (
    <div className="bento-card p-6 flex flex-col gap-5 hover:border-[#00F2FE]/30 transition-smooth">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#00F2FE] font-bold">REPUTATION_MATRIX</h3>
        <ShieldCheck className="w-4 h-4 text-[#00F2FE] drop-shadow-[0_0_5px_rgba(0,242,254,0.3)]" />
      </div>

      <div className="flex flex-col items-center py-4 relative">
        {/* SVG Gauge with gradient definitions */}
        <svg className="w-32 h-32 transform -rotate-90">
          <defs>
            <linearGradient id="repGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F2FE" />
              <stop offset="100%" stopColor="#7F00FF" />
            </linearGradient>
          </defs>
          <circle cx="64" cy="64" fill="transparent" r="56" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="6"></circle>
          <circle 
            cx="64" 
            cy="64" 
            fill="transparent" 
            r="56" 
            stroke="url(#repGradient)" 
            strokeWidth="6" 
            strokeDasharray="351.8" 
            strokeDashoffset={dashOffset} 
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          ></circle>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="font-mono text-2xl font-bold bg-gradient-to-r from-[#00F2FE] to-[#7F00FF] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,254,0.15)]">{score}</span>
          <span className="font-mono text-[9px] text-slate-500 font-bold tracking-wider">SCORE</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-3.5 py-2.5 bg-[#05070F]/50 border border-white/5 rounded-xl transition-smooth hover:border-white/10">
          <span className="font-mono text-[10px] text-slate-400">LEVEL_RANK:</span>
          <span className="font-mono text-[10px] text-[#00F2FE] font-bold">{rank}</span>
        </div>
        <div className="flex justify-between items-center px-3.5 py-2.5 bg-[#05070F]/50 border border-white/5 rounded-xl transition-smooth hover:border-white/10">
          <span className="font-mono text-[10px] text-slate-400">CERTIFICATION:</span>
          <span style={{ color: certColor }} className="font-mono text-[10px] font-bold">{cert}</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed font-sans opacity-75">
        Your reputation is compiled under absolute zero-knowledge inside a secure hardware enclave. Gold certification awards a 0.2% platform fee reduction.
      </p>
    </div>
  );
}
