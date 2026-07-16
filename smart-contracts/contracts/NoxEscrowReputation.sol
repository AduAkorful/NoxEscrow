// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox, euint256, externalEuint256, ebool} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {INoxEscrowReputation} from "./interfaces/INoxEscrowReputation.sol";

interface INoxEscrowFactory {
    function isEscrowContract(address _contract) external view returns (bool);
}

/**
 * @title NoxEscrowReputation
 * @notice Global registry managing professional reputation (NERM) for contractors.
 * Score changes are calculated under zero-knowledge and can be publicly decrypted off-chain.
 */
contract NoxEscrowReputation is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    INoxEscrowReputation
{
    // ============ State Variables ============

    address public factory;
    mapping(address => euint256) private reputationScores;
    euint256 public baseReputationHandle; // Pre-encrypted starting score (1000)

    // ============ Modifiers ============

    modifier onlyEscrowContract() {
        if (
            msg.sender != factory &&
            !INoxEscrowFactory(factory).isEscrowContract(msg.sender)
        ) {
            revert UnauthorizedCaller();
        }
        _;
    }

    // ============ Constructor & Initializer ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the registry with the authorized factory address.
     * @param _factory The authorized NoxEscrowFactory address.
     */
    function initialize(address _factory) external initializer {
        if (_factory == address(0)) revert InvalidAddress();
        __Ownable_init(msg.sender);
        factory = _factory;
    }

    // ============ External Functions ============

    /**
     * @notice Configure the global starting base reputation score.
     * @dev Only callable by the contract owner.
     * @param _baseHandle The encrypted starting base score handle.
     * @param proof The client-signed EIP-712 proof for the base score handle.
     */
    function setBaseReputation(
        externalEuint256 _baseHandle,
        bytes calldata proof
    ) external override onlyOwner {
        euint256 handle = Nox.fromExternal(_baseHandle, proof);
        Nox.allowThis(handle);
        Nox.allowPublicDecryption(handle);
        baseReputationHandle = handle;

        emit BaseReputationConfigured(handle);
    }

    /**
     * @notice Add milestone completion parameters to the freelancer's reputation.
     * @dev Only callable by the factory or registered escrow contracts.
     * Formula: nextRep = currentRep + payout * rating
     * @param freelancer Address of the freelancer.
     * @param payout Encrypted payout amount (transient permission required).
     * @param rating Star rating (1 to 5).
     */
    function addCompletedMilestone(
        address freelancer,
        euint256 payout,
        uint256 rating
    ) external override onlyEscrowContract {
        if (!Nox.isInitialized(baseReputationHandle)) revert BaseReputationNotConfigured();

        euint256 ratingHandle = Nox.toEuint256(rating);
        euint256 scoreToAdd = Nox.mul(payout, ratingHandle);

        euint256 currentRep = reputationScores[freelancer];
        euint256 nextRep;

        if (Nox.isInitialized(currentRep)) {
            nextRep = Nox.add(currentRep, scoreToAdd);
        } else {
            // Read pre-initialized base handle
            nextRep = Nox.add(baseReputationHandle, scoreToAdd);
        }

        Nox.allowThis(nextRep);
        Nox.allowPublicDecryption(nextRep);
        reputationScores[freelancer] = nextRep;

        emit ReputationUpdated(freelancer, nextRep);
    }

    /**
     * @notice Penalize a freelancer for a lost dispute.
     * @dev Only callable by the factory or registered escrow contracts.
     * Formula: nextRep = max(0, currentRep - 500)
     * @param freelancer Address of the freelancer.
     */
    function penalizeLostDispute(
        address freelancer
    ) external override onlyEscrowContract {
        if (!Nox.isInitialized(baseReputationHandle)) revert BaseReputationNotConfigured();

        euint256 currentRep = reputationScores[freelancer];
        euint256 nextRep;
        euint256 penalty = Nox.toEuint256(500);

        if (Nox.isInitialized(currentRep)) {
            ebool isGreaterOrEqual = Nox.ge(currentRep, penalty);
            euint256 zero = Nox.toEuint256(0);
            euint256 subtracted = Nox.sub(currentRep, penalty);
            nextRep = Nox.select(isGreaterOrEqual, subtracted, zero);
        } else {
            // 1000 base - 500 penalty = 500
            ebool isGreaterOrEqual = Nox.ge(baseReputationHandle, penalty);
            euint256 zero = Nox.toEuint256(0);
            euint256 subtracted = Nox.sub(baseReputationHandle, penalty);
            nextRep = Nox.select(isGreaterOrEqual, subtracted, zero);
        }

        Nox.allowThis(nextRep);
        Nox.allowPublicDecryption(nextRep);
        reputationScores[freelancer] = nextRep;

        emit ReputationUpdated(freelancer, nextRep);
    }

    /**
     * @notice Fetch the reputation of a freelancer (returns the encrypted handle).
     * Returns the base handle if uninitialized, resolving the reputation inversion bug.
     * @param freelancer Address of the freelancer.
     * @return The encrypted reputation score handle.
     */
    function getReputation(
        address freelancer
    ) external view override returns (euint256) {
        euint256 score = reputationScores[freelancer];
        if (Nox.isInitialized(score)) {
            return score;
        } else {
            return baseReputationHandle;
        }
    }

    /**
     * @notice Update the authorized factory address.
     * @param _newFactory The new authorized factory address.
     */
    function setFactory(address _newFactory) external override onlyOwner {
        if (_newFactory == address(0)) revert InvalidAddress();
        address oldFactory = factory;
        factory = _newFactory;
        emit FactoryUpdated(oldFactory, _newFactory);
    }

    // Required by UUPS
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // ============ UUPS Upgrade Storage Gap ============
    uint256[50] private __gap;
}
