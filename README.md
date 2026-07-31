# NoxEscrow 🛡️
**Confidential Freelance Escrow with Autonomous AI TEE Dispute Arbitration**

NoxEscrow is a privacy-first, milestone-based freelance escrow protocol built on the **iExec Nox Confidential Computing Layer** and deployed on **ETH Sepolia**. Every contract lifecycle—from budget terms, task descriptions, and repository permissions to submitted deliverables—is encrypted off-chain via the Nox SDK, stored as encrypted pointers on-chain, and matched to an **ERC-7984 confidential wrapping token (`cUSDC`)**.

If a client-freelancer dispute occurs, a secure, autonomous AI LLM Arbiter (powered by **Google Gemini 2.5 Flash**) is spun up on-demand inside an **Intel TDX Trusted Execution Environment (TEE)**. Granted transient read access to the encrypted contract files, chat history, and code assets via the on-chain Access Control List (ACL), the AI Agent privately evaluates deliverables against encrypted requirements and triggers the smart contract's deterministic release or refund mechanism.

---

## 🌟 Key Protocol Innovations

* 🔒 **Confidential ERC-7984 Payments (`cUSDC`):** Wraps standard public USDC into encrypted, confidential balances on-chain. Escrow budgets remain private to outside observers.
* 🔑 **Unified `escrowKey` Cryptography:** Every contract instance uses ONE single 256-bit symmetric key (`escrowKey`) derived from on-chain Nox KMS handles (`requirementsHash`). Protects requirements, deliverables, E2E chat history, and double-blind written reviews.
* 🤖 **Intel TDX Enclave AI Dispute Arbiter:** Runs inside hardware-isolated enclaves. Features XML-tag sandboxing to defeat prompt-injection attacks and outputs structured verdict JSON (`PAY_FREELANCER` vs `REFUND_CLIENT`) with requirement compliance scores (0–100).
* 🏆 **Global NERM Reputation Registry (`NoxEscrowReputation.sol`):** Tracks contractor reputation scores under zero-knowledge. Milestone completions add weighted reputation, while lost disputes apply an automated 500-point penalty.
* 💬 **Private E2E Chat & Double-Blind Reviews:** Client-freelancer communications and written feedback remain encrypted end-to-end. Written reviews are revealed only when both parties submit or after 14 days, preventing retaliation bias.
* 🚀 **1-Click Milestone Templates:** Built-in draft wizard templates for Web3 dApp Development, Smart Contract Security Audits, and UI/UX Design Systems.

---

## 📂 Repository Structure

```
NoxEscrow/
├── plans/                          # Specifications and architectural blueprints
│   ├── noxescrow-complete-plan.md
│   ├── component-1-smart-contracts.md
│   ├── component-2-tee-arbiter.md
│   └── component-3-frontend.md
│
├── smart-contracts/                # Component 1: Smart Contracts (Hardhat 3)
│   ├── contracts/
│   │   ├── NoxEscrowContract.sol   # Milestone state machine, releases & dispute hooks
│   │   ├── NoxEscrowFactory.sol    # UUPS proxy factory deploying EIP-1167 escrow clones
│   │   ├── NoxEscrowReputation.sol # UUPS proxy global NERM reputation registry
│   │   ├── ConfidentialUSDCToken.sol # ERC-7984 cUSDC wrapped token contract
│   │   ├── interfaces/             # Sol interfaces (INoxEscrowContract, Factory, Reputation)
│   │   └── mocks/                  # MockERC20, MockERC7984 & NoxProxy implementation
│   ├── scripts/
│   │   └── deploy.ts               # Automated deployer & address synchronizer
│   └── test/
│       └── NoxEscrow.test.ts       # Full unit & invariant integration test suite
│
├── arbiter/                        # Component 2: TEE AI Oracle & Listener
│   ├── src/
│   │   ├── listener.js             # On-chain DisputeOpened event monitor & reconciler
│   │   └── enclave-script.js       # Intel TDX TEE enclave script (Nox KMS + Gemini AI)
│   ├── Dockerfile                  # iExec TEE enclave environment packaging
│   └── .env.example                # Arbiter environment template
│
├── dApp/                           # Component 3: Frontend dApp (Vite + React 19 + Tailwind v4)
│   ├── src/
│   │   ├── components/             # Glassmorphic UI components, Header, Sidebar & Workspace
│   │   ├── pages/                  # Marketplace, EscrowVaults, ShieldedSwap, Profile & Admin
│   │   ├── services/               # Ethers, Supabase, Metadata & Nox KMS handle services
│   │   └── crypto/                 # Web3 WebCrypto PBKDF2 & AES-256-GCM file encryption
│   ├── vite.config.ts              # Vite configuration
│   └── .env.example                # dApp environment template
│
├── render.yaml                     # Render Cloud Webhook Listener deployment spec
├── feedback.md                     # Developer report & toolchain feedback
└── README.md                       # Protocol documentation manual
```

