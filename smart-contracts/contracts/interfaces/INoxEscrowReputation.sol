// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/**
 * @title INoxEscrowReputation
 * @notice Interface governing the professional reputation system (NERM) for contractors.
 * It manages completed milestone increments and lost dispute penalties under zero-knowledge.
 */
interface INoxEscrowReputation {
    // ============ Events ============

    /**
     * @notice Emitted when a contractor's reputation is updated.
     * @param freelancer The address of the contractor whose reputation was updated.
     * @param newReputation The new encrypted reputation score handle.
     */
    event ReputationUpdated(address indexed freelancer, euint256 newReputation);

    /**
     * @notice Emitted when the authorized factory address is updated.
     * @param oldFactory The previous authorized factory address.
     * @param newFactory The new authorized factory address.
     */
    event FactoryUpdated(address indexed oldFactory, address indexed newFactory);

    /**
     * @notice Emitted when the base reputation score is configured.
     * @param baseHandle The encrypted base reputation score handle.
     */
    event BaseReputationConfigured(euint256 baseHandle);

    // ============ Custom Errors ============

    /**
     * @notice Thrown when a caller other than the factory or an authorized escrow contract attempts updates.
     */
    error UnauthorizedCaller();

    /**
     * @notice Thrown when passing an invalid address (e.g. zero address) during configuration.
     */
    error InvalidAddress();

    /**
     * @notice Thrown when attempting reputation actions before the base reputation is configured.
     */
    error BaseReputationNotConfigured();

    // ============ Functions ============

    /**
     * @notice Add milestone completion parameters to the freelancer's reputation.
     * @dev Only callable by the factory or registered escrow contracts.
     * @param freelancer Address of the freelancer.
     * @param payout Encrypted payout amount (transient permission required).
     * @param rating Star rating (1 to 5).
     */
    function addCompletedMilestone(
        address freelancer,
        euint256 payout,
        uint256 rating
    ) external;

    /**
     * @notice Penalize a freelancer for a lost dispute.
     * @dev Only callable by the factory or registered escrow contracts.
     * @param freelancer Address of the freelancer.
     */
    function penalizeLostDispute(address freelancer) external;

    /**
     * @notice Fetch the reputation of a freelancer (returns the encrypted handle).
     * @param freelancer Address of the freelancer.
     * @return The encrypted reputation score handle.
     */
    function getReputation(address freelancer) external view returns (euint256);

    /**
     * @notice Update the authorized factory address.
     * @dev Only callable by the contract owner.
     * @param _newFactory The new authorized factory address.
     */
    function setFactory(address _newFactory) external;

    /**
     * @notice Configure the global starting base reputation score.
     * @dev Only callable by the contract owner.
     * @param _baseHandle The encrypted starting base score handle.
     * @param proof The client-signed EIP-712 proof for the base score handle.
     */
    function setBaseReputation(
        externalEuint256 _baseHandle,
        bytes calldata proof
    ) external;
}
