# Component 1: Smart Contracts (Solidity Layer)
**Detailed Implementation Plan & Smart Contract Specifications**

This document outlines the detailed layout, functions, state variables, and execution mechanics for the core smart contracts of **NoxEscrow**.

---

## 1. Technical Decisions Summary
*   **Development & Testing Framework:** **Hardhat 3** (TypeScript-enabled with Ethers v6). Direct verification of live iExec documentation confirms that **Foundry integration is currently marked "Coming Soon"**. Therefore, we will use Hardhat to leverage the official `@iexec-nox/nox-hardhat-plugin` which automatically spins up the Dockerized local emulator stack (KMS, Handle Gateway, TEE runner) for our test suite.
*   **Token Strategy:** Option A — Users interact exclusively with pre-wrapped ERC-7984 `cUSDC` at the smart contract level. This delegates encryption overhead to the frontend (via JS SDK) and guarantees a highly gas-efficient, minimal contract footprint.
*   **Milestone Progression:** Option A — Strictly sequential lock. A freelancer must successfully deliver and settle Milestone $N$ (either via client approval or automated TEE arbitration) before starting or claiming Milestone $N+1$.
*   **Dispute Triggering:** Option A — Autonomous Review Window. Submissions have a hardcoded 3-day approval window. If rejected or ignored, either party can raise a dispute, emitting a `DisputeOpened` event and calling `Nox.allow(agreementHandle, TEE_Arbiter)`.
*   **Reputation Management (NERM):** Option A — Encrypted computation on-chain with decrypted public storage. Recalculation is done inside the Nox privacy library, then decrypted to a public `uint256` for easy discovery.

---

## 2. Smart Contract Inventory
The Solidity layer will consist of three primary smart contracts:

1.  **`NoxEscrowFactory.sol`:** Deploys and catalogs individual `NoxEscrowContract` instances for client-freelancer pairs.
2.  **`NoxEscrowContract.sol`:** The core state machine governing the escrow lifecycle, milestone releases, locking, and dispute resolutions.
3.  **`NoxEscrowReputation.sol`:** Global decentralized registry managing the verified public reputation scores (NERM) of contractors.

---

## 3. Core Interface & Storage layout

### `NoxEscrowContract.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NoxEscrowContract {
    enum Status { SIGNING, ACTIVE, DISPUTED, COMPLETED, REFUNDED }
    
    struct Milestone {
        bytes32 requirementsHash; // Encrypted IPFS hash of milestone requirements
        bytes32 deliverableHash;  // Encrypted IPFS hash of completed work
        euint256 payoutHandle;     // Encrypted milestone reward (cUSDC)
        uint256 submissionTime;   // Timestamp when work was submitted
        bool isSubmitted;
        bool isSettled;
    }

    // Public State Variables
    address public client;
    address public freelancer;
    address public teeArbiter;
    IERC20 public cUSDCToken; // ERC-7984 Compliant Wrapped USDC
    Status public status;
    uint256 public activeMilestoneIndex;
    uint256 public constant REVIEW_WINDOW = 3 days;

    // Encrypted State Variables
    euint256 private totalBudget;

    // Milestone Registry
    mapping(uint256 => Milestone) public milestones;
    uint256 public totalMilestones;

    // Events
    event ContractInitialized(address indexed client, address indexed freelancer, uint256 totalMilestones);
    event DeliverableSubmitted(uint256 indexed milestoneIndex, bytes32 deliverableHash);
    event MilestoneApproved(uint256 indexed milestoneIndex);
    event DisputeOpened(uint256 indexed milestoneIndex, bytes32 requirementsHash, bytes32 deliverableHash);
    event DisputeResolved(uint256 indexed milestoneIndex, bool ruledInFavorOfFreelancer);

    constructor(
        address _client,
        address _freelancer,
        address _teeArbiter,
        address _cUSDC,
        uint256 _totalMilestones
    ) {
        client = _client;
        freelancer = _freelancer;
        teeArbiter = _teeArbiter;
        cUSDCToken = IERC20(_cUSDC);
        totalMilestones = _totalMilestones;
        status = Status.SIGNING;
    }
    
    // Core Functions will be added here
}
```

---

## 4. Key Functions & State Machine Logic

```
                     [ SIGNING ]
                          │
                          │ Client Locks cUSDC
                          ▼
                      [ ACTIVE ]
                          │
         Freelancer submits / Starts Review Window
                          ▼
                 Deliverable Submitted
                  /                  \
   Client Approves / Timeouts         Client Rejects
                /                      \
               ▼                        ▼
       [ COMPLETED ]               [ DISPUTED ]
       (Payout Released)                │
                                        │ TEE AI Arbiter Decides
                                        ▼
                                 Dispute Resolved
                                 /              \
                        PAY_FREELANCER        REFUND_CLIENT
                               /                  \
                              ▼                    ▼
                        [ COMPLETED ]         [ REFUNDED ]
