import { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  Sparkles, 
  Lock, 
  ChevronDown,
  FileSpreadsheet,
  Coins,
  Scale,
  ArrowRight
} from 'lucide-react';

interface LandingPageProps {
  connectWallet: () => Promise<void>;
  walletAddress?: string | null;
  onLaunchApp?: () => void;
}

export function LandingPage({ connectWallet, walletAddress, onLaunchApp }: LandingPageProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const steps = [
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-[#38BDF8]" />,
      title: "1. Draft & Lock Budget",
      action: "YOU DO:",
      actionDesc: "Input freelancer address, define milestones, write requirements, and approve budget transfer.",
      reaction: "SYSTEM DOES:",
      reactionDesc: "Encrypts details client-side using AES-GCM. Deploys a secure escrow clone on-chain and locks cUSDC funds."
    },
    {
      icon: <Lock className="w-5 h-5 text-purple-400" />,
      title: "2. Deliver Work Securely",
      action: "YOU DO:",
      actionDesc: "Contractor submits the finished code, git diff, or file package directly via the console.",
      reaction: "SYSTEM DOES:",
      reactionDesc: "Runs browser-level encryption on the payload, uploads it to IPFS, and updates the milestone status pointer."
    },
    {
      icon: <Coins className="w-5 h-5 text-emerald-400" />,
      title: "3. Verify & Release",
      action: "YOU DO:",
      actionDesc: "Client inspects the work and rates the freelancer (1 to 5 stars) to close out the milestone.",
      reaction: "SYSTEM DOES:",
      reactionDesc: "Unlocks the milestone payout to the freelancer and updates on-chain reputation scores under zero-knowledge."
    },
    {
      icon: <Scale className="w-5 h-5 text-rose-400" />,
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
    <div className="relative min-h-screen flex flex-col animate-fade-in overflow-hidden">
      
      {/* Header Bar (Only visible if standalone, otherwise main header handles it) */}
      {!walletAddress && (
        <header className="border-b border-white/[0.08] bg-[#0B0E17]/80 backdrop-blur-2xl sticky top-0 z-50 transition-all">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#38BDF8]" />
              </div>
              <span className="font-bold text-lg text-white">Nox<span className="shiny-text">Escrow</span></span>
            </div>

            <nav className="hidden md:flex gap-8 text-xs font-semibold text-slate-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </nav>

            <button
              onClick={connectWallet}
              className="btn-uniswap-primary px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Wallet className="w-4 h-4" /> Connect Wallet
            </button>
          </div>
        </header>
      )}

      {/* Hero Section */}
      <section className="relative z-10 flex-1 max-w-5xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center justify-center">
        <div className="px-4 py-1.5 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center gap-2 mb-8 shadow-inner">
          <Sparkles className="w-4 h-4 text-[#38BDF8] animate-pulse" />
          <span className="text-xs font-medium text-slate-300">
            Powered by iExec TEE Zero-Knowledge Confidential Computing
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-none mb-6">
          Encrypted Escrow & <br />
          <span className="shiny-text">TEE AI Dispute Settlement</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed mb-10">
          Protect commercial contracts, milestone budgets, and deliverables in zero-knowledge. NoxEscrow locks funds on-chain while hardware-isolated TEE AI arbiters resolve disputes objectively.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {walletAddress && onLaunchApp ? (
            <button
              onClick={onLaunchApp}
              className="btn-uniswap-primary px-8 py-4 text-base flex items-center gap-2 cursor-pointer shadow-2xl"
            >
              Go to Escrow Vaults <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={connectWallet}
              className="btn-uniswap-primary px-8 py-4 text-base flex items-center gap-2 cursor-pointer shadow-2xl"
            >
              <Wallet className="w-5 h-5" /> Launch dApp & Connect Wallet
            </button>
          )}
        </div>
      </section>

      {/* Workflow Steps Section */}
      <section id="workflow" className="relative z-10 border-t border-white/[0.08] bg-[#0B0E17]/60 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider">Protocol Pipeline</span>
            <h2 className="text-3xl font-extrabold text-white mt-2">How NoxEscrow Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="uniswap-card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-white text-base">{step.title}</h3>
                </div>
                <div className="text-xs space-y-2 bg-[#131826]/60 p-4 rounded-2xl border border-white/[0.06]">
                  <div>
                    <span className="font-bold text-slate-300">{step.action} </span>
                    <span className="text-slate-400">{step.actionDesc}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#38BDF8]">{step.reaction} </span>
                    <span className="text-slate-400">{step.reactionDesc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="relative z-10 border-t border-white/[0.08] py-20 max-w-4xl mx-auto px-6 w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="uniswap-card p-5 cursor-pointer" onClick={() => toggleFaq(idx)}>
              <div className="flex justify-between items-center font-bold text-white text-sm">
                <span>{faq.question}</span>
                <ChevronDown className={`w-4 h-4 text-[#38BDF8] transition-transform ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
              </div>
              {openFaqIndex === idx && (
                <p className="text-xs text-slate-400 leading-relaxed mt-3 pt-3 border-t border-white/[0.06]">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
