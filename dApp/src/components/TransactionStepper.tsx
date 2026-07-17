import { Loader2, CheckCircle2, Circle } from "lucide-react";

export interface StepItem {
  label: string;
  status: "pending" | "active" | "completed";
}

interface TransactionStepperProps {
  isOpen: boolean;
  title?: string;
  steps: StepItem[];
  subtext?: string;
}

export function TransactionStepper({
  isOpen,
  title = "TRANSACTION_PIPELINE_STATUS",
  steps,
  subtext = "Confirm transaction signatures in your wallet and wait for Sepolia network verification."
}: TransactionStepperProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] backdrop-blur-md bg-[#05070F]/85 flex items-center justify-center p-4 animate-fade-in">
      <div className="border border-white/10 bg-[#0A0D18]/90 p-6 rounded-2xl max-w-md w-full space-y-6 shadow-[0_0_50px_rgba(0,242,254,0.15)] relative overflow-hidden animate-scale-in">
        {/* Glowing aura badge behind */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00F2FE]/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F2FE] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F2FE]"></span>
          </span>
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#00F2FE] font-bold">
            {title}
          </h3>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={`flex items-start gap-3.5 p-3 rounded-xl transition-smooth border ${
                step.status === "active" 
                  ? "bg-[#00F2FE]/5 border-[#00F2FE]/20" 
                  : "bg-transparent border-transparent"
              }`}
            >
              {step.status === "completed" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : step.status === "active" ? (
                <Loader2 className="w-5 h-5 text-[#00F2FE] animate-spin mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <p className={`font-mono text-xs font-bold ${
                  step.status === "completed" 
                    ? "text-slate-300 line-through opacity-70" 
                    : step.status === "active" 
                      ? "text-[#00F2FE] drop-shadow-[0_0_8px_rgba(0,242,254,0.1)]" 
                      : "text-slate-500"
                }`}>
                  {step.label}
                </p>
                {step.status === "active" && (
                  <span className="text-[9px] text-[#00F2FE]/60 font-mono block mt-1 animate-pulse">
                    Awaiting block confirmation...
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] font-sans text-slate-400 leading-relaxed bg-[#05070F] p-3 border border-white/5 rounded-xl">
          {subtext}
        </p>
      </div>
    </div>
  );
}
