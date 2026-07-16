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
    address public cUSDCToken; // Canonical ERC-7984 Token

    mapping(address => bool) public isEscrowContract;
    address[] public allEscrows;

    // ============ Constructor & Initializer ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the global factory parameters.
     * @param _escrowImplementation Cloned escrow agreement base template address.
     * @param _reputationRegistry Global reputation score keeper address.
     * @param _cUSDCToken Address of the canonical ERC-7984 confidential wrapping token.
     */
    function initialize(
        address _escrowImplementation,
        address _reputationRegistry,
        address _cUSDCToken
    ) external override initializer {
        if (_escrowImplementation == address(0)) revert InvalidImplementation();
        // Allow reputation registry to be address(0) initially to break the circular dependency at deploy time

        __Ownable_init(msg.sender);

        escrowImplementation = _escrowImplementation;
        reputationRegistry = _reputationRegistry;
        cUSDCToken = _cUSDCToken;
        reviewWindow = 3 days;
    }

    // ============ External Functions ============

    /**
     * @notice Deploys a new lightweight clone of the escrow agreement and initializes its state.
     * @dev Uses factory's internal canonical cUSDCToken address, resolving the token exploit permanently.
     * @param _freelancer Address of the hired contractor.
     * @param _teeArbiter Address of the secure TEE AI oracle.
     * @param _totalMilestones Number of sequential milestones in the agreement.
     * @param _customReviewWindow Custom review window duration (0 to fall back to global default).
     * @return The address of the newly deployed cloned contract.
     */
    function createEscrow(
        address _freelancer,
        address _teeArbiter,
        uint256 _totalMilestones,
        uint256 _customReviewWindow
    ) external override returns (address) {
        if (reputationRegistry == address(0)) revert InvalidRegistry();
        if (cUSDCToken == address(0)) revert InvalidToken();

        address clone = Clones.clone(escrowImplementation);

        // Resolve custom review window, fallback to factory's default if 0 is passed
        uint256 finalReviewWindow = _customReviewWindow == 0 ? reviewWindow : _customReviewWindow;
        if (finalReviewWindow < 5 seconds || finalReviewWindow > 90 days) revert InvalidWindow();

        NoxEscrowContract(clone).initialize(
            msg.sender, // client
            _freelancer,
            _teeArbiter,
            cUSDCToken,
            reputationRegistry,
            _totalMilestones,
            finalReviewWindow
        );

        isEscrowContract[clone] = true;
        allEscrows.push(clone);

        emit EscrowCreated(clone, msg.sender, _freelancer, _totalMilestones);

        return clone;
    }

    /**
     * @notice Fetch the total number of deployed escrow contracts.
     * @return The total escrow count.
     */
    function escrowsCount() external view override returns (uint256) {
        return allEscrows.length;
    }

    // ============ Configuration Functions (Only Owner) ============

    /**
     * @notice Update the template escrow implementation used for cloning.
     * @param _newImplementation The new implementation address.
     */
    function setEscrowImplementation(
        address _newImplementation
    ) external override onlyOwner {
        if (_newImplementation == address(0)) revert InvalidImplementation();
        address oldImpl = escrowImplementation;
        escrowImplementation = _newImplementation;
        emit ImplementationUpdated(oldImpl, _newImplementation);
    }

    /**
     * @notice Update the global reputation registry address.
     * @param _newRegistry The new reputation registry address.
     */
    function setReputationRegistry(
        address _newRegistry
    ) external override onlyOwner {
        if (_newRegistry == address(0)) revert InvalidRegistry();
        address oldRegistry = reputationRegistry;
        reputationRegistry = _newRegistry;
        emit ReputationRegistryUpdated(oldRegistry, _newRegistry);
    }

    /**
     * @notice Update the global default review window.
     * @param _newReviewWindow The new review window duration in seconds.
     */
    function setReviewWindow(
        uint256 _newReviewWindow
    ) external override onlyOwner {
        if (_newReviewWindow < 5 seconds || _newReviewWindow > 90 days) revert InvalidWindow();
        uint256 oldWindow = reviewWindow;
        reviewWindow = _newReviewWindow;
        emit ReviewWindowUpdated(oldWindow, _newReviewWindow);
    }

    /**
     * @notice Update the canonical cUSDCToken address.
     * @param _newToken The new token address.
     */
    function setUSDCToken(
        address _newToken
    ) external override onlyOwner {
        if (_newToken == address(0)) revert InvalidToken();
        address oldToken = cUSDCToken;
        cUSDCToken = _newToken;
        emit TokenUpdated(oldToken, _newToken);
    }

    // Required by UUPS
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ UUPS Upgrade Storage Gap ============
    uint256[50] private __gap;
}
