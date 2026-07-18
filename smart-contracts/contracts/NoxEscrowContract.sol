// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox, euint256, externalEuint256, ebool} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {INoxEscrowReputation} from "./interfaces/INoxEscrowReputation.sol";
import {INoxEscrowContract} from "./interfaces/INoxEscrowContract.sol";
import {INoxEscrowFactory} from "./interfaces/INoxEscrowFactory.sol";

/**
 * @title NoxEscrowContract
 * @notice Core state machine governing a milestone-based freelance escrow contract lifecycle.
 * Protects budget, requirements, and deliverables confidentiality on-chain using iExec Nox.
 */
contract NoxEscrowContract is Initializable, INoxEscrowContract {
    // ============ Constants ============

    uint256 public constant DISPUTE_TIMEOUT = 14 days;
    bytes32 private constant REENTRANCY_GUARD_SLOT = keccak256("noxescrow.reentrancy.guard.slot");

    // ============ Storage Layout ============

    address public factory;
    Status public status;
    address public client;
    address public freelancer;
    address public teeArbiter;
    IERC7984 public cUSDCToken;
    INoxEscrowReputation public reputationRegistry;
    
    uint256 public activeMilestoneIndex;
    uint256 public reviewWindow;
    uint256 public totalMilestones;
    uint256 public mutualCancelWindow;
    uint256 public clientCancelRequestTime;
    uint256 public freelancerCancelRequestTime;
    uint256 public disputeOpenTime;

    bool public clientCancelRequested;
    bool public freelancerCancelRequested;

    address public protocolTreasury;
    uint256 public platformFeeBps;

    mapping(uint256 => Milestone) public milestones;

    // ============ Modifiers ============

    modifier nonReentrant() {
        bool entered;
        bytes32 slot = REENTRANCY_GUARD_SLOT;
        assembly {
            entered := tload(slot)
        }
        if (entered) revert ReentrancyGuardReentrantCall();
        assembly {
            tstore(slot, 1)
        }
        _;
        assembly {
            tstore(slot, 0)
        }
    }

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

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

        protocolTreasury = INoxEscrowFactory(msg.sender).treasury();
        platformFeeBps = INoxEscrowFactory(msg.sender).platformFeeBps();

        if (protocolTreasury == address(0)) revert InvalidTreasury();
    }

    // ============ External Functions ============

    function initializeEscrow(
        externalEuint256[] calldata milestonePayouts,
        bytes[] calldata payoutProofs,
        externalEuint256[] calldata milestoneReqs,
        bytes[] calldata reqsProofs
    ) external override nonReentrant {
        if (msg.sender != client) revert Unauthorized();
        if (status != Status.SIGNING) revert InvalidState();
        
        uint256 total = totalMilestones;
        if (milestonePayouts.length != total) revert LengthMismatch();
        if (payoutProofs.length != total) revert LengthMismatch();
        if (milestoneReqs.length != total) revert LengthMismatch();
        if (reqsProofs.length != total) revert LengthMismatch();

        for (uint256 i = 0; i < total; ) {
            euint256 payout = Nox.fromExternal(milestonePayouts[i], payoutProofs[i]);
            euint256 reqs = Nox.fromExternal(milestoneReqs[i], reqsProofs[i]);

            Nox.allowThis(payout);
            Nox.allowThis(reqs);

            Nox.addViewer(reqs, client);
            Nox.addViewer(reqs, freelancer);
            Nox.addViewer(payout, client);
            Nox.addViewer(payout, freelancer);

            milestones[i].payoutHandle = payout;
            milestones[i].requirementsHash = reqs;

            Nox.allowTransient(payout, address(cUSDCToken));
            cUSDCToken.confidentialTransferFrom(msg.sender, address(this), payout);

            unchecked {
                ++i;
            }
        }

        status = Status.ACTIVE;
        emit ContractInitialized(client, freelancer, total);
    }

    function submitDeliverable(
        externalEuint256 _deliverableHash,
        bytes calldata proof
    ) external override nonReentrant {
        if (msg.sender != freelancer) revert Unauthorized();
        if (status != Status.ACTIVE) revert InvalidState();
        if (activeMilestoneIndex >= totalMilestones) revert InvalidState();

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        if (activeMilestone.isSubmitted) revert AlreadySubmitted();
        if (activeMilestone.isSettled) revert AlreadySettled();

        euint256 devHash = Nox.fromExternal(_deliverableHash, proof);
        Nox.allowThis(devHash);

        Nox.addViewer(devHash, client);
        Nox.addViewer(devHash, freelancer);

        activeMilestone.deliverableHash = devHash;
        activeMilestone.submissionTime = uint128(block.timestamp);
        activeMilestone.isSubmitted = true;

        emit DeliverableSubmitted(activeMilestoneIndex, devHash);
    }

    function releaseMilestone(uint256 rating) external override nonReentrant {
        if (status != Status.ACTIVE) revert InvalidState();
        if (activeMilestoneIndex >= totalMilestones) revert InvalidState();

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        if (!activeMilestone.isSubmitted) revert InvalidState();
        if (activeMilestone.isSettled) revert AlreadySettled();

        if (msg.sender == freelancer) {
            if (block.timestamp <= activeMilestone.submissionTime + reviewWindow) {
                revert ReviewWindowNotExpired();
            }
            rating = 5;
        } else {
            if (msg.sender != client) revert Unauthorized();
            if (rating < 1 || rating > 5) revert InvalidRating();
        }

        activeMilestone.isSettled = true;
        uint256 currentMilestoneIndex = activeMilestoneIndex;

        activeMilestoneIndex++;
        if (activeMilestoneIndex == totalMilestones) {
            status = Status.COMPLETED;
        }

        emit MilestoneApproved(currentMilestoneIndex);

        euint256 fee;
        euint256 netPayout;

        if (platformFeeBps > 0 && protocolTreasury != address(0)) {
            fee = Nox.div(
                Nox.mul(activeMilestone.payoutHandle, Nox.toEuint256(platformFeeBps)),
                Nox.toEuint256(10000)
            );
            netPayout = Nox.sub(activeMilestone.payoutHandle, fee);

            Nox.allowTransient(fee, address(cUSDCToken));
            cUSDCToken.confidentialTransfer(protocolTreasury, fee);

            emit PlatformFeeCollected(currentMilestoneIndex, fee);
        } else {
            netPayout = activeMilestone.payoutHandle;
        }

        Nox.allowTransient(netPayout, address(cUSDCToken));
        cUSDCToken.confidentialTransfer(freelancer, netPayout);

        Nox.allowTransient(netPayout, address(reputationRegistry));
        reputationRegistry.addCompletedMilestone(freelancer, netPayout, rating);
    }

    function raiseDispute() external override nonReentrant {
        if (msg.sender != client && msg.sender != freelancer) revert Unauthorized();
        if (status != Status.ACTIVE) revert InvalidState();
        if (activeMilestoneIndex >= totalMilestones) revert InvalidState();

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        if (activeMilestone.isSettled) revert AlreadySettled();

        if (msg.sender == client) {
            if (activeMilestone.isSubmitted) {
                if (block.timestamp > activeMilestone.submissionTime + reviewWindow) {
                    revert ReviewWindowExpired();
                }
            }
        } else {
            if (!activeMilestone.isSubmitted) revert InvalidState();
        }

        status = Status.DISPUTED;
        disputeOpenTime = block.timestamp;

        euint256 devHash = activeMilestone.isSubmitted ? activeMilestone.deliverableHash : Nox.toEuint256(0);

        Nox.allow(activeMilestone.payoutHandle, teeArbiter);
        Nox.allow(activeMilestone.requirementsHash, teeArbiter);
        Nox.allow(devHash, teeArbiter);

        emit DisputeOpened(activeMilestoneIndex, activeMilestone.requirementsHash, devHash);
    }

    function resolveDispute(bool ruleInFavorOfFreelancer) external override nonReentrant {
        if (msg.sender != teeArbiter) revert Unauthorized();
        if (status != Status.DISPUTED) revert InvalidState();
        if (activeMilestoneIndex >= totalMilestones) revert InvalidState();

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        if (activeMilestone.isSettled) revert AlreadySettled();

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

            euint256 fee;
            euint256 netPayout;

            if (platformFeeBps > 0 && protocolTreasury != address(0)) {
                fee = Nox.div(
                    Nox.mul(activeMilestone.payoutHandle, Nox.toEuint256(platformFeeBps)),
                    Nox.toEuint256(10000)
                );
                netPayout = Nox.sub(activeMilestone.payoutHandle, fee);

                Nox.allowTransient(fee, address(cUSDCToken));
                cUSDCToken.confidentialTransfer(protocolTreasury, fee);

                emit PlatformFeeCollected(currentMilestoneIndex, fee);
            } else {
                netPayout = activeMilestone.payoutHandle;
            }

            Nox.allowTransient(netPayout, address(cUSDCToken));
            cUSDCToken.confidentialTransfer(freelancer, netPayout);

            Nox.allowTransient(netPayout, address(reputationRegistry));
            reputationRegistry.addCompletedMilestone(freelancer, netPayout, 5);
        } else {
            status = Status.REFUNDED;
            
            emit DisputeResolved(currentMilestoneIndex, false);

            Nox.allowTransient(activeMilestone.payoutHandle, address(cUSDCToken));
            cUSDCToken.confidentialTransfer(client, activeMilestone.payoutHandle);

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

            reputationRegistry.penalizeLostDispute(freelancer);
        }
    }

    function emergencyResolveDispute() external override nonReentrant {
        if (status != Status.DISPUTED) revert InvalidState();
        if (block.timestamp <= disputeOpenTime + DISPUTE_TIMEOUT) {
            revert DisputeTimeoutNotExpired();
        }

        emit EmergencyResolveTriggered(msg.sender);

        Milestone storage activeMilestone = milestones[activeMilestoneIndex];
        
        if (!activeMilestone.isSettled) {
            activeMilestone.isSettled = true;
            Nox.allowTransient(activeMilestone.payoutHandle, address(cUSDCToken));
            cUSDCToken.confidentialTransfer(client, activeMilestone.payoutHandle);
        }

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
        emit DisputeResolved(activeMilestoneIndex, false);
    }

    function mutualCancel() external override nonReentrant {
        if (status != Status.ACTIVE) revert InvalidState();

        if (msg.sender == client) {
            if (freelancerCancelRequested && block.timestamp <= freelancerCancelRequestTime + mutualCancelWindow) {
                clientCancelRequested = true;
                clientCancelRequestTime = block.timestamp;
            } else {
                clientCancelRequested = true;
                clientCancelRequestTime = block.timestamp;
                freelancerCancelRequested = false;
                freelancerCancelRequestTime = 0;
            }
        } else if (msg.sender == freelancer) {
            if (clientCancelRequested && block.timestamp <= clientCancelRequestTime + mutualCancelWindow) {
                freelancerCancelRequested = true;
                freelancerCancelRequestTime = block.timestamp;
            } else {
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
