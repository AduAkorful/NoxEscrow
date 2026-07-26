# NoxEscrow — End-to-End Mission-Critical Integration Test Guide

This document defines the complete end-to-end (E2E) testing workflow for **NoxEscrow** on Sepolia Testnet. It covers the ideal execution path between **Client** and **Freelancer**, zero-knowledge token wrapping, E2E-encrypted collaboration, milestone deliverables, double-blind reviews, and hardware-attested TEE Gemini AI dispute arbitration.

---

## 📋 Environment Prerequisites

1. **Sepolia Network:** Chain ID `11155111`
2. **Two Test Wallets:**
   - **Account 1 (Client):** Holds Sepolia ETH (for gas) and Sepolia USDC.
   - **Account 2 (Freelancer):** Holds Sepolia ETH (for gas).
3. **Contract Deployments (Sepolia):**
   - **Factory Proxy:** `0xE14BF8F83690ABcd0A74b299DF1cb3055d323537`
   - **cUSDC Token:** `0x85601895391541846b8Be994F00D1f7f17a878db`
   - **Public USDC:** `0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590`
   - **TEE Arbiter Oracle:** `0x74B4134C8d527a8D8AE8cb9503ab2043bCfC0ffd`

---

## 🧪 Phase 1: Token Preparation & Shielding (Swap Page)

**Goal:** Convert public USDC into confidential zero-knowledge `cUSDC` using the iExec Nox wrapper.

1. **Navigate to Swap Page:** Go to `/swap` on the dApp.
2. **Connect Client Wallet (Account 1).**
3. **Check Public USDC Balance:** Verify your public USDC balance displays correctly in the input box.
4. **Approve USDC Spending:**
   - Enter an amount (e.g. `100` USDC).
   - Click **Approve 100 USDC**.
   - Confirm transaction in your Web3 wallet.
   - Verify transaction stepper completes Step 1.
5. **Wrap Public USDC → cUSDC:**
   - Click **Wrap USDC to cUSDC**.
   - Authorize on-chain wrap transaction in your wallet.
   - Complete gasless signature request for DataAccessAuthorization.
   - Verify success notification and click **🔒 Decrypt cUSDC** to confirm confidential balance updates via Nox KMS.

---

## 🧪 Phase 2: Freelancer Profile Registration (Talent Directory)

**Goal:** Register a verified freelancer profile in the talent marketplace.

1. **Switch Wallet to Freelancer (Account 2).**
2. **Navigate to Profile Page:** Go to `/profile`.
3. **Click "Create Profile / Customize Profile":**
   - **Name:** e.g. "Alex Vance"
   - **Title:** e.g. "Lead Smart Contract & Fullstack Engineer"
   - **Domain:** Software & Web
   - **Hourly Rate:** `100 cUSDC/hr`
   - **Bio:** "Fullstack Web3 and TEE enclave engineer."
   - **Skills:** `TypeScript, Solidity, React, iExec Nox`
   - Check **"Available for Hire"**.
4. **Save Profile:** Click **Save Profile**.
5. **Verify Marketplace Listing:**
   - Go to `/marketplace`.
   - Verify Alex Vance appears in the talent grid with a "Verified EVM Wallet Owner" badge and Bronze tier.

---

## 🧪 Phase 3: Contract Creation & ZK Funding (Draft Wizard)

**Goal:** Client hires the freelancer and locks cUSDC funds in a zero-knowledge milestone escrow clone.

1. **Switch Wallet to Client (Account 1).**
2. **Select Freelancer:**
   - Go to `/marketplace`.
   - Find Alex Vance's card and click **Hire & Lock Escrow**.
   - Verify you are redirected to `/deploy?freelancer=0x...` with the freelancer's wallet pre-filled.
3. **Configure Milestones:**
   - **Project Title:** "Confidential Fullstack DApp Development"
   - **Milestone 1:** Payout = `50` cUSDC | Requirements = "Deliver UI design & smart contract architecture spec"
   - **Milestone 2:** Payout = `50` cUSDC | Requirements = "Deliver production frontend & complete test suite"
   - Attach a sample specification file (e.g. `.pdf` or `.txt`).
4. **Execute 3-Step Deployment Pipeline:**
   - Click **Deploy & Lock Budget**.
   - **Step 1:** Confirm `NoxEscrowFactory.createEscrow()` clone transaction in wallet.
   - **Step 2:** Confirm `cUSDCToken.setOperator()` allowance transaction for the clone contract.
   - **Step 3:** Perform Nox KMS input encryptions & confirm `initializeEscrow()` transaction on-chain.
5. **Verify Deployment:**
   - Confirm redirect to `/vaults`.
   - Verify the new escrow agreement displays under **Client Escrow Portfolio** with status `ACTIVE`.

---

## 🧪 Phase 4: E2E Encrypted Collaboration & Chat

**Goal:** Establish end-to-end encrypted messaging between Client and Freelancer.

1. **Open Escrow Workspace:**
   - On `/vaults`, click on the newly deployed contract card.
   - Verify URL changes to `/escrow/0x...`.
2. **Unlock Vault Key:**
   - Click **Unlock Vault Key** in the header banner.
   - Sign the gasless authentication message in your wallet (`Initialize your NoxEscrow Secure Environment...`).
   - Verify symmetric key derivation via WebCrypto PBKDF2.
