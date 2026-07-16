# Component 2: Off-chain TEE AI Arbiter
**Detailed Implementation Plan & Secure Oracle Specifications**

This document details the architecture, secure execution environment (Intel TDX TEE), LLM prompt schema, and listener system for **NoxEscrow's** automated AI dispute adjudication.

---

## 1. Technical Decisions Summary
*   **Model Strategy:** Option A — Remote API (such as Claude-3.5 or GPT-4o) invoked inside an Intel TDX TEE Enclave. Enclave decodes encrypted parameters via secure KMS-bound API keys, executing the call over an encrypted TLS connection.
*   **Deliverable Access:** Decrypted IPFS Payload. The freelancer uploads a Git patch (or PR zip) along with a task specification JSON. The TEE securely downloads the encrypted files, decrypts them using Nox's protocol key inside the enclave, and passes them to the evaluation context.
*   **Trigger Mechanism:** Option A — Decentralized Webhook Listening. A lightweight, off-chain event listener monitors `NoxEscrowContract` events. When `DisputeOpened` is emitted, it invokes the iExec task executor using the iExec developer API.

---

## 2. TEE Enclave Execution Flow

```
                      +─────────────────────────────────────────+
                      |          iExec Intel TDX Enclave        |
                      |                                         |
[DisputeOpened] ─────►│ 1. Download Encrypted IPFS payloads     │
                      │ 2. Fetch Nox KMS keys inside enclave    │
                      │ 3. Decrypt Task JSON & Deliverables     │
                      │ 4. Construct AI System Prompt Context   │
                      │ 5. Execute secure TLS call to LLM API   │
                      │ 6. Parse result & format block proof    │
                      │ 7. Sign and broadcast resolveDispute()  │
                      +─────────────────────────────────────────+
```

1.  **Ingestion:** The event listener triggers the iExec runner, providing the `EscrowContract` address and `milestoneIndex`.
2.  **Decryption:** The TEE enclave queries the on-chain Access Control List (ACL). Since the escrow contract called `Nox.allow(requirementsHash, TEE_Arbiter)`, the iExec Key Management Service (KMS) releases the decryption key to the enclave.
3.  **Local Assembly:** Requirements (plaintext) and Git patch submissions are decrypted into the enclave's secure memory (`/dev/shm`).
4.  **Inference Gating:** The enclave formats the secure system prompt, wraps it with safe-eval guidelines, and makes a TLS request to the remote API.
5.  **Adjudication:** The TEE reads the final boolean output, formats a standard transaction, and broadcasts it to `resolveDispute(ruleInFavorOfFreelancer)` on-chain.

---

## 3. Webhook Listener & Trigger System

The listener is built in Node.js, utilizing `ethers.js` or `viem` to track blockchain events.

```javascript
// src/listener/disputeListener.js
import { ethers } from "ethers";
import { runIExecTask } from "./iexecRunner.js";

const ESCROW_FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const factoryABI = [
  "event DisputeOpened(address indexed contractAddress, uint256 indexed milestoneIndex, bytes32 requirementsHash, bytes32 deliverableHash)"
];

const contract = new ethers.Contract(ESCROW_FACTORY_ADDRESS, factoryABI, provider);

console.log("🛡️ NoxEscrow Dispute Listener Running...");

contract.on("DisputeOpened", async (contractAddress, milestoneIndex, reqsHash, devHash) => {
  console.log(`⚠️ Dispute detected on contract: ${contractAddress} at Milestone: ${milestoneIndex}`);
  try {
    const taskTx = await runIExecTask(contractAddress, milestoneIndex, reqsHash, devHash);
    console.log(`🚀 Successfully triggered iExec TEE Task: ${taskTx}`);
  } catch (error) {
    console.error("❌ Failed to invoke iExec TEE:", error);
  }
});
```

---

## 4. Secure System Prompt Schema

To ensure objective evaluation, the prompt is structured as an immutable engineering prompt, strictly separating rules from user input:

```markdown
You are a highly analytical, objective, and expert Smart Contract and Software Engineering Auditor acting as the supreme arbiter for NoxEscrow.

Your task is to evaluate whether a freelancer's completed code meets the specified milestone requirements.

---
[SYSTEM EVALUATION RULES]
1. Read the Milestone Requirements carefully.
2. Examine the completed code deliverable (provided as a patch or code file).
3. Verify that all key criteria (compilation proofs, test coverage, functional requirements) are fully satisfied.
4. If the freelancer has successfully completed at least 90% of the core requirements and provided functional code, you MUST rule in favor of the freelancer.
5. If there is a critical failure to deliver, non-functional code, or a complete lack of specified features, you MUST rule in favor of the client.
6. Your final response MUST end with a single, clear JSON block following this exact structure:
   {
     "reasoning": "A concise, detailed summary of your assessment.",
     "score": 0-100,
     "verdict": "PAY_FREELANCER" or "REFUND_CLIENT"
   }
---

[MILESTONE REQUIREMENTS]
{RAW_DECRYPTED_REQUIREMENTS}

[FREELANCER SUBMITTED CODE / DELIVERABLE]
{RAW_DECRYPTED_DELIVERABLES}

[CLIENT REJECTION REASON]
{RAW_DECRYPTED_CLIENT_STATEMENT}

[FREELANCER REBUTTAL]
{RAW_DECRYPTED_FREELANCER_STATEMENT}
```

---

## 5. Security & Isolation Assurances
*   **Decryption Isolation:** Decryption keys never leave the Intel TDX hardware memory boundaries. Raw text inputs are never printed to the logs.
*   **Prompt Injection Hardening:** The assessment parser utilizes custom JSON extraction regex that strictly parses the exact `{ "verdict": ... }` keys, throwing an error if the model attempts to append any system-override code.
*   **Immutable Enclave Image:** The iExec enclave code is signed and hashed. Its MRENCLAVE hash is registered on-chain, preventing hackers from patching the arbiter script to always favor one party.
