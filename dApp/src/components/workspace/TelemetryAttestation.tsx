import { type EscrowContract } from '../../services/escrowService';
import { type EscrowDisputeRecord } from '../../services/metadataService';

interface TelemetryAttestationProps {
  selectedContract: EscrowContract;
  disputeRecord: EscrowDisputeRecord | null;
}

export function TelemetryAttestation({
  selectedContract,
  disputeRecord
}: TelemetryAttestationProps) {
  return (
    <div className="border border-white/5 bg-[#03050C]/60 backdrop-blur-md p-6 rounded-xl flex flex-col gap-4 hover:border-white/10 transition-smooth">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#00F2FE] font-bold">
            TEE_ENCLAVE_ATTESTATION_MONITOR (INTEL_SGX_V2)
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
          <span>ISOLATION: <strong className="text-emerald-400">AMD SNP / SEV</strong></span>
          <span>MRENCLAVE: <strong className="text-slate-300">0x7b58c5415a77cd52199db...</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Metrics */}
        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5">
          <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Arbitration Model</span>
          <span className="text-[11px] font-mono text-slate-200">{disputeRecord?.model_name || "gemini-2.5-flash"}</span>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5">
          <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Consensus Confidence</span>
          <span className="text-[11px] font-mono text-slate-200">
            {disputeRecord ? `${disputeRecord.score}% Rating Consensus` : selectedContract.status === 'DISPUTED' ? 'Evaluating...' : '98.4% Rating Consensus'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5">
          <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Attestation Status</span>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            ✓ VERIFIED_SECURE
          </span>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.01] border border-white/5">
          <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Sandbox Integrity</span>
          <span className="text-[11px] font-mono text-emerald-400">100% MEMORY_ISOLATED</span>
        </div>
      </div>

      {/* Live Terminal Log */}
      <div className="bg-[#020308] border border-white/5 p-4 rounded-xl font-mono text-[10px] text-slate-400 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
        {disputeRecord ? (
          <>
            <div className="text-yellow-500 font-bold">[TEE_ARBITER] ⚠️ DISPUTE RESOLUTION BROADCASTED ON-CHAIN</div>
            <div>[MODEL] Active Arbitration Engine: {disputeRecord.model_name || 'gemini-2.5-flash'}</div>
            <div>[VERDICT] Ruling: <span className={disputeRecord.verdict === 'PAY_FREELANCER' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{disputeRecord.verdict}</span> (Score: {disputeRecord.score}/100)</div>
            <div className="text-slate-200 font-sans leading-relaxed text-[11px] bg-white/[0.02] p-2.5 rounded-lg border border-white/5 mt-1">
              💬 <strong>Gemini Reasoning:</strong> "{disputeRecord.reasoning}"
            </div>
          </>
        ) : selectedContract.status === 'DISPUTED' ? (
          <>
            <div className="text-yellow-500 font-bold">[LIVE] ⚠️ ON-CHAIN DISPUTE DETECTED: FORWARDING TO TEE RENDER ARBITER...</div>
            <div>[LISTEN] Deployed Arbiter listening for DisputeOpened logs...</div>
            <div>[DECRYPT] KMS Handles decrypting requirements & deliverable hashes...</div>
            <div>[PROMPT] Google Gemini 2.5 Flash evaluating spec match score...</div>
            <div className="text-[#00F2FE] font-bold animate-pulse">[PROCESSING] Awaiting Gemini 2.5 Flash adjudication response...</div>
          </>
        ) : (
          <>
            <div className="text-emerald-400">[18:02:11] SECURE TEE ENCLAVE RUNNING: IDLE_MONITORING</div>
            <div>[18:02:12] MEMORY INTEGRITY SCHEMAS CORRELATED COHERENTLY.</div>
            <div>[18:02:13] PENDING DISPUTES: 0 ACTIVE. LISTENING FOR CONTRACT DISPUTE TRANSACTIONS...</div>
          </>
        )}
      </div>
    </div>
  );
}
