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
└── dApp/                           # Component 3: Frontend dApp (Vite + React)
    ├── src/
    │   ├── components/             # Polished shadcn/ui components
    │   └── crypto/                 # Web3 wallet message signature + AES-GCM local file crypto
    └── vite.config.ts              # Vite configuration (pure client-side)
```

---

## 🛠️ Step-by-Step Setup & Deployment Guide

Follow these steps to deploy, run, and test NoxEscrow locally or on live networks.

### Prerequisites
*   **Node.js Version:** You **must** use Node.js `v22.13.0` or later (Node `v26.2.0` is highly recommended for Hardhat compilation compatibility).
*   Use `nvm` to easily switch Node versions:
    ```bash
    nvm use 26.2.0
    ```

---

### Step 1: Install Dependencies
Install npm modules inside each workspace folder:
```bash
# Install smart contract dependencies
npm install --prefix smart-contracts

# Install arbiter dependencies
npm install --prefix arbiter

# Install frontend dApp dependencies
npm install --prefix dApp
```

---

### Step 2: Compile & Deploy Smart Contracts
1.  **Compile the contracts:**
    ```bash
    npm run compile --prefix smart-contracts
    ```
2.  **Deploy contracts:**
    ```bash
    npm run deploy --prefix smart-contracts
    ```
    *This script deploys the mock USDC token, implementations, factory and reputation registry UUPS proxies, links their associations, and **automatically synchronizes the deployed addresses** inside both `dApp/src/contracts/addresses.json` and your frontend environment file `dApp/.env`.*

---

### Step 3: Run the Off-chain TEE Webhook Listener
The Webhook Listener acts as the bridge that listens for on-chain disputes and triggers the hardware enclave process:
1.  **Configure Environment:** Copy `arbiter/.env.example` to `arbiter/.env` if it has not been auto-provisioned (the deploy script will try to create and align it with correct contract addresses automatically!).
2.  **Run the listener:**
    ```bash
    npm run listener --prefix arbiter
    ```

---

### Step 4: Run & Build the Frontend dApp
1.  **Launch local development server:**
    ```bash
    npm run dev --prefix dApp
    ```
2.  **Compile production-optimized build:**
    ```bash
    npm run build --prefix dApp
    ```
    *This runs strict TypeScript and ESLint audits before outputting optimized bundles in `dApp/dist/`.*

---

### Step 5: Wrap public USDC to cUSDC via the Swap Portal
Clients who arrive with standard public `USDC` can easily swap their tokens in-app for confidential, wrapped `cUSDC`:
1. Navigate to the **Swap Portal** tab in the Sidebar.
2. Enter the amount of `USDC` to wrap, click **Approve** (to authorize the wrapper contract), and then click **Wrap to cUSDC**.
3. Once uncompleted milestones are settled or mutually cancelled, contractors or clients can unwrap `cUSDC` back to public `USDC` instantly in a single on-chain transaction by flipping the swap direction and clicking **Unwrap to USDC**.

---

## 🧪 Testing the Protocol Suite
You can execute our exhaustive integration and fuzzing suites using Hardhat:
```bash
# Runs the full Hardhat unit and invariant test suite (Requires local Docker running)
npm run test --prefix smart-contracts
```

---

## 📑 Feedback & Roadmap
Refer to our comprehensive developer report [feedback.md](feedback.md) in the workspace root for detailed critiques regarding the development experience with `@iexec-nox/nox-protocol-contracts`, toolchain limitations (such as lack of Foundry support), and future scaling roadmaps.
