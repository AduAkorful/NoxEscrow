// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

/**
 * @title INoxEscrowFactory
 * @notice Interface governing the factory deployed to orchestrate lightweight, upgradeable escrow clones.
 */
interface INoxEscrowFactory {
    // ============ Events ============

    event EscrowCreated(
        address indexed escrowAddress,
        address indexed client,
        address indexed freelancer,
        uint256 totalMilestones
    );

    event ImplementationUpdated(address indexed oldImpl, address indexed newImpl);

    event ReputationRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    event ReviewWindowUpdated(uint256 oldWindow, uint256 newWindow);

    event MutualCancelWindowUpdated(uint256 oldWindow, uint256 newWindow);

    event TokenUpdated(address indexed oldToken, address indexed newToken);

    event CanonicalArbiterUpdated(address indexed oldArbiter, address indexed newArbiter);

    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ============ Custom Errors ============

    error InvalidImplementation();
    error InvalidRegistry();
    error InvalidWindow();
    error InvalidToken();
    error InvalidArbiter();
    error InvalidTreasury();
    error InvalidFeeBps();

    // ============ Functions ============

    function initialize(
        address _escrowImplementation,
        address _reputationRegistry,
        address _cUSDCToken,
        address _canonicalTeeArbiter,
        address _treasury
    ) external;

    function createEscrow(
        address _freelancer,
        uint256 _totalMilestones,
        uint256 _customReviewWindow
    ) external returns (address);

    function escrowsCount() external view returns (uint256);

    function isEscrowContract(address _contract) external view returns (bool);

    function allEscrows(uint256 index) external view returns (address);

    function setEscrowImplementation(address _newImplementation) external;

    function setReputationRegistry(address _newRegistry) external;

    function setReviewWindow(uint256 _newReviewWindow) external;

    function setMutualCancelWindow(uint256 _newMutualCancelWindow) external;

    function mutualCancelWindow() external view returns (uint256);

    function setUSDCToken(address _newToken) external;

    function canonicalTeeArbiter() external view returns (address);

    function setCanonicalTeeArbiter(address _newArbiter) external;

    function platformFeeBps() external view returns (uint256);

    function setPlatformFeeBps(uint256 _newFeeBps) external;

    function treasury() external view returns (address);

    function setTreasury(address _newTreasury) external;
}
