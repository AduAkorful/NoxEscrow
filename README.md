# NoxEscrow 🛡️
**Confidential Freelance Escrow with Secure AI TEE-Dispute Arbitration**

NoxEscrow is a privacy-first, milestone-based freelance escrow dApp built on the **iExec Nox Confidential Computing Layer** and deployed on **ETH Sepolia**. Every contract lifecycle—from budget terms, task descriptions, and repository permissions to submitted deliverables—is encrypted off-chain via the Nox JS SDK, stored as encrypted pointers on-chain, and matched to an ERC-7984 confidential wrapping token (`cUSDC`). 

If a client-freelancer dispute occurs, a secure, autonomous AI LLM Arbiter is spun up on-demand inside an **Intel TDX Trusted Execution Environment (TEE)**. Granted transient read access to the encrypted contract files and code assets via the on-chain Access Control List (ACL), the AI Agent privately evaluates the deliverables against the encrypted requirements and triggers the smart contract's deterministic release or refund mechanism.

---

## 📂 Repository Structure

```
NoxEscrow/
├── plans/                          # Core blueprints and specifications
│   ├── noxescrow-complete-plan.md
│   ├── component-1-smart-contracts.md
│   ├── component-2-tee-arbiter.md
│   └── component-3-frontend.md
│
├── smart-contracts/                # Component 1: Smart Contracts (Hardhat 3)
│   ├── contracts/
│   │   ├── NoxEscrowContract.sol   # State machine, releases, and dispute raising
│   │   ├── NoxEscrowFactory.sol    # Escrow deployment registry
│   │   └── NoxEscrowReputation.sol # Global decrypted NERM score keeper
│   └── test/
│       └── NoxEscrow.test.ts       # Hardhat tests utilizing local Docker stack
│
├── arbiter/                        # Component 2: TEE AI Oracle & Listener
│   ├── src/
│   │   ├── listener.js             # Event listener catching DisputeOpened on-chain
│   │   └── enclave-script.js       # Secured code evaluation script running inside TEE
│   └── Dockerfile                  # iExec TEE enclave environment packaging
│
└── web/                            # Component 3: Frontend dApp (Vite + React)
    ├── src/
    │   ├── components/             # Polished shadcn/ui components
    │   └── crypto/                 # Web3 wallet message signature + AES-GCM local file crypto
    └── vite.config.ts              # Vite configuration (pure client-side)
```

---

## 🛠️ Quick Start & Development

To setup and compile each component, refer to the individual component plans:
*   [Smart Contracts (Solidity Layer)](plans/component-1-smart-contracts.md)
*   [TEE AI Arbiter (Off-chain Enclave)](plans/component-2-tee-arbiter.md)
*   [Frontend dApp (Client-side UI)](plans/component-3-frontend.md)
