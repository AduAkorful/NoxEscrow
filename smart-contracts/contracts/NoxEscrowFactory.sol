// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {NoxEscrowContract} from "./NoxEscrowContract.sol";
import {INoxEscrowFactory} from "./interfaces/INoxEscrowFactory.sol";

/**
 * @title NoxEscrowFactory
 * @notice Factory deployed as UUPS Proxy to orchestrate lightweight EIP-1167 escrow agreement clones.
 * Manages global protocol parameters and catalogs all deployed active escrows.
 */
contract NoxEscrowFactory is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    INoxEscrowFactory
{
    // ============ State Variables ============

    address public escrowImplementation;
    address public reputationRegistry;
    uint256 public reviewWindow;
    uint256 public mutualCancelWindow;
    address public cUSDCToken;
    address public canonicalTeeArbiter;
    uint256 public platformFeeBps;
    address public treasury;

    mapping(address => bool) public isEscrowContract;
    address[] public allEscrows;

    // ============ Constructor & Initializer ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _escrowImplementation,
        address _reputationRegistry,
        address _cUSDCToken,
        address _canonicalTeeArbiter,
        address _treasury
    ) external override initializer {
        if (_escrowImplementation == address(0)) revert InvalidImplementation();
        if (_canonicalTeeArbiter == address(0)) revert InvalidArbiter();
        if (_treasury == address(0)) revert InvalidTreasury();

        __Ownable_init(msg.sender);

        escrowImplementation = _escrowImplementation;
        reputationRegistry = _reputationRegistry;
        cUSDCToken = _cUSDCToken;
        canonicalTeeArbiter = _canonicalTeeArbiter;
        treasury = _treasury;
        platformFeeBps = 50; // Default 0.5% (50 basis points)
        reviewWindow = 3 days;
        mutualCancelWindow = 7 days;
    }

    // ============ External Functions ============

    function createEscrow(
        address _freelancer,
        uint256 _totalMilestones,
        uint256 _customReviewWindow
    ) external override returns (address) {
        if (reputationRegistry == address(0)) revert InvalidRegistry();
        if (cUSDCToken == address(0)) revert InvalidToken();
        if (canonicalTeeArbiter == address(0)) revert InvalidArbiter();
        if (treasury == address(0)) revert InvalidTreasury();

        address clone = Clones.clone(escrowImplementation);

        uint256 finalReviewWindow = _customReviewWindow == 0 ? reviewWindow : _customReviewWindow;
        if (finalReviewWindow < 5 seconds || finalReviewWindow > 90 days) revert InvalidWindow();

        NoxEscrowContract(clone).initialize(
            msg.sender,
            _freelancer,
            canonicalTeeArbiter,
            cUSDCToken,
            reputationRegistry,
            _totalMilestones,
            finalReviewWindow,
            mutualCancelWindow
        );

        isEscrowContract[clone] = true;
        allEscrows.push(clone);

        emit EscrowCreated(clone, msg.sender, _freelancer, _totalMilestones);

        return clone;
    }

    function escrowsCount() external view override returns (uint256) {
        return allEscrows.length;
    }

    // ============ Configuration Functions (Only Owner) ============

    function setEscrowImplementation(
        address _newImplementation
    ) external override onlyOwner {
        if (_newImplementation == address(0)) revert InvalidImplementation();
        address oldImpl = escrowImplementation;
        escrowImplementation = _newImplementation;
        emit ImplementationUpdated(oldImpl, _newImplementation);
    }

    function setReputationRegistry(
        address _newRegistry
    ) external override onlyOwner {
        if (_newRegistry == address(0)) revert InvalidRegistry();
        address oldRegistry = reputationRegistry;
        reputationRegistry = _newRegistry;
        emit ReputationRegistryUpdated(oldRegistry, _newRegistry);
    }

    function setReviewWindow(
        uint256 _newReviewWindow
    ) external override onlyOwner {
        if (_newReviewWindow < 5 seconds || _newReviewWindow > 90 days) revert InvalidWindow();
        uint256 oldWindow = reviewWindow;
        reviewWindow = _newReviewWindow;
        emit ReviewWindowUpdated(oldWindow, _newReviewWindow);
    }

    function setMutualCancelWindow(
        uint256 _newMutualCancelWindow
    ) external override onlyOwner {
        if (_newMutualCancelWindow < 5 seconds || _newMutualCancelWindow > 90 days) revert InvalidWindow();
        uint256 oldWindow = mutualCancelWindow;
        mutualCancelWindow = _newMutualCancelWindow;
        emit MutualCancelWindowUpdated(oldWindow, _newMutualCancelWindow);
    }

    function setUSDCToken(
        address _newToken
    ) external override onlyOwner {
        if (_newToken == address(0)) revert InvalidToken();
        address oldToken = cUSDCToken;
        cUSDCToken = _newToken;
        emit TokenUpdated(oldToken, _newToken);
    }

    function setCanonicalTeeArbiter(
        address _newArbiter
    ) external override onlyOwner {
        if (_newArbiter == address(0)) revert InvalidArbiter();
        address oldArbiter = canonicalTeeArbiter;
        canonicalTeeArbiter = _newArbiter;
        emit CanonicalArbiterUpdated(oldArbiter, _newArbiter);
    }

    function setPlatformFeeBps(
        uint256 _newFeeBps
    ) external override onlyOwner {
        if (_newFeeBps > 1000) revert InvalidFeeBps(); // Max 10%
        uint256 oldFeeBps = platformFeeBps;
        platformFeeBps = _newFeeBps;
        emit PlatformFeeUpdated(oldFeeBps, _newFeeBps);
    }

    function setTreasury(
        address _newTreasury
    ) external override onlyOwner {
        if (_newTreasury == address(0)) revert InvalidTreasury();
        address oldTreasury = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    uint256[50] private __gap;
}
