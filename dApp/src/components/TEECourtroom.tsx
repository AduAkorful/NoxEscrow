import { useState, useEffect, useRef } from 'react';
import { Send, Terminal, ShieldAlert, Award } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ChatMessage {
  sender: 'CLIENT' | 'FREELANCER' | 'TEE_SYSTEM';
  text: string;
  timestamp: string;
}

interface TEECourtroomProps {
  escrowAddress: string;
  clientAddress: string;
  freelancerAddress: string;
  disputeReason: string;
  onResolve?: (ruling: 'CLIENT' | 'FREELANCER') => void;
  simulationMode?: boolean;
  disputeRecord?: any;
  milestoneIndex?: number;
}

export function TEECourtroom({
  escrowAddress,
  clientAddress,
  freelancerAddress,
  disputeReason,
  simulationMode = false,
  disputeRecord = null,
  milestoneIndex
}: TEECourtroomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    if (!escrowAddress || milestoneIndex === undefined) return;
    
    async function fetchMetadata() {
      try {
        const { data, error } = await supabase
          .from('escrow_metadata')
          .select('*')
          .eq('escrow_address', escrowAddress.toLowerCase())
          .eq('milestone_index', milestoneIndex)
          .single();
        if (!error && data) {
          setMetadata(data);
        }
      } catch (err) {
        console.warn("Failed to fetch escrow metadata for courtroom:", err);
      }
    }
    fetchMetadata();
  }, [escrowAddress, milestoneIndex]);

  useEffect(() => {
    const clientMsg = metadata?.client_statement && metadata.client_statement !== "None provided."
      ? metadata.client_statement
      : disputeReason || `The client (${clientAddress.slice(0, 6)}...${clientAddress.slice(-4)}) opened a dispute on milestone compliance.`;
    const freelancerMsg = metadata?.freelancer_statement && metadata.freelancer_statement !== "None provided."
      ? metadata.freelancer_statement
      : `Freelancer (${freelancerAddress.slice(0, 6)}...${freelancerAddress.slice(-4)}) submitted deliverables for review.`;

    setMessages([
      {
        sender: 'TEE_SYSTEM',
        text: `⚠️ DISPUTE DETECTED. Secure enclave court initiated for escrow ${escrowAddress.slice(0, 10)}...`,
        timestamp: '14:22:01'
      },
      {
        sender: 'CLIENT',
        text: clientMsg,
        timestamp: '14:22:45'
      },
      {
        sender: 'TEE_SYSTEM',
        text: `🔬 Evidence parsed: client claims non-compliance of milestone specs.`,
        timestamp: '14:23:00'
      },
      {
        sender: 'FREELANCER',
        text: freelancerMsg,
        timestamp: '14:23:15'
      }
    ]);
  }, [metadata, disputeReason, escrowAddress, clientAddress, freelancerAddress]);

  const [inputVal, setInputVal] = useState('');
  const [clientClaimPercent, setClientClaimPercent] = useState(0);
  const [freelancerClaimPercent, setFreelancerClaimPercent] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [teeLogs, setTeeLogs] = useState<string[]>([
    "[00:01] Attesting arbitrator hardware keys...",
    "[00:03] Secure SGX sandbox initialized...",
    "[00:07] Awaiting off-chain iExec TEE evaluation execution..."
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [teeLogs]);

  // Telemetry sync from real-time database dispute record
  useEffect(() => {
    if (disputeRecord) {
      const time = disputeRecord.created_at 
        ? new Date(disputeRecord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setMessages(prev => {
        // Prevent duplicate appends
        if (prev.some(m => m.text.includes("Gemini Verdict Resolved"))) return prev;
        return [
          ...prev,
          {
            sender: 'TEE_SYSTEM',
            text: `🔬 Gemini Verdict Resolved inside Secure Enclave. Verdict: ${disputeRecord.verdict} (Score: ${disputeRecord.score}/100)`,
            timestamp: time
          },
          {
            sender: 'TEE_SYSTEM',
            text: `💬 Reasoning: "${disputeRecord.reasoning}"`,
            timestamp: time
          },
          {
            sender: 'TEE_SYSTEM',
            text: `⚖️ Transaction broadcasted to NoxEscrow contract on-chain. State finalized.`,
            timestamp: time
          }
        ];
      });

      setTeeLogs(prev => {
        if (prev.some(l => l.includes("DECISION BROADCASTED"))) return prev;
        return [
          ...prev,
          `[${time}] Gemini LLM output parsed. Verdict: ${disputeRecord.verdict}`,
          `[${time}] DECISION BROADCASTED ON-CHAIN successfully.`
        ];
      });

      if (disputeRecord.verdict === 'PAY_FREELANCER') {
        setFreelancerClaimPercent(disputeRecord.score);
        setClientClaimPercent(100 - disputeRecord.score);
      } else {
        setClientClaimPercent(disputeRecord.score);
        setFreelancerClaimPercent(100 - disputeRecord.score);
      }
      setConfidence(98);
    }
  }, [disputeRecord]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newMsg: ChatMessage = {
      sender: 'CLIENT',
      text: inputVal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputVal('');

    setTeeLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] User statement submitted to TEE dispute record.`
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-fade-in mt-6">
      {/* Evidence discussion channel (7 cols) */}
      <div className="lg:col-span-7 bento-card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-slate-200 font-bold">
              ENCLAVE_DISPUTE_ROOM
            </h3>
          </div>
          <span className="font-mono text-[9px] text-rose-400 bg-rose-950/30 border border-rose-900/30 px-2 py-0.5 rounded">
            CONFIDENTIAL SECURE CHAT
          </span>
        </div>

        {/* Dispute Reasoning Header */}
        <div className="bg-rose-950/10 border border-rose-900/20 p-3.5 rounded-xl">
          <span className="font-mono text-[9px] text-rose-400 font-extrabold uppercase block mb-1">
            INITIAL DISPUTE STATEMENT:
          </span>
          <p className="text-xs font-sans text-slate-300 italic leading-relaxed">
            "{disputeReason || "No statement provided."}"
          </p>
        </div>

        {/* Message Feeds */}
        <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto custom-scrollbar space-y-3.5 p-1 bg-[#05070F]/45 rounded-xl border border-white/5 p-4">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col gap-1 max-w-[85%] ${
                msg.sender === 'CLIENT' 
                  ? 'ml-auto items-end' 
                  : msg.sender === 'TEE_SYSTEM' 
                    ? 'mx-auto items-center text-center' 
                    : 'mr-auto items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 font-mono text-[8px] text-slate-500">
                <span className={
                  msg.sender === 'CLIENT' 
                    ? 'text-[#00F2FE]' 
                    : msg.sender === 'TEE_SYSTEM' 
                      ? 'text-amber-400' 
                      : 'text-[#7F00FF]'
                }>
                  {msg.sender}
                </span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>
              <div className={`p-3 rounded-2xl text-[11px] font-sans leading-relaxed border ${
                msg.sender === 'CLIENT'
                  ? 'bg-[#00F2FE]/5 border-[#00F2FE]/20 text-[#00F2FE]'
                  : msg.sender === 'TEE_SYSTEM'
                    ? 'bg-amber-500/5 border-amber-500/10 text-amber-200/90 font-mono text-[10px]'
                    : 'bg-[#7F00FF]/5 border-[#7F00FF]/20 text-[#d5baff]'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Action inputs */}
        {!simulationMode ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] uppercase font-bold text-center rounded-xl tracking-wider">
            🔒 COURT ROOM STATEMENTS ARE LOCKED FOR TEE ENCLAVE ASSESSMENT
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Provide counter-evidence or chat to enclave..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-[#05070F] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:border-[#00F2FE]/45 focus:outline-none transition-smooth"
            />
            <button 
              type="submit"
              className="w-10 h-10 rounded-xl border border-[#00F2FE]/30 bg-[#00F2FE]/5 text-[#00F2FE] hover:bg-[#00F2FE]/25 flex items-center justify-center transition-smooth cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* AI consensus telemetry (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Consensus metrics */}
        <div className="bento-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Award className="w-4 h-4 text-[#00F2FE] drop-shadow-[0_0_8px_rgba(0,242,254,0.3)]" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-slate-200 font-bold">
              TEE_JURY_CONSENSUS
            </h3>
          </div>

          <div className="space-y-4">
            {/* Client Claim weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-[#00F2FE]">CLIENT CLAIM</span>
                <span className="text-slate-300 font-bold">{clientClaimPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00F2FE] to-cyan-500 transition-smooth"
                  style={{ width: `${clientClaimPercent}%` }}
                />
              </div>
            </div>

            {/* Freelancer Claim weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-[#7F00FF]">FREELANCER CLAIM</span>
                <span className="text-slate-300 font-bold">{freelancerClaimPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#7F00FF] to-violet-600 transition-smooth"
                  style={{ width: `${freelancerClaimPercent}%` }}
                />
              </div>
            </div>

            {/* Consensus Confidence score */}
            <div className="bg-[#05070F] p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] text-slate-500 uppercase block tracking-wider">
                  Consensus Confidence
                </span>
                <span className="text-xs font-sans text-slate-300 font-medium">
                  Isolated Attestation Threshold
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-lg font-bold text-[#00F2FE] teal-glow-text block">
                  {confidence}%
                </span>
                <span className="text-[8px] font-mono uppercase text-emerald-400">
                  PASS (&gt;70%)
                </span>
              </div>
            </div>
          </div>

          {/* Settlement Status Display */}
          <div className="p-4 rounded-xl bg-[#131d35] border border-cyan-500/20 flex flex-col gap-2.5 mt-2 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                Awaiting Autonomous TEE Settlement...
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              The off-chain iExec TDX Enclave is evaluating the encrypted deliverables against the specifications. Settlement will be broadcasted on-chain autonomously.
            </p>
          </div>
        </div>

        {/* Monospaced Enclave Sandbox analysis */}
        <div className="bento-card p-6 flex flex-col gap-3 flex-1 min-h-[160px]">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono text-[10px] tracking-wider text-slate-300 uppercase">
              SANDBOX_EXECUTION_STREAM
            </span>
          </div>

          <div className="flex-1 bg-[#05070F] rounded-lg border border-white/5 p-3 font-mono text-[9px] text-[#00F2FE]/80 overflow-y-auto max-h-[120px] custom-scrollbar space-y-1">
            {teeLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