```

### Detailed Flow Specifications:

1.  **`initializeEscrow(externalEuint256[] calldata milestonePayouts, bytes[] calldata proofs, bytes32[] calldata milestoneReqs)`**
    *   *Actor:* Client.
    *   *Action:* Transfers total wrapped cUSDC to the contract. Instantiates sequential milestones with their respective encrypted requirements and payouts.
    *   *Nox Primitives:*
        *   `Nox.fromExternal(milestonePayouts[i], proofs[i])` to generate on-chain `euint256` handles.
        *   `Nox.allowThis(milestone.payoutHandle)` to ensure the contract can spend it during release.

2.  **`submitDeliverable(bytes32 _deliverableHash)`**
    *   *Actor:* Freelancer.
    *   *Constraint:* Must be in `ACTIVE` state. The active milestone must not be submitted yet.
    *   *Action:* Stores the encrypted deliverable pointer and sets `submissionTime = block.timestamp`.

3.  **`releaseMilestone()`**
    *   *Actor:* Client (or automatic via 3-day timeout in a script).
    *   *Action:* Approves the deliverable, transfers the encrypted `payoutHandle` balance of the current milestone to the freelancer's address, and increments `activeMilestoneIndex`.
    *   *Nox Primitives:*
        *   `Nox.allow(milestone.payoutHandle, freelancer)` to allow the freelancer to claim/decrypt.

4.  **`raiseDispute()`**
    *   *Actor:* Client (who rejects submission) OR Freelancer (if client is unresponsive after 3 days).
    *   *Action:* Transitions state to `DISPUTED`. Emits `DisputeOpened` with raw encrypted hash parameters. Grants transient reading permission of requirements and deliverables to the `teeArbiter` address.
    *   *Nox Primitives:*
        *   `Nox.allow(milestone.payoutHandle, teeArbiter)`
        *   `Nox.allow(milestone.requirementsHash, teeArbiter)`

5.  **`resolveDispute(bool ruleInFavorOfFreelancer)`**
    *   *Actor:* `teeArbiter` (Only callable by the verified TEE contract address).
    *   *Action:* If `true`, releases milestone payout to the freelancer. If `false`, refunds the milestone payout back to the client. Increments milestones and resets status to `ACTIVE`.

---

## 5. Local Hardhat Verification Plan
To ensure total security, we will implement an extensive Hardhat test matrix covering:
*   [ ] Sequential progression boundaries (verify block attempts to trigger Milestone 2 before Milestone 1 is settled).
*   [ ] Access control gating (verify third-party addresses cannot call `releaseMilestone` or `resolveDispute`).
*   [ ] Nox Handle persistence (test consecutive operations on identical handles to guarantee no `Nox.allowThis` missing errors occur).
*   [ ] Complete dispute simulation (Mock TEE address triggers `resolveDispute(true)` and verify exact token payouts).
