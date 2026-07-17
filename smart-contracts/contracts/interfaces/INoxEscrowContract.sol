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
        euint256 requirementsHash; // Encrypted IPFS hash pointer (stored as euint256)
        euint256 deliverableHash;  // Encrypted IPFS hash pointer (stored as euint256)
        euint256 payoutHandle;     // Encrypted milestone payout (cUSDC)
        uint128 submissionTime;    // Packed timestamp of deliverable submission (safe for trillions of years)
        bool isSubmitted;          // Set to true after deliverable submission
        bool isSettled;            // Set to true after milestone payout or refund
    }

    // ============ Events ============

    /**
     * @notice Emitted when the escrow agreement is initialized with milestone terms and funds.
     * @param client Address of the buyer/client.
     * @param freelancer Address of the contractor/freelancer.
     * @param totalMilestones Number of sequential milestones in the contract.
     */
    event ContractInitialized(address indexed client, address indexed freelancer, uint256 totalMilestones);

    /**
     * @notice Emitted when a freelancer submits work for an active milestone.
     * @param milestoneIndex Index of the active milestone.
     * @param deliverableHash Encrypted IPFS hash of the submitted work.
     */
    event DeliverableSubmitted(uint256 indexed milestoneIndex, euint256 deliverableHash);

    /**
     * @notice Emitted when a milestone is successfully approved and its payout is released.
     * @param milestoneIndex Index of the approved milestone.
     */
    event MilestoneApproved(uint256 indexed milestoneIndex);

    /**
     * @notice Emitted when a dispute is opened on the active milestone.
     * @param milestoneIndex Index of the active milestone.
     * @param requirementsHash Encrypted IPFS hash of the requirements being contested.
     * @param deliverableHash Encrypted IPFS hash of the deliverable being contested.
     */
    event DisputeOpened(uint256 indexed milestoneIndex, euint256 requirementsHash, euint256 deliverableHash);

    /**
     * @notice Emitted when a dispute is settled on the active milestone by the TEE arbiter.
     * @param milestoneIndex Index of the active milestone.
     * @param ruledInFavorOfFreelancer True if funds were released to freelancer, false if refunded to client.
     */
    event DisputeResolved(uint256 indexed milestoneIndex, bool ruledInFavorOfFreelancer);

    /**
     * @notice Emitted when the contract is mutually cancelled by both parties.
     */
    event MutualCancellationExecuted();

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

    // ============ Functions ============

    /**
     * @notice Initializes the cloned contract parameters.
     * @dev Only callable once during factory cloning.
     * @param _client Address of the buyer.
     * @param _freelancer Address of the freelancer.
     * @param _teeArbiter Address of the secure TEE AI oracle.
     * @param _cUSDC Address of the ERC-7984 confidential wrapping token.
     * @param _reputationRegistry Address of the global reputation score keeper.
     * @param _totalMilestones Number of sequential milestones in the project.
     * @param _reviewWindow Duration of the review window in seconds.
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
    ) external;

    /**
     * @notice Initializes the milestones with payouts and requirements under zero-knowledge.
     * @dev Must be called by the client directly to allow EIP-712 proof validation.
     * @param milestonePayouts Array of encrypted payouts.
     * @param payoutProofs Array of client-signed EIP-712 proofs for payouts.
     * @param milestoneReqs Array of encrypted requirements IPFS hashes.
     * @param reqsProofs Array of client-signed EIP-712 proofs for requirements.
     */
    function initializeEscrow(
        externalEuint256[] calldata milestonePayouts,
        bytes[] calldata payoutProofs,
        externalEuint256[] calldata milestoneReqs,
        bytes[] calldata reqsProofs
    ) external;

    /**
     * @notice Submits the work/deliverable for the active milestone.
     * @dev Only callable by the freelancer in ACTIVE state.
     * @param _deliverableHash Encrypted IPFS hash pointer.
     * @param proof Freelancer-signed EIP-712 proof for the deliverable hash.
     */
    function submitDeliverable(
        externalEuint256 _deliverableHash,
        bytes calldata proof
    ) external;

    /**
     * @notice Approves work and releases funds for the active milestone.
     * @dev Callable by client at any time, or by freelancer if the review window expired.
     * @param rating Star rating (1 to 5) awarded by the client (auto-releases by freelancer default to 5).
     */
    function releaseMilestone(uint256 rating) external;

    /**
     * @notice Raises a formal dispute on the active milestone, forwarding decrypt permissions to the TEE.
     * @dev Client can raise before review window expires (or at any time if deliverable was not submitted to prevent MIA locks).
     * Freelancer can raise if client refuses to release.
     */
    function raiseDispute() external;

    /**
     * @notice Settles the active milestone dispute based on the secure TEE AI evaluation.
     * @dev Only callable by the authorized TEE arbiter address.
     * @param ruleInFavorOfFreelancer True to pay the freelancer, false to refund the client.
     */
    function resolveDispute(bool ruleInFavorOfFreelancer) external;

    /**
     * @notice Requests/approves mutual cancellation of the escrow contract.
     * If both parties call this, the contract is aborted and remaining funds are refunded to the client.
     */
    function mutualCancel() external;
}
