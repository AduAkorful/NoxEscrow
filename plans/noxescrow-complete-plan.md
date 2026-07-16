# NoxEscrow — Complete Research, Architecture, and Development Blueprint
**Confidential Freelance Escrow with Secure AI TEE-Dispute Arbitration**

*   **Hackathon Context:** WTF !! hackathon summer edition (iExec Nox)
*   **Target Network:** Ethereum / Arbitrum Sepolia
*   **Submission Deadline:** August 1, 2026 (21:59 UTC)
*   **Document Version:** 1.0.0 (Production Blueprint)

---

## Table of Contents
1. [Product Definition](#1-product-definition)
2. [Pillar-by-Pillar Win Strategy](#2-pillar-by-pillar-win-strategy)
3. [Legal & Compliance Framework](#3-legal-compliance-framework)
4. [Core Mechanic Decisions](#4-core-mechanic-decisions)
5. [Scoring, Dispute, & Fee Architecture](#5-scoring-dispute--fee-architecture)
6. [UX & Design System Decisions](#6-ux--design-system-decisions)
7. [Retention & Engagement Engineering](#7-retention--engagement-engineering)
8. [Viral & Growth Mechanics](#8-viral--growth-mechanics)
9. [Information Architecture & Data Model](#9-information-architecture--data-model)
10. [Complete Screen Map & User Flows](#10-complete-screen-map--user-flows)
11. [Risk Register](#11-risk-register)
12. [Marketing & Launch Playbook](#12-marketing--launch-playbook)
13. [Execution Timeline (17-Day Sprint)](#13-execution-timeline-17-day-sprint)
14. [Presentation & Submission Strategy](#14-presentation--submission-strategy)
15. [Final Decision Matrix](#15-final-decision-matrix)

---

## 1. Product Definition

**NoxEscrow** is a privacy-first, milestone-based freelance escrow dApp built on the **iExec Nox Confidential Computing Layer** and deployed on **ETH Sepolia**. Every contract lifecycle—from budget terms, task descriptions, and repository permissions to submitted deliverables—is encrypted off-chain via the Nox JS SDK, stored as encrypted pointers on-chain, and matched to an ERC-7984 confidential wrapping token (`cUSDC`). If a client-freelancer dispute occurs, a secure, autonomous AI LLM Arbiter is spun up on-demand inside an **Intel TDX Trusted Execution Environment (TEE)**. Granted transient read access to the encrypted contract files and code assets via the on-chain Access Control List (ACL), the AI Agent privately evaluates the deliverables against the encrypted requirements and triggers the smart contract's deterministic release or refund mechanism. 

The name "**NoxEscrow**" operates on two distinct layers:
*   **Layer 1 (The Tech):** "Nox" references the iExec Nox Protocol, signifying that all escrow volumes, contract amounts, and strategic parameters are shrouded in darkness (night/nox) from public explorers, bots, and front-runners.
*   **Layer 2 (The Purpose):** "Escrow" represents the classic, neutral third-party holding mechanism, now upgraded with secure hardware and zero human-bias AI to provide dispute resolution in the micro-to-medium transaction range ($10–$10k) where traditional legal or human arbitration is economically non-viable.

---

## 2. Pillar-by-Pillar Win Strategy

### Pillar 1: Project Creativity & Innovation (Weight: ⭐⭐⭐ / 3)
*   **Sub-criterion 1 — Uniqueness of Combination:** NoxEscrow combines milestone-based payments with autonomous, TEE-secure AI dispute resolution, a pairing that solves the Web3 "transparency blocker" for real B2B contracts.
*   **Sub-criterion 2 — Relevance of Stack Advantage:** Unlike standard public blockchains where IP and contracts leak, NoxEscrow uses iExec Nox's unique hardware enclaves and on-chain ACLs to make confidential AI adjudication possible.

### Pillar 2: End-to-End Functionality (Weight: ⭐⭐⭐ / 3)
*   **Sub-criterion 1 — Absolute No-Mock Execution:** The dApp will feature fully working, live smart contracts on ETH Sepolia, executing true off-chain encryption/decryption, processing actual ERC-7984 cUSDC deposits, and invoking live TEE enclaves to output dispute decisions.
*   **Sub-criterion 2 — Production-Ready Demos:** User-facing frontend allows complete flows: creating agreements, encrypting milestones, uploading files, raising disputes, and retrieving funds, without short-circuiting states with dummy results.

### Pillar 3: ETH Sepolia Deployment (Weight: ⭐⭐ / 2)
*   **Sub-criterion 1 — Flawless On-Chain Integration:** The core escrow factory, dispute orchestrator, and ERC-7984 wrappers will be deployed on Sepolia, verifiable on standard block explorers via encrypted handles.
*   **Sub-criterion 2 — Optimal Gas and State Efficiency:** Leverages modular design patterns to keep heavy verification proofs externalized while maintaining strict consistency with the Nox KMS.

### Pillar 4: Developer Feedback (Weight: ⭐⭐ / 2)
*   **Sub-criterion 1 — Constructive and Actionable Critique:** We will commit a thorough `feedback.md` in the root repository. It will detail the developer experience using `@iexec-nox/nox-protocol-contracts`, Hardhat plugins, compilation overheads, handle permissioning complexities, and documentation gaps.
*   **Sub-criterion 2 — Developer Tooling Roadmap Suggestions:** Proposes specific API improvement suggestions (such as simplified batch ACL permissioning) to help iExec refine its suite for future enterprise adoption.

### Pillar 5: Presentation & Pitch Video (Weight: ⭐⭐ / 2)
*   **Sub-criterion 1 — Clear, Jargon-Free Problem Hook:** The video starts with a 30-second explanation of why traditional on-chain escrows fail enterprise clients (transparency/IP leak) and how NoxEscrow solves this.
*   **Sub-criterion 2 — Live, Uninterrupted Flow Capture:** Showcase a complete, smooth 3-minute screen capture of an actual escrow contract disputation, TEE initialization, and AI-driven automated payout.

### Pillar 6: Technical Implementation (Weight: ⭐ / 1)
*   **Sub-criterion 1 — Clean Primitives Integration:** Expert usage of `euint256`, `Nox.fromExternal`, `Nox.add`, `Nox.sub`, `Nox.allowThis`, and `Nox.allow` within Solidity, adhering strictly to the transient access state rules.
*   **Sub-criterion 2 — Off-chain SDK Synergy:** Synchronizes the React frontend with the `iexec-nox-js-sdk` to guarantee zero plaintext leak from the client's browser.

### Pillar 7: User Experience / UX (Weight: ⭐ / 1)
*   **Sub-criterion 1 — Zero-Friction Web3 Wallet Support:** No custom wallets or complex configurations. Users use MetaMask or Rabby seamlessly while cryptographic proofs are generated in the background.

---

## 3. Legal & Compliance Framework

NoxEscrow operates in a B2B and peer-to-peer capacity, holding funds in a digital vault until contractually defined milestones are completed.

### Classification & Legal Status
*   **Classification:** Decentralized Commercial Escrow & Automated Arbitration Service.
*   **Jurisdiction Jurisdiction Tests:** Predominant Factor Test (US/EU). Since payments are tied 100% to verifiable intellectual labor (software development, design, copywriting) and not chance, the system is strictly classified as a **utility service contract**, not a wagering or financial betting application.
*   **Compliance with Securities Regulations:** NoxEscrow utilizes non-custodial smart contracts and wraps standard, pre-approved stablecoins (`USDC`). The dApp does not issue yields, staking rewards, or interest-bearing tokens, completely avoiding classification as a security or investment contract (Howey Test).

### Privacy & Data Protection (GDPR / CCPA)
Because all contract details, milestone names, and file paths are stored as encrypted handles on-chain, **GDPR's "Right to be Forgotten" is mathematically satisfied**. 
1. The plaintext files live in private, encrypted decentralized storage (such as IPFS/Arweave or local nodes).
2. If a user deletes their off-chain decryption keys, the on-chain handles become permanently un-decryptable (equivalent to a cryptographic shredding/deletion).

### Product Language Guidelines
*   **USE Strenuously:** "Confidential Milestones", "Secured Escrow", "Objective AI Dispute Resolution", "Verifiable TEE Arbitration", "Reputation-Backed Contracts", "Commercial Escrow Payouts".
*   **AVOID Explicitly:** "Staking", "Betting", "Luck", "Casinos", "Guaranteed Profits", "Risk-free Payouts".

---

## 4. Core Mechanic Decisions

### Decision A: Payout Budget Encryption & Transfer
*   **Options Considered:**
    | Option | Pros | Cons |
    | :--- | :--- | :--- |
    | **A: Transparent ERC-20** | Cheap gas; direct integration with standard Uniswap/Aave. | Violates commercial privacy. Competitors can see exactly how much a company pays contractors. |
    | **B: Fully Encrypted ERC-7984** | 100% private balances and payout volumes. No public leak. | Requires off-chain encryption and proof-of-ownership management. |
*   **Chosen Option:** **Option B (ERC-7984 Wrapped Token cUSDC)**.
*   **Reasoning:** To achieve first-rate commercial utility, the budget size of the escrow contract must remain confidential. Leveraging ERC-7984 keeps payout sizes hidden while preserving composability on-chain.

### Decision B: Milestone & Deliverable Verification
*   **Options Considered:**
    | Option | Pros | Cons |
    | :--- | :--- | :--- |
    | **A: Human Multi-Sig / Kleros** | Human-in-the-loop flexibility. | Extremely slow (days/weeks), expensive fee overheads, and leaks IP/source-code to public jurors. |
    | **B: Automated AI Agent in TEE** | Instant execution (minutes), extremely low fee (~$0.10 in gas), and complete code confidentiality inside hardware enclaves. | Requires secure off-chain orchestrators and API oracle keys. |
*   **Chosen Option:** **Option B (Automated AI Agent inside an Intel TDX TEE Enclave)**.
*   **Reasoning:** By executing the LLM prompt inside a hardware-isolated enclave, the freelancer's code deliverables and intellectual property are evaluated securely without any human ever looking at the code, solving both speed and intellectual property leakage.

### Decision C: Access Control and Key Management (ACL)
*   **Options Considered:**
    | Option | Pros | Cons |
    | :--- | :--- | :--- |
    | **A: Public Viewers** | Simple smart contract design. | No privacy; anyone can inspect the handle. |
    | **B: Selective On-Chain ACL** | Dynamic, granular read permission management via Nox `Nox.allow()`. | Developers must be disciplined with state calls to prevent lockouts. |
*   **Chosen Option:** **Option B (Selective On-Chain ACL)**.
*   **Reasoning:** This is Nox's superpower. The escrow contract can lock the files so only the Client and Freelancer have access. If a dispute is opened, the escrow contract dynamically calls `Nox.allow(agreementHandle, TEE_Arbiter_Address)` to give the secure TEE transient permission to decrypt and analyze the deliverables, revoking access once the judgment is broadcasted.

---

## 5. Scoring, Dispute, & Fee Architecture

### The NoxEscrow Reputation Metric (NERM)
Contractors are scored on a professional reputation scale. This score is stored as an encrypted handle `euint256` to prevent competitor profiling or malicious targeting, but can be decrypted by clients seeking to hire them (with permission).

$$\text{Reputation} = \text{Base} + \left( \sum_{i=1}^{N} \text{Payout}_{i} \times \text{Rating}_{i} \right) - (\text{DisputesLost} \times \lambda)$$

Where:
*   $\text{Payout}_{i}$ is the volume of contract $i$ (log-scaled to prevent whales from artificial reputation bloating).
*   $\text{Rating}_{i}$ is the 1–5 scale of satisfaction.
*   $\lambda$ is the severe penalty factor for lost disputes ($\lambda = 500$ points).

### The AI Dispute Evaluation Prompt Structure
The AI TEE Arbiter reads a structured JSON payload containing:
1.  `milestone_requirements`: Plaintext requirements decrypted inside the TEE.
2.  `submitted_deliverables`: Git diffs, PR summaries, or file checksums.
3.  `client_statement` & `freelancer_statement`: Explaining the source of contention.

```python
# TEE AI Core Assessment Formula
relevance_score = llm.eval("Does the code implement the exact milestone requirements? Rate 0-100.")
compilation_score = llm.eval("Did the contractor deliver verifiable proofs of compilation or test suites? Rate 0-100.")
adjudication = "PAY_FREELANCER" if (relevance_score * 0.7 + compilation_score * 0.3) >= 70 else "REFUND_CLIENT"
```

### Fee Schedule
*   **Standard Completed Escrow Fee:** 0.5% (deducted automatically on payout to cover platform maintenance).
*   **Dispute Arbitration Fee:** Flat $10 in cUSDC, allocated entirely to fund the iExec TEE runtime and API oracle keys.

---

## 6. UX & Design System Decisions

NoxEscrow will use a dark, hyper-professional, high-fidelity design system that reflects absolute security, encryption, and institutional-grade trust.

### Color Palette

| Color Role | Hex Value | Purpose / Application |
| :--- | :--- | :--- |
| **Space Black** | `#0B0F19` | Deep background to minimize visual clutter. |
| **Carbon Gray** | `#161F30` | Card borders, secondary containers, and tables. |
| **Nox Teal** | `#00F2FE` | Primary action buttons, active state lines, and accents. |
| **Hyper Purple** | `#7F00FF` | Encrypted handles, secure TEE indicators, and encryption status. |
| **Secure Green** | `#00E676` | Successful payouts, approved milestones, and active streams. |
| **Warning Red** | `#FF1744` | Open disputes, underflow indicators, and key revocations. |

### Visual Typography & Layout Constraints
*   **Primary Font:** `Inter` (sans-serif) for tabular values, code hashes, and handles.
*   **Secondary Font:** `JetBrains Mono` for displaying encrypted `euint256` hex strings and contract addresses.
*   **Mobile Touch Target Rule:** All buttons and interface tabs must maintain a minimum bounding box of `48px x 48px` to guarantee single-thumb operation on mobile views.
*   **The "Encryption Overlay" FX:** Any field containing encrypted data (like the current budget balance or task name) is rendered with a pulsing purple glowing shadow (`box-shadow: 0 0 8px #7F00FF`) to indicate TEE-protection visually to the user.

---

## 7. Retention & Engagement Engineering

While escrow is a transactional utility, NoxEscrow implements loops to keep enterprises and freelancers loyal to the platform:

```
Cue: Freelancer finishes a gig / Enterprise needs to draft a contract.
Routine: Load NoxEscrow dApp, instantly lock cUSDC, encrypt milestones.
Reward: Zero-risk workspace (funds guaranteed), complete privacy of rates.
Investment: Building an encrypted reputation score (NERM) on-chain that cannot be faked or stolen.
```

### Contractor Reputation Tiers
By maintaining an active, non-disputed streak of contracts, freelancers unlock professional titles on their profiles:
*   **Bronze Escrow Tier:** 0–500 XP.
*   **Silver Escrow Tier:** 501–2000 XP (unlocks lower contract fees: 0.4%).
*   **Gold TEE-Certified Tier:** 2001+ XP (unlocks 0.3% fees and absolute priority in match matching lists).

---

## 8. Viral & Growth Mechanics

NoxEscrow incorporates sharing loops directly into the transaction lifecycle:

### Loop 1: The Secure B2B Invite
When a Client sets up a contract, the freelancer *must* join NoxEscrow to sign the agreement and view the encrypted requirements. This is an **invitation loop** with 100% direct conversion rate, as freelancers must use the platform to receive payment.

### Loop 2: The "Proof-of-Receipt" Cryptographic Share Card
Upon successful payout, freelancers generate a "Proof-of-Receipt" share card for Twitter/LinkedIn:

```
┌────────────────────────────────────────────────────────┐
│  🛡️ NoxEscrow Certified Payout                          │
│                                                        │
│  Contractor: [0x8f...e10]                             │
│  Volume: [████████] cUSDC  🔒 (Encrypted via iExec Nox)│
│  Milestones: 4/4 Complete                              │
│  Verification ID: [nox-proof-7984-ae2b]                │
│                                                        │
│  "Paid securely, privately, and on-time."              │
└────────────────────────────────────────────────────────┘
```
The budget amount is visually blacked out using the unicode character `█` to generate deep curiosity. Anyone who clicks the verification link is directed to NoxEscrow's landing page, where they can verify that the transaction was real, secure, and fully funded.

---

## 9. Information Architecture & Data Model

```
                         ┌─────────────────────┐
                         │   Escrow Factory    │
                         └──────────┬──────────┘
                                    │ deploys
                                    ▼
                         ┌─────────────────────┐
                         │  NoxEscrowContract  │
                         └──────────┬──────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│     Client State      │ │   Freelancer State    │ │    Milestone State    │
│  • address            │ │  • address            │ │  • euint256 budget    │
│  • cUSDC Balance      │ │  • reputation handle  │ │  • encrypted IPFS hash│
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

### On-Chain Entities (Solidity Storage)
*   **EscrowAgreement:**
    *   `agreementId`: `bytes32` (Primary Key).
    *   `client`: `address` (Public).
    *   `freelancer`: `address` (Public).
    *   `budgetHandle`: `euint256` (Encrypted balance).
    *   `milestonesCount`: `uint256`.
    *   `status`: `enum` (ACTIVE, DISPUTED, COMPLETED, REFUNDED).
*   **Milestone:**
    *   `requirementsHash`: `bytes32` (Encrypted IPFS pointer of tasks).
    *   `payoutHandle`: `euint256` (Encrypted sub-budget).
    *   `isCompleted`: `bool`.

### Off-Chain/TEE Entities
*   **TEE_Dispute_Assessment:**
    *   `disputeId`: `bytes32` (Primary Key).
    *   `rawRequirements`: `string` (Plaintext decrypted inside TEE).
    *   `codeDiffs`: `string` (Plaintext decrypted inside TEE).
    *   `assessmentLogs`: `string` (Volatile memory, shredded after final block output).

---

## 10. Complete Screen Map & User Flows

### ASCII Screen Flow Diagram

```
[S1: Dashboard] ─── Create ───► [S2: Wizard] ─── Sign & Lock ───► [S3: Active Escrow]
      ▲                                                                   │
      │                                                                   ├─ Dispute ──► [S4: Dispute Hub]
      │                                                                   │                   │
      └─────────────────────────── Complete / Refund ─────────────────────┼───────────────────┘
                                                                          ▼
                                                                  [S5: Share Card]
```

### Screen Inventory
1.  **[S1] — Main Portfolio Dashboard:**
    *   *Purpose:* Single-screen view of all incoming/outgoing private escrows, wrapped cUSDC balances, and contractor reputation.
    *   *Layout:* JetBrains Mono address identifiers. Highlighted card overlays with purple shadows for private fields.
2.  **[S2] — Escrow Drafting Wizard:**
    *   *Purpose:* Step-by-step form to input contractor address, budget, and milestone terms.
    *   *Action:* Client clicks "Sign & Deploy," which triggers local SDK encryption of terms and prompts the Metamask transaction.
3.  **[S3] — Active Escrow Workspace:**
    *   *Purpose:* Real-time tracking of milestones. Allows the freelancer to submit work (uploading encrypted IPFS hashes of git commits) and allows the client to release funds.
4.  **[S4] — TEE Dispute Hub:**
    *   *Purpose:* Displays ongoing dispute parameters. Highlights the TEE computing status: *"AI Arbiter Initializing in Secure TDX Enclave..."* 
5.  **[S5] — Viral Share Center:**
    *   *Purpose:* Generates the custom redacted receipt card with direct social API buttons for X and LinkedIn.

---

## 11. Risk Register

### Risk 1: Leakage of Key Parameters during On-Chain Submission
*   **Probability:** High.
*   **Impact:** Critical (destroys the commercial privacy promise).
*   **Mitigation:** The React UI will strictly validate that raw numeric budget values are converted to `externalEuint256` handles *before* calling the Solidity contract function. We will block any raw `uint256` parameter submissions at the front-end level.

### Risk 2: Forgotten Handlers (ACL Permission Expiry)
*   **Probability:** Medium.
*   **Impact:** High (Permanent loss of funds).
*   **Mitigation:** The smart contract constructor, `deposit`, `withdraw`, and `dispute` functions will enforce a strict static check that calls `Nox.allowThis(balance)` and `Nox.allow(balance, user)` before returning. These calls are backed by unit tests in our local Hardhat environment.

### Risk 3: Malicious Deliverable Sabotage (Prompt Injection)
*   **Probability:** Medium.
*   **Impact:** Medium (Corrupts the AI dispute judgment).
*   **Mitigation:** The TEE assessment engine will run the prompt inside an isolated system prompt container that treats the `client_statement` and `freelancer_statement` fields strictly as lower-priority data parameters, neutralizing system instructions written inside text boxes.

---

## 12. Marketing & Launch Playbook

### Channel Strategy

| Channel | target Audience | Focus | Frequency |
| :--- | :--- | :--- | :--- |
| **X (Twitter)** | Web3 Developers, Builders, iExec Judges | TEE capability loops, architecture diagrams, live demo video. | Daily |
| **Discord** | iExec Community & Hackathon participants | Interactive Q&A, developer feedback exchange, and teammate recruitment. | Every 3 Days |
| **Github** | Open Source Enthusiasts, Technical Judges | Ultra-clean code comments, comprehensive `feedback.md`, and direct setup scripts. | Continuous |

---

## 13. Execution Timeline (17-Day Sprint)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              NoxEscrow Sprint Plan                                     │
├───────────────────┬───────────────────────────────────┬────────────────────────────────┤
│ Days 1 - 3        │ Days 4 - 8                        │ Days 9 - 17                    │
│ RESEARCH & DESIGN │ SOLIDITY & LOCAL TESTING          │ INTEGRATION, DEPLOY & PITCH    │
│ • Map Nox specs   │ • Write Escrow Contracts          │ • Build React Frontend         │
│ • Lock UX themes  │ • Implement TEE AI Script         │ • Deploy to ETH Sepolia        │
│ • Setup Repo      │ • Hardhat Local Simulation        │ • Record Pitch & Submit        │
└───────────────────┴───────────────────────────────────┴────────────────────────────────┘
```

*   **Days 1–3 (Research & Repo Setup):** Complete! Git repository initialized, folder structures aligned, and documentation frozen.
*   **Days 4–8 (Solidity & TEE Scripting):** Implement the core `NoxEscrow.sol` and the off-chain Python/Node TEE AI arbiter script. Set up a Hardhat mock environment to simulate external handle proofs.
*   **Days 9–12 (Frontend & JS SDK Integration):** Build the high-fidelity dark-themed React UI. Integrate `iexec-nox-js-sdk` to manage client-side encryptions.
*   **Days 13–15 (Deployment & Quality Assurance):** Deploy contracts to ETH Sepolia. Conduct end-to-end testing of disputes, and write the extensive `feedback.md` file.
*   **Days 16–17 (Submission Prep):** Record the 4-minute walkthrough video, draft the X announcement post, and submit to DoraHacks.

---

## 14. Presentation & Submission Strategy

### The 4-Minute Walkthrough Video Script
*   **0:00–0:30 (The Hook):** Introduce the "Transparency Tax" of public blockchains—why enterprise freelancers and companies cannot use transparent escrows without leaking sensitive financial rates and IP.
*   **0:30–1:45 (The Core Live Demo):** Walk through S1 and S2 on screen. Create a $5,000 cUSDC contract. Show how the budget and deliverables are encrypted instantly.
*   **1:45–3:00 (The Dispute Showcase):** Open a dispute. Show the TEE environment spinning up, processing the inputs, and displaying the AI's step-by-step reasoning logs in JetBrains Mono.
*   **3:00–3:45 (The Architecture Explainer):** Show a clean visual of the iExec Nox primitives (`euint256`, KMS integration, on-chain ACLs) keeping everything cryptographically secure.
*   **3:45–4:00 (The Close):** Wrap up with a link to the public GitHub repo, live dApp URL, and a call to action to help build the future of private B2B work.

---

## 15. Final Decision Matrix

| Core Attribute | Choice | Strategic Rationale |
| :--- | :--- | :--- |
| **Confidential Logic** | iExec Nox | Standard Solidity support + native composability with ERC-20 networks. |
| **Contract Framework** | Hardhat 3 | **Hardhat 3** chosen. Foundry integration is currently listed as **"Coming Soon"** in the live iExec documentation, making Hardhat the only supported framework for `@iexec-nox/nox-hardhat-plugin` local stack emulation. |
| **Wrapped Asset** | ERC-7984 cUSDC | Universal stablecoin baseline with hidden balances. |
| **Dispute Method** | LLM inside Intel TDX TEE | Zero bias, fast (~3 mins), secure IP protection. |
| **Access Control** | Dynamic on-chain ACL (`Nox.allow`) | Allows transient permission granting to TEE arbiters. |
| **Frontend dApp** | Vite + React (TS) | Eliminates SSR hydration issues with Web3 wallet connection and cryptographic libraries. |
| **Web3 Wallet Comms** | RainbowKit + Wagmi v2 + Viem v2 | Gold standard for wallet-connect overlays, reactive state hooks, and fast, type-safe RPC interactions. |
| **Backend DB** | Supabase (Free Tier) | Lightweight, fast metadata state storage. |
| **Design Language** | Dark Tech Minimal | Emphasizes security, encryption, and high-fidelity polish. |
| **Legal Classification**| Commercial Escrow Utility | 100% skill-based deliverables, bypasses betting/gaming regulations. |

---
*Created and stored securely under `NoxEscrow/plans/noxescrow-complete-plan.md`.*
