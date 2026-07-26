import { type EscrowContract } from '../../services/escrowService';

interface MilestoneProgressProps {
  selectedContract: EscrowContract;
  selectedMilestoneIndex: number;
  setSelectedMilestoneIndex: (idx: number) => void;
}

export function MilestoneProgress({
  selectedContract,
  selectedMilestoneIndex,
  setSelectedMilestoneIndex
}: MilestoneProgressProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[#7F00FF] font-bold">Milestone Progress timeline</span>
      <div className="flex items-center gap-3 overflow-x-auto py-3 px-1 custom-scrollbar">
        {selectedContract.requirements.map((_, idx) => (
          <div key={idx} className="flex items-center gap-3 flex-shrink-0">
            <div 
              onClick={() => setSelectedMilestoneIndex(idx)}
              className={`px-4 py-2 border font-mono text-[10px] rounded-xl uppercase font-bold flex items-center gap-2 transition-smooth cursor-pointer ${
                idx === selectedMilestoneIndex ? 'border-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.15)] bg-[#00F2FE]/10 text-white' :
                idx < selectedContract.milestonesCompleted ? 'bg-emerald-950/10 text-[#00E676] border-emerald-900/35 shadow-[0_0_10px_rgba(0,230,118,0.02)] hover:border-emerald-500/40' :
                idx === selectedContract.milestonesCompleted ? 'bg-[#00F2FE]/5 text-[#00F2FE] border-[#00F2FE]/25 shadow-[0_0_15px_rgba(0,242,254,0.03)] animate-pulse hover:border-[#00F2FE]/45' :
                'bg-white/[0.01] text-slate-500 border-white/5 hover:border-white/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                idx < selectedContract.milestonesCompleted ? 'bg-[#00E676] drop-shadow-[0_0_4px_#00E676]' :
                idx === selectedContract.milestonesCompleted ? 'bg-[#00F2FE] drop-shadow-[0_0_4px_#00F2FE]' :
                'bg-slate-700'
              }`}></span>
              Milestone {idx + 1} {idx === selectedMilestoneIndex && "👁️"}
            </div>
            {idx < selectedContract.totalMilestones - 1 && (
              <div className={`w-8 h-[1px] ${
                idx < selectedContract.milestonesCompleted ? 'bg-emerald-500/25' : 'bg-white/5'
              }`}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
