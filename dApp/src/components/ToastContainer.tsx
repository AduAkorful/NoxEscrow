import { X, CheckCircle2, AlertOctagon, Info } from "lucide-react";
import { useEffect } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[110] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />,
    error: <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-[#00F2FE] flex-shrink-0 mt-0.5" />
  };

  const borders = {
    success: "border-emerald-500/20 bg-[#061B14]/90 shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
    error: "border-red-500/20 bg-[#25090F]/90 shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
    info: "border-[#00F2FE]/20 bg-[#061524]/90 shadow-[0_4px_20px_rgba(0,242,254,0.15)]"
  };

  return (
    <div className={`pointer-events-auto border p-4.5 rounded-xl flex items-start gap-3 backdrop-blur-md transition-smooth animate-toast-in ${borders[toast.type]}`}>
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[11px] font-bold text-slate-200 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-white cursor-pointer flex-shrink-0 mt-0.5 transition-smooth"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