3. **Test E2E Encrypted Chat:**
   - In the **Private End-to-End Chat** box, type: `"Hello Alex, please review the attached milestone requirements."`
   - Click **Send**.
   - **Switch to Freelancer Wallet (Account 2):**
     - Open `/escrow/0x...`.
     - Click **Unlock Vault Key** and sign authentication request.
     - Verify client's chat message decrypts and displays cleanly!
     - Reply: `"Received! Starting work on Milestone 1 now."`
     - Verify client sees reply decrypted in real-time.

---

## 🧪 Phase 5: Deliverable Submission & Client Approval (Ideal Happy Path)

**Goal:** Freelancer submits milestone work, client inspects decrypted files, and releases cUSDC payout.

1. **Freelancer Submits Milestone 1:**
   - As Freelancer (Account 2) on `/escrow/0x...`:
   - Under **Milestone 1 Work Submission**:
     - **Deliverable Summary:** "Completed smart contract architecture spec & system diagrams."
     - Attach completed deliverable file (e.g. `architecture-spec.txt`).
   - Click **Submit Deliverable On-Chain**.
   - Confirm transaction in wallet.
   - Verify milestone badge updates to `Awaiting Client Sign-Off`.
2. **Client Reviews & Releases Payout:**
   - **Switch to Client Wallet (Account 1):**
   - Refresh or open `/escrow/0x...`.
   - Verify deliverable text and attached file decrypt cleanly.
   - Download and open the deliverable file attachment via the IPFS link.
   - Select Rating = `5 Stars`.
   - Click **Approve Milestone & Release Payout**.
   - Confirm transaction in wallet.
   - **Verify On-Chain Settlement:**
     - Milestone 1 transitions to `Completed`.
     - Active milestone advances to Milestone 2.
     - Freelancer (Account 2) receives net `cUSDC` payout on-chain.
     - Freelancer's on-chain reputation score increments in `NoxEscrowReputation`.

---

## 🧪 Phase 6: Double-Blind Written Reviews

**Goal:** Both parties submit un-retaliatory feedback that remains encrypted until both have submitted.

1. **Client Submits Review:**
   - In **Double-Blind Written Reviews** section:
   - Select `5 Stars` and type: `"Exceptional code quality and timely communication!"`
   - Click **Submit Double-Blind Review**.
   - Verify UI displays: `🔒 Waiting for the other party to submit their review...`
2. **Freelancer Submits Review:**
   - Switch to Freelancer Wallet (Account 2).
   - Select `5 Stars` and type: `"Clear requirements and instant milestone payout release."`
   - Click **Submit Double-Blind Review**.
3. **Verify Simultaneous Decryption:**
   - Once both reviews are submitted, verify both written reviews decrypt and display simultaneously for both parties!

---

## 🧪 Phase 7: Dispute Resolution & TEE Gemini AI Arbitration

**Goal:** Simulate a dispute scenario evaluated autonomously by the iExec TEE Gemini 2.5 Flash arbiter.

1. **Freelancer Submits Milestone 2:**
   - As Freelancer (Account 2), submit deliverable text for Milestone 2: `"Preliminary draft of frontend UI."`
2. **Client Raises Formal Dispute:**
   - Switch to Client Wallet (Account 1).
   - Under Milestone 2, enter dispute statement: `"Deliverable is incomplete; missing test coverage and contract integration."`
   - Click **Raise Formal Dispute**.
   - Confirm `raiseDispute()` transaction on-chain.
   - Verify contract status updates to `DISPUTED`.
3. **Observe Autonomous TEE AI Arbitration:**
   - The TEE listener service (`arbiter/src/listener.js`) catches the `DisputeOpened` event on-chain.
   - Listener downloads encrypted deliverables from IPFS, queries Nox KMS handles, and passes data to Gemini 2.5 Flash inside the secure enclave.
   - Open **TEECourtroom** view on `/escrow/0x...`.
   - Verify Gemini 2.5 Flash verdict, score, reasoning, and execution logs stream live into the courtroom!
   - Verify on-chain contract state settles automatically (`PAY_FREELANCER` or `REFUND_CLIENT`).

---

## 🧪 Phase 8: Mutual Cancellation Flow

**Goal:** Mutual agreement between client and freelancer to cancel an active project and refund unspent funds.

1. **Deploy Test Escrow:** Deploy a 2-milestone escrow contract.
2. **Client Requests Cancel:** Click **Request Mutual Cancellation**.
   - Verify state indicates cancellation requested by Client.
3. **Freelancer Approves Cancel:** Switch to Freelancer Wallet and click **Confirm Mutual Cancellation**.
   - Confirm transaction in wallet.
   - Verify contract state transitions to `REFUNDED` and remaining cUSDC refunds to Client.

---

## 🧪 Phase 9: Admin Governance Controls (Admin Page)

**Goal:** Factory owner configures protocol parameters.

1. **Switch Wallet to Deployer Address (Account 1).**
2. **Navigate to `/admin`.**
3. **Verify Owner Status:** Confirm admin dashboard unlocks.
4. **Test Parameter Updates:**
   - Update **Review Window** (e.g. `259200` seconds = 3 days).
   - Update **Platform Fee BPS** (e.g. `50` = 0.5%).
   - Confirm on-chain update transactions.

---

## 🛑 Testing Checkpoints & Bug Reporting

As you execute these test flows:
- If any transaction reverts, RPC call fails, or UI state gets out of sync, note the **exact step, wallet account, error message, and browser console log**.
- We will immediately debug and apply targeted fixes to ensure 100% production stability!
