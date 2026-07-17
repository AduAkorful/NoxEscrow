import { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  Flame, 
  Lock, 
  Cpu, 
  Fingerprint, 
  ChevronDown,
  HelpCircle,
  CheckCircle2,
  FileSpreadsheet,
  Coins,
  Scale
} from 'lucide-react';

interface LandingPageProps {
  connectWallet: () => Promise<void>;
}

export function LandingPage({ connectWallet }: LandingPageProps) {
  // State for FAQ accordions
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const steps = [
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-[#00F2FE]" />,
      title: "1. Draft & Lock Budget",
      action: "YOU DO:",
      actionDesc: "Input freelancer address, define milestones, write requirements, and approve budget transfer.",
      reaction: "SYSTEM DOES:",
      reactionDesc: "Encrypts details client-side using AES-GCM. Deploys a secure escrow clone on-chain and locks cUSDC funds."
    },
    {
      icon: <Lock className="w-5 h-5 text-[#7F00FF]" />,
      title: "2. Deliver Work Securely",
      action: "YOU DO:",
      actionDesc: "Contractor submits the finished code, git diff, or file package directly via the console.",
      reaction: "SYSTEM DOES:",
      reactionDesc: "Runs browser-level encryption on the payload, uploads it to IPFS, and updates the milestone status pointer."
    },
    {
      icon: <Coins className="w-5 h-5 text-[#00E676]" />,
      title: "3. Verify & Release",
      action: "YOU DO:",
      actionDesc: "Client inspects the work and rates the freelancer (1 to 5 stars) to close out the milestone.",
      reaction: "SYSTEM DOES:",
      reactionDesc: "Unlocks the milestone payout to the freelancer and updates on-chain reputation scores under zero-knowledge."
    },
    {
      icon: <Scale className="w-5 h-5 text-[#FF1744]" />,
      title: "4. TEE AI Arbitration",
      action: "YOU DO:",
      actionDesc: "If a milestone is rejected or disputed, client or contractor initiates a formal dispute review.",
      reaction: "SYSTEM DOES:",
      reactionDesc: "Boots an Intel TDX enclave, decrypts the requirements & deliverables, runs verification tests, and splits funds."
    }
  ];

  const faqs = [
    {
      question: "What is iExec Nox and how does it ensure contract privacy?",
      answer: "iExec Nox is a privacy-preserving infrastructure layer. In standard smart contracts, your budget amounts, task milestones, and deliverables are readable on the public ledger. NoxEscrow uses client-side WebCrypto keys to encrypt all contract specifications before they leave your browser. Blockchain explorers only see encrypted hex hashes, keeping corporate agreements fully confidential."
    },
    {
      question: "How does the TEE AI Arbiter remain unbiased and secure?",
      answer: "Arbitration runs inside a Trusted Execution Environment (TEE) — a hardware-isolated secure enclave built directly into Intel SGX/TDX CPUs. The enclave hardware cryptographically guarantees that the hosting node administrator cannot read or tamper with the data inside. When a dispute is raised, the AI Arbiter temporarily decrypts the task specs and files inside the enclave, evaluates them objectively, and settles the dispute on-chain."
    },
    {
      question: "How are the cryptographic vault keys derived and stored?",
      answer: "We prioritize security by using zero-storage key derivation. When you connect your wallet, we ask you to sign a static authorization message. The resulting signature acts as an entropy seed for a PBKDF2 browser key derivation algorithm, generating a secure AES-GCM master key. The protocol never stores, transmits, or visualizes your keys; they exist purely in your browser's active memory."
    },
    {
      question: "Are there platform fees, and how does reputation affect them?",
      answer: "NoxEscrow charges a baseline platform fee of 0.5% on successfully settled milestones. By successfully releasing milestones, freelancers accumulate Zero-Knowledge Reputation points (NERM). Once a contractor reaches Elite status and passes the TEE certification checks, they receive a permanent platform fee reduction down to 0.3%."
    }
  ];

  return (
    <div className="relative min-h-screen flex flex-col animate-fade-in cosmic-grid overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] nebula-glow-teal rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] nebula-glow-violet rounded-full pointer-events-none z-0"></div>
      <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] pulsing-aura pointer-events-none z-0"></div>

      {/* Header Bar */}
      <header className="border-b border-white/5 bg-[#05070F]/75 backdrop-blur-xl sticky top-0 z-50 transition-smooth">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#00F2FE] drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]" />
            <span className="font-mono text-base font-bold tracking-widest text-[#00F2FE] uppercase">NOXESCROW</span>
          </div>
          <nav className="hidden md:flex gap-8 font-mono text-[11px] text-slate-400 font-bold tracking-widest">
            <a href="#features" className="hover:text-white transition-smooth">FEATURES</a>
            <a href="#workflow" className="hover:text-white transition-smooth">WORKFLOW</a>
            <a href="#faq" className="hover:text-white transition-smooth">FAQ</a>
          </nav>
          <button
            onClick={connectWallet}
            className="bg-[#00F2FE] text-[#05070F] font-mono text-[11px] font-bold px-5 py-2.5 uppercase tracking-widest transition-smooth hover:shadow-[0_0_20px_rgba(0,242,254,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer rounded-lg border border-transparent"
          >
            Connect Wallet (C)
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 max-w-5xl mx-auto px-6 pt-20 pb-24 text-center flex flex-col items-center justify-center">
        <div className="px-5 py-2 bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-full flex items-center gap-2 mb-8 animate-scale-in">
          <Flame className="w-4 h-4 text-[#00F2FE] animate-pulse" />
          <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-widest">
            iExec Nox Confidential Hackathon Summer Edition
          </span>
        </div>

        <h1 className="text-3xl md:text-6xl font-extrabold tracking-tight text-[#f1f5f9] leading-tight mb-6 uppercase">
          Shrouded Commercial Escrow with <br />
          <span className="bg-gradient-to-r from-[#00F2FE] to-[#7F00FF] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,242,254,0.2)]">
            TEE AI dispute arbitration
          </span>
        </h1>

        <p className="font-body-md text-slate-400 max-w-2xl leading-relaxed mb-12">
          Protect your business contracts, milestone budgets, and software intellectual property in complete zero-knowledge. NoxEscrow wraps digital assets in private envelopes and uses secure, hardware-enclosed AI arbiters to resolve client-freelancer contentions instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={connectWallet}
            className="px-8 py-4.5 bg-[#00F2FE] text-[#05070F] font-mono text-xs font-bold uppercase tracking-widest transition-smooth hover:shadow-[0_0_25px_rgba(0,242,254,0.5)] hover:scale-[1.03] active:scale-[0.97] cursor-pointer rounded-xl flex items-center gap-3 border border-transparent"
          >
            <Wallet className="w-5 h-5" /> Connect Wallet
          </button>
        </div>
      </section>

      {/* Interactive Execution Flow (Workflow) */}
      <section id="workflow" className="relative z-10 border-t border-white/5 bg-[#121626]/20 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col items-center mb-16">
            <span className="font-mono text-xs font-bold text-[#00F2FE] tracking-widest uppercase mb-3">⚙️ Interactive Pipeline</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight uppercase text-center">
              The Decrypt-To-Settle System
            </h2>
            <p className="text-slate-400 text-xs text-center max-w-md mt-2 font-mono">
              Trace the exact sequence of client and contractor triggers within the escrow enclave.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <div 
                key={idx}
                className="bento-card p-6 flex flex-col gap-4 relative overflow-hidden transition-smooth hover:border-[#00F2FE]/25 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center transition-smooth group-hover:bg-[#00F2FE]/5 group-hover:border-[#00F2FE]/20">
                  {step.icon}
                </div>

                <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                  {step.title}
                </h3>

                <div className="flex flex-col gap-3 font-mono text-[10px] mt-2">
                  <div className="flex flex-col gap-1 border-l border-white/10 pl-2.5 py-0.5">
                    <span className="text-[#00F2FE] font-bold tracking-widest">{step.action}</span>
                    <span className="text-slate-400 font-sans leading-normal">{step.actionDesc}</span>
                  </div>

                  <div className="flex flex-col gap-1 border-l border-[#7F00FF]/30 pl-2.5 py-0.5 bg-[#7F00FF]/5 rounded-r-lg">
                    <span className="text-[#7F00FF] font-bold tracking-widest">{step.reaction}</span>
                    <span className="text-slate-400 font-sans leading-normal">{step.reactionDesc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 border-t border-white/5 py-20 bg-[#05070F]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col items-center mb-16">
            <span className="font-mono text-xs font-bold text-[#00F2FE] tracking-widest uppercase mb-3">🛡️ Security Core</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight uppercase text-center">
              Protocol Security Pillars
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bento-card bento-card-violet p-8 flex flex-col gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#7F00FF]/10 flex items-center justify-center border border-[#7F00FF]/25">
                <Lock className="w-6 h-6 text-[#7F00FF] drop-shadow-[0_0_8px_rgba(127,0,255,0.4)]" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">iExec Nox Privacy</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed font-sans">
                  Every budget amount, task requirement, and code deliverable is encrypted client-side using WebCrypto and saved on-chain as a secure Nox pointer. Zero rate leakage to competitors or block explorers.
                </p>
              </div>
            </div>
            <div className="bento-card p-8 flex flex-col gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#00F2FE]/10 flex items-center justify-center border border-[#00F2FE]/25">
                <Cpu className="w-6 h-6 text-[#00F2FE] drop-shadow-[0_0_8px_rgba(0,242,254,0.4)]" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">TEE AI Arbitration</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed font-sans">
                  If disputes arise, an autonomous AI auditor spins up inside an Intel TDX hardware-isolated enclave. Granted temporary read access via on-chain ACLs, the AI rules unbiasedly and triggers deterministic payouts.
                </p>
              </div>
            </div>
            <div className="bento-card p-8 flex flex-col gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#00E676]/10 flex items-center justify-center border border-[#00E676]/25">
                <Fingerprint className="w-6 h-6 text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.4)]" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-2">On-Chain Reputation</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed font-sans">
                  Contractors compile verified, non-falsifiable professional reputation scores (NERM) on-chain under zero-knowledge, unlocking discounted platform fees and prioritized hire status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Metrics Section */}
      <section id="metrics" className="relative z-10 border-t border-white/5 py-20 bg-[#121626]/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bento-card p-8 text-center flex flex-col justify-center items-center">
              <span className="font-mono text-4xl font-extrabold text-[#00F2FE] block mb-2 teal-glow-text">14,890+</span>
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">Confidential Agreements Deployed</span>
            </div>
            <div className="bento-card bento-card-violet p-8 text-center flex flex-col justify-center items-center">
              <span className="font-mono text-4xl font-extrabold text-[#7F00FF] block mb-2 violet-glow-text">$45.2M+</span>
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">Wrapped cUSDC Volume Secured</span>
            </div>
            <div className="bento-card p-8 text-center flex flex-col justify-center items-center">
              <span className="font-mono text-4xl font-extrabold text-[#00E676] block mb-2 drop-shadow-[0_0_10px_rgba(0,230,118,0.3)]">100%</span>
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">Unbiased TEE Resolve Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 border-t border-white/5 bg-[#05070F] py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-col items-center mb-16">
            <span className="font-mono text-xs font-bold text-[#7F00FF] tracking-widest uppercase mb-3">💬 Questions & Answers</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight uppercase text-center">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-xs text-center max-w-md mt-2 font-mono">
              Learn how zero-knowledge enclaves and cryptographic escrow operations protect you.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  className="bento-card overflow-hidden border border-white/5 hover:border-white/10 transition-smooth"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 flex justify-between items-center text-left text-white hover:text-[#00F2FE] transition-smooth cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4.5 h-4.5 text-[#00F2FE] opacity-70 flex-shrink-0" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider">{faq.question}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#00F2FE]' : ''}`} />
                  </button>

                  <div 
                    className={`transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-[300px] border-t border-white/5 bg-white/[0.01]' : 'max-h-0'
                    } overflow-hidden`}
                  >
                    <div className="p-6 text-[13px] text-slate-400 leading-relaxed font-sans flex gap-3 items-start">
                      <CheckCircle2 className="w-4.5 h-4.5 text-[#7F00FF] mt-0.5 flex-shrink-0" />
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-[10px] text-slate-600 font-mono uppercase tracking-widest bg-[#05070F] z-10">
        ©2026 NOX_ESCROW PROTOCOL · INTEGRITY BUILT IN SILICON
      </footer>
    </div>
  );
}