---

## 🛠️ Step-by-Step Setup & Deployment Guide

### Prerequisites
* **Node.js:** Version `>= v22.13.0` (Node `v26.2.0` recommended for Hardhat compilation compatibility).
* **NVM:** Easily switch Node versions:
  ```bash
  nvm use 26.2.0
  ```

---

### Step 1: Install Dependencies
Install npm modules in each workspace folder:
```bash
# Install smart contract dependencies
npm install --prefix smart-contracts

# Install arbiter dependencies
npm install --prefix arbiter

# Install frontend dApp dependencies
npm install --prefix dApp
```

---

### Step 2: Environment Configuration

#### 1. Smart Contracts (`smart-contracts/.env`)
Create `smart-contracts/.env`:
```env
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
PRIVATE_KEY="0x..." # Deployer private key
TEE_ARBITER="0x74B4134C8d527a8D8AE8cb9503ab2043bCfC0ffd" # TEE Oracle wallet address
PUBLIC_USDC_ADDRESS="0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590" # ETH Sepolia public USDC
```

#### 2. TEE Arbiter (`arbiter/.env`)
Create `arbiter/.env`:
```env
RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
ESCROW_FACTORY_ADDRESS="0xE14BF8F83690ABcd0A74b299DF1cb3055d323537"
IEXEC_RUNNER_ENDPOINT="http://127.0.0.1:3000/trigger-task"
TEE_ARBITER_PRIVATE_KEY="0x..." # TEE Oracle gas funding private key
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-anon-key"
GOOGLE_APPLICATION_CREDENTIALS="/etc/secrets/gcp-key.json"
VERTEX_PROJECT_ID="your-gcp-project-id"
VERTEX_LOCATION="us-central1"
```

#### 3. Frontend dApp (`dApp/.env`)
Create `dApp/.env`:
```env
VITE_PRIVY_APP_ID="your-privy-app-id"
VITE_NOX_ESCROW_FACTORY="0xE14BF8F83690ABcd0A74b299DF1cb3055d323537"
VITE_CUSDC_TOKEN="0x85601895391541846b8Be994F00D1f7f17a878db"
VITE_TEE_ARBITER="0x74B4134C8d527a8D8AE8cb9503ab2043bCfC0ffd"
VITE_GATEWAY_URL="https://gateway-testnets.noxprotocol.dev"
VITE_PINATA_JWT="your-pinata-jwt-token"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_KEY="your-supabase-anon-key"
```

---

### Step 3: Compile & Deploy Smart Contracts

1. **Compile contracts:**
   ```bash
   npm run compile --prefix smart-contracts
   ```

2. **Deploy to network:**
   ```bash
   npm run deploy --prefix smart-contracts
   ```
   *This script deploys the cUSDC token wrapper, logic implementations, factory, and reputation registry UUPS proxies, links their associations, and **automatically synchronizes deployed addresses** into `dApp/src/contracts/addresses.json`, `dApp/.env`, and `arbiter/.env`.*

---

### Step 4: Run the Off-chain TEE Webhook Listener

```bash
npm run listener --prefix arbiter
```
The listener runs continuously, catching `DisputeOpened` events on-chain and triggering the Intel TDX TEE evaluation process (`enclave-script.js`).

---

### Step 5: Run & Build the Frontend dApp

1. **Launch development server:**
   ```bash
   npm run dev --prefix dApp
   ```
2. **Compile production build:**
   ```bash
   npm run build --prefix dApp
   ```

---

### Step 6: Wrap Public USDC to cUSDC & Use Protocol

1. Navigate to the **Shielded Swap** tab in the top navigation bar.
2. Enter the amount of public `USDC` to wrap, click **Approve**, and then click **Wrap to cUSDC**.
3. Create new escrow agreements via **Deploy Escrow** using 1-click preset templates.
4. Interact with milestones, upload encrypted deliverables, chat privately E2E, and raise disputes on-demand to invoke the Intel TDX TEE AI Arbiter.

---

## ☁️ Cloud Production Deployment

### Webhook Listener (Render)
Deploy the listener daemon to **Render** using the root `render.yaml` specification:
1. Connect your repository to Render.
2. Select **Blueprint** deployment using `render.yaml`.
3. Mount your GCP Service Account JSON key at `/etc/secrets/gcp-key.json` for Vertex AI ADC authentication.

### Frontend dApp (Vercel)
Deploy `dApp/` directly to **Vercel**:
```bash
npx vercel --cwd dApp
```

---

## 🧪 Integration & Fuzz Testing

Execute the Hardhat unit and invariant test suite:
```bash
npm run test --prefix smart-contracts
```

---

## 📑 Feedback & Protocol Roadmap

Refer to [feedback.md](feedback.md) in the workspace root for detailed critiques regarding the development experience with `@iexec-nox/nox-protocol-contracts`, toolchain analysis, and future scaling roadmaps.
