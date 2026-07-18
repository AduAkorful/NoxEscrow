// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/**
 * @title INoxEscrowContract
 * @notice Interface governing the milestone-based private escrow agreement and its lifecycle.
 */
interface INoxEscrowContract {
    // ============ Enums & Structs ============

    enum Status { SIGNING, ACTIVE, DISPUTED, COMPLETED, REFUNDED }

    struct Milestone {
        euint256 requirementsHash;
        euint256 deliverableHash;
        euint256 payoutHandle;
        uint128 submissionTime;
        bool isSubmitted;
        bool isSettled;
    }

    // ============ Events ============

    event ContractInitialized(address indexed client, address indexed freelancer, uint256 totalMilestones);

    event DeliverableSubmitted(uint256 indexed milestoneIndex, euint256 deliverableHash);

    event MilestoneApproved(uint256 indexed milestoneIndex);

    event DisputeOpened(uint256 indexed milestoneIndex, euint256 requirementsHash, euint256 deliverableHash);

    event DisputeResolved(uint256 indexed milestoneIndex, bool ruledInFavorOfFreelancer);

    event MutualCancellationExecuted();

    event PlatformFeeCollected(uint256 indexed milestoneIndex, euint256 feeAmount);

    event EmergencyResolveTriggered(address indexed triggeredBy);

    // ============ Custom Errors ============

    error InvalidClient();
    error InvalidFreelancer();
    error InvalidArbiter();
    error InvalidToken();
    error InvalidReputationRegistry();
    error InvalidMilestonesCount();
    error Unauthorized();
    error InvalidState();
    error LengthMismatch();
    error AlreadySubmitted();
    error AlreadySettled();
    error ReviewWindowNotExpired();
    error ReviewWindowExpired();
    error InvalidRating();
    error MutualCancellationNotRequested();
    error DisputeTimeoutNotExpired();
    error InvalidTreasury();
    error ReentrancyGuardReentrantCall();

    // ============ Functions ============

    function initialize(
        address _client,
        address _freelancer,
        address _teeArbiter,
        address _cUSDC,
        address _reputationRegistry,
        uint256 _totalMilestones,
        uint256 _reviewWindow,
        uint256 _mutualCancelWindow
    ) external;

    function initializeEscrow(
        externalEuint256[] calldata milestonePayouts,
        bytes[] calldata payoutProofs,
        externalEuint256[] calldata milestoneReqs,
        bytes[] calldata reqsProofs
    ) external;

    function submitDeliverable(
        externalEuint256 _deliverableHash,
        bytes calldata proof
    ) external;

    function releaseMilestone(uint256 rating) external;

    function raiseDispute() external;

    function resolveDispute(bool ruleInFavorOfFreelancer) external;

    function mutualCancel() external;

    function emergencyResolveDispute() external;

    function disputeOpenTime() external view returns (uint256);

    function DISPUTE_TIMEOUT() external view returns (uint256);

    function protocolTreasury() external view returns (address);

    function platformFeeBps() external view returns (uint256);
}
