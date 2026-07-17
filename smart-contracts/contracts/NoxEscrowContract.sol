// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox, euint256, externalEuint256, ebool} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {INoxEscrowReputation} from "./interfaces/INoxEscrowReputation.sol";
import {INoxEscrowContract} from "./interfaces/INoxEscrowContract.sol";

/**
 * @title NoxEscrowContract
 * @notice Core state machine governing a milestone-based freelance escrow contract lifecycle.
 * Protects budget, requirements, and deliverables confidentiality on-chain using iExec Nox.
 */
contract NoxEscrowContract is Initializable, INoxEscrowContract {
    // ============ Storage Layout (Gas Packed) ============

    address public factory;                             // Slot 0 (20 bytes)
    Status public status;                               // Packed in Slot 0 (1 byte)
    address public client;                              // Slot 1 (20 bytes)
    address public freelancer;                          // Slot 2 (20 bytes)
    address public teeArbiter;                          // Slot 3 (20 bytes)
    IERC7984 public cUSDCToken;                         // Slot 4 (20 bytes)
    INoxEscrowReputation public reputationRegistry;     // Slot 5 (20 bytes)
    
    uint256 public activeMilestoneIndex;                // Slot 6 (32 bytes)
    uint256 public reviewWindow;                        // Slot 7 (32 bytes)
    uint256 public totalMilestones;                     // Slot 8 (32 bytes)
    uint256 public mutualCancelWindow;                  // Slot 9 (32 bytes)
    uint256 public clientCancelRequestTime;             // Slot 10 (32 bytes)
    uint256 public freelancerCancelRequestTime;         // Slot 11 (32 bytes)

    bool public clientCancelRequested;                  // Packed in Slot 12 (1 byte)
    bool public freelancerCancelRequested;              // Packed in Slot 12 (1 byte)

    mapping(uint256 => Milestone) public milestones;

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer & Setup ============

    /**
     * @notice Initializes the cloned contract parameters.
     * @dev Only callable once during factory cloning.
     */
    function initialize(
        address _client,
        address _freelancer,
        address _teeArbiter,
        address _cUSDC,
        address _reputationRegistry,
        uint256 _totalMilestones,
        uint256 _reviewWindow,
        uint256 _mutualCancelWindow
    ) external override initializer {
        if (_client == address(0)) revert InvalidClient();
        if (_freelancer == address(0)) revert InvalidFreelancer();
        if (_teeArbiter == address(0)) revert InvalidArbiter();
        if (_cUSDC == address(0)) revert InvalidToken();
        if (_reputationRegistry == address(0)) revert InvalidReputationRegistry();
        if (_totalMilestones == 0 || _totalMilestones > 20) revert InvalidMilestonesCount();

        factory = msg.sender;
        client = _client;
        freelancer = _freelancer;
        teeArbiter = _teeArbiter;
        cUSDCToken = IERC7984(_cUSDC);
        reputationRegistry = INoxEscrowReputation(_reputationRegistry);
        totalMilestones = _totalMilestones;
        reviewWindow = _reviewWindow;
        mutualCancelWindow = _mutualCancelWindow;
        status = Status.SIGNING;
    }

    // ============ External Functions ============

    /**
     * @notice Initializes the milestones with payouts and requirements under zero-knowledge.
     * @dev Must be called by the client directly to allow EIP-712 proof validation.
     */
    function initializeEscrow(
        externalEuint256[] calldata milestonePayouts,
        bytes[] calldata payoutProofs,
        externalEuint256[] calldata milestoneReqs,
        bytes[] calldata reqsProofs
    ) external override {
        if (msg.sender != client) revert Unauthorized();
        if (status != Status.SIGNING) revert InvalidState();
        
        uint256 total = totalMilestones; // Cache SLOAD in memory
        if (milestonePayouts.length != total) revert LengthMismatch();
        if (payoutProofs.length != total) revert LengthMismatch();
        if (milestoneReqs.length != total) revert LengthMismatch();
        if (reqsProofs.length != total) revert LengthMismatch();

        for (uint256 i = 0; i < total; ) {
            euint256 payout = Nox.fromExternal(milestonePayouts[i], payoutProofs[i]);
            euint256 reqs = Nox.fromExternal(milestoneReqs[i], reqsProofs[i]);

            Nox.allowThis(payout);
            Nox.allowThis(reqs);

            // Grant viewer access to client and freelancer to decrypt requirements and payouts off-chain
            Nox.addViewer(reqs, client);
            Nox.addViewer(reqs, freelancer);
            Nox.addViewer(payout, client);
            Nox.addViewer(payout, freelancer);

            milestones[i].payoutHandle = payout;
            milestones[i].requirementsHash = reqs;

            // Execute the ERC-7984 transfer from client to this contract
            Nox.allowTransient(payout, address(cUSDCToken));
            cUSDCToken.confidentialTransferFrom(msg.sender, address(this), payout);

            unchecked {
                ++i;
            }
        }

        status = Status.ACTIVE;
        emit ContractInitialized(client, freelancer, total);
    }

    /**
     * @notice Submit a completed milestone deliverable (encrypted IPFS hash pointer)
     */
    function submitDeliverable(
        externalEuint256 _deliverableHash,
        bytes calldata proof
    ) external override {
        if (msg.sender != freelancer) revert Unauthorized();
        if (status != Status.ACTIVE) revert InvalidState();
        if (activeMilestoneIndex >= totalMilestones) revert InvalidState();

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        if (activeMilestone.isSubmitted) revert AlreadySubmitted();
        if (activeMilestone.isSettled) revert AlreadySettled();

        euint256 devHash = Nox.fromExternal(_deliverableHash, proof);
        Nox.allowThis(devHash);

        // Grant viewer rights so client and freelancer can decrypt the deliverable off-chain
        Nox.addViewer(devHash, client);
        Nox.addViewer(devHash, freelancer);

        activeMilestone.deliverableHash = devHash;
        activeMilestone.submissionTime = uint128(block.timestamp);
        activeMilestone.isSubmitted = true;

        emit DeliverableSubmitted(activeMilestoneIndex, devHash);
    }

    /**
     * @notice Approve and release the active milestone payout to the freelancer.
     * Can be called by client at any time, or by freelancer after the review window has expired.
     * @param rating Star rating from 1 to 5 to award the freelancer
     */
    function releaseMilestone(uint256 rating) external override {
        if (status != Status.ACTIVE) revert InvalidState();
        if (activeMilestoneIndex >= totalMilestones) revert InvalidState();

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        if (!activeMilestone.isSubmitted) revert InvalidState();
        if (activeMilestone.isSettled) revert AlreadySettled();

        if (msg.sender == freelancer) {
            if (block.timestamp <= activeMilestone.submissionTime + reviewWindow) {
                revert ReviewWindowNotExpired();
            }
            // Default 5-star rating for automatic timeout release
            rating = 5;
        } else {
            if (msg.sender != client) revert Unauthorized();
            if (rating < 1 || rating > 5) revert InvalidRating();
        }

        // --- Checks-Effects-Interactions (CEI) Pattern ---
        // 1. Effects
        activeMilestone.isSettled = true;
        uint256 currentMilestoneIndex = activeMilestoneIndex;

        activeMilestoneIndex++;
        if (activeMilestoneIndex == totalMilestones) {
            status = Status.COMPLETED;
        }

        emit MilestoneApproved(currentMilestoneIndex);

        // 2. Interactions (Performed last to prevent re-entrancy)
        Nox.allowTransient(activeMilestone.payoutHandle, address(cUSDCToken));
        cUSDCToken.confidentialTransfer(freelancer, activeMilestone.payoutHandle);

        Nox.allowTransient(activeMilestone.payoutHandle, address(reputationRegistry));
        reputationRegistry.addCompletedMilestone(freelancer, activeMilestone.payoutHandle, rating);
    }

    /**
     * @notice Raise a dispute on the active milestone, handing decision power to the secure TEE arbiter.
     * Clients can dispute at any time if the freelancer is inactive (to prevent capital lockup).
     */
    function raiseDispute() external override {
        if (msg.sender != client && msg.sender != freelancer) revert Unauthorized();
        if (status != Status.ACTIVE) revert InvalidState();
        if (activeMilestoneIndex >= totalMilestones) revert InvalidState();

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        if (activeMilestone.isSettled) revert AlreadySettled();

        if (msg.sender == client) {
            // If deliverable is submitted, enforce the review window check
            if (activeMilestone.isSubmitted) {
                if (block.timestamp > activeMilestone.submissionTime + reviewWindow) {
                    revert ReviewWindowExpired();
                }
            }
            // If deliverable is NOT submitted, client can dispute at any time (MIA freelancer bypass)
        } else {
            // Freelancer can only dispute if deliverable is submitted
            if (!activeMilestone.isSubmitted) revert InvalidState();
        }

        status = Status.DISPUTED;

        // If no deliverable was submitted, create an empty zero handle for the evaluation permission
        euint256 devHash = activeMilestone.isSubmitted ? activeMilestone.deliverableHash : Nox.toEuint256(0);

        // Grant TEE arbiter permanent admin permissions to decrypt/evaluate parameters
        Nox.allow(activeMilestone.payoutHandle, teeArbiter);
        Nox.allow(activeMilestone.requirementsHash, teeArbiter);
        Nox.allow(devHash, teeArbiter);

        emit DisputeOpened(activeMilestoneIndex, activeMilestone.requirementsHash, devHash);
    }

    /**
     * @notice Settle the dispute based on the TEE arbiter evaluation.
     */
    function resolveDispute(bool ruleInFavorOfFreelancer) external override {
        if (msg.sender != teeArbiter) revert Unauthorized();
        if (status != Status.DISPUTED) revert InvalidState();
        if (activeMilestoneIndex >= totalMilestones) revert InvalidState();

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        if (activeMilestone.isSettled) revert AlreadySettled();

        // --- Checks-Effects-Interactions (CEI) Pattern ---
        // 1. Effects
        activeMilestone.isSettled = true;
        uint256 currentMilestoneIndex = activeMilestoneIndex;

        activeMilestoneIndex++;
        
        if (ruleInFavorOfFreelancer) {
            if (activeMilestoneIndex == totalMilestones) {
                status = Status.COMPLETED;
            } else {
                status = Status.ACTIVE;
            }

            emit DisputeResolved(currentMilestoneIndex, true);

            // Interactions
            Nox.allowTransient(activeMilestone.payoutHandle, address(cUSDCToken));
            cUSDCToken.confidentialTransfer(freelancer, activeMilestone.payoutHandle);

            Nox.allowTransient(activeMilestone.payoutHandle, address(reputationRegistry));
            reputationRegistry.addCompletedMilestone(freelancer, activeMilestone.payoutHandle, 5);
        } else {
            // If the freelancer loses a dispute, terminate the contract immediately and refund ALL remaining budget!
            // This prevents capital hostage situations and stops subsequent milestone deadlocks.
            status = Status.REFUNDED;
            
            emit DisputeResolved(currentMilestoneIndex, false);

            // Refund current milestone
            Nox.allowTransient(activeMilestone.payoutHandle, address(cUSDCToken));
            cUSDCToken.confidentialTransfer(client, activeMilestone.payoutHandle);

            // Refund all subsequent milestones
            uint256 total = totalMilestones;
            for (uint256 i = activeMilestoneIndex; i < total; ) {
                if (!milestones[i].isSettled) {
                    milestones[i].isSettled = true;
                    Nox.allowTransient(milestones[i].payoutHandle, address(cUSDCToken));
                    cUSDCToken.confidentialTransfer(client, milestones[i].payoutHandle);
                }
                unchecked {
                    ++i;
                }
            }

            // Penalize freelancer
            reputationRegistry.penalizeLostDispute(freelancer);
        }
    }

    /**
     * @notice Requests/approves mutual cancellation of the escrow contract.
     * If both parties call this within the mutualCancelWindow, the contract is aborted and remaining funds are refunded to the client.
     */
    function mutualCancel() external override {
        if (status != Status.ACTIVE && status != Status.SIGNING) revert InvalidState();

        if (msg.sender == client) {
            // Check if freelancer cancel is requested and has not expired
            if (freelancerCancelRequested && block.timestamp <= freelancerCancelRequestTime + mutualCancelWindow) {
                clientCancelRequested = true;
                clientCancelRequestTime = block.timestamp;
            } else {
                // Freelancer request is either not set or expired; start a new client request
                clientCancelRequested = true;
                clientCancelRequestTime = block.timestamp;
                freelancerCancelRequested = false;
                freelancerCancelRequestTime = 0;
            }
        } else if (msg.sender == freelancer) {
            // Check if client cancel is requested and has not expired
            if (clientCancelRequested && block.timestamp <= clientCancelRequestTime + mutualCancelWindow) {
                freelancerCancelRequested = true;
                freelancerCancelRequestTime = block.timestamp;
            } else {
                // Client request is either not set or expired; start a new freelancer request
                freelancerCancelRequested = true;
                freelancerCancelRequestTime = block.timestamp;
                clientCancelRequested = false;
                clientCancelRequestTime = 0;
            }
        } else {
            revert Unauthorized();
        }

        if (
            clientCancelRequested && 
            freelancerCancelRequested && 
            block.timestamp <= clientCancelRequestTime + mutualCancelWindow &&
            block.timestamp <= freelancerCancelRequestTime + mutualCancelWindow
        ) {
            // Settle all remaining milestones as cancelled and refund to client
            uint256 total = totalMilestones;
            for (uint256 i = activeMilestoneIndex; i < total; ) {
                if (!milestones[i].isSettled) {
                    milestones[i].isSettled = true;
                    Nox.allowTransient(milestones[i].payoutHandle, address(cUSDCToken));
                    cUSDCToken.confidentialTransfer(client, milestones[i].payoutHandle);
                }
                unchecked {
                    ++i;
                }
            }

            status = Status.REFUNDED;
            emit MutualCancellationExecuted();
        }
    }
}
