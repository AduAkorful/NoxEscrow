import { Terminal } from 'lucide-react';

export function EventLog() {
  return (
    <div className="bento-card p-6 flex flex-col gap-4 hover:border-[#00F2FE]/30 transition-smooth">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] animate-pulse drop-shadow-[0_0_5px_#00F2FE]"></span>
          <h4 className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">SECURITY_EVENT_LOG</h4>
        </div>
        <Terminal className="w-3.5 h-3.5 text-slate-500" />
      </div>

      <div className="flex flex-col gap-2.5 custom-scrollbar max-h-[180px] overflow-y-auto pr-1">
        <div className="flex flex-col gap-1 text-[10px] font-mono border-l-2 border-[#00F2FE] pl-3 py-1 bg-[#00F2FE]/5 rounded-r-lg">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">14:22:01</span>
            <span className="text-[#00F2FE] font-bold">VAULT_ACCESS_GRANTED</span>
          </div>
          <span className="text-[9px] text-[#00F2FE]/70 pl-0">Signer verified inside TEE session.</span>
        </div>
        <div className="flex flex-col gap-1 text-[10px] font-mono border-l-2 border-white/5 pl-3 py-1 hover:bg-white/[0.01] rounded-r-lg transition-smooth">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">13:45:12</span>
            <span className="text-slate-300 font-medium">HEARTBEAT_SIGNAL_RECV</span>
          </div>
          <span className="text-[9px] text-slate-500 pl-0">Intel SGX attestation verification OK.</span>
        </div>
        <div className="flex flex-col gap-1 text-[10px] font-mono border-l-2 border-white/5 pl-3 py-1 hover:bg-white/[0.01] rounded-r-lg transition-smooth">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">12:10:55</span>
            <span className="text-slate-300 font-medium">CONTRACT_NX-9012_UPDT</span>
          </div>
          <span className="text-[9px] text-slate-500 pl-0">Encrypted IPFS payload updated.</span>
        </div>
      </div>
    </div>
  );
}
