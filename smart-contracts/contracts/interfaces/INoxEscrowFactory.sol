// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

/**
 * @title INoxEscrowFactory
 * @notice Interface governing the factory deployed to orchestrate lightweight, upgradeable escrow clones.
 */
interface INoxEscrowFactory {
    // ============ Events ============

    /**
     * @notice Emitted when a new escrow contract is deployed.
     * @param escrowAddress The address of the newly deployed cloned contract.
     * @param client The address of the client who initiated the escrow.
     * @param freelancer The address of the contractor/freelancer hired.
     * @param totalMilestones The total number of sequential milestones in the agreement.
     */
    event EscrowCreated(
        address indexed escrowAddress,
        address indexed client,
        address indexed freelancer,
        uint256 totalMilestones
    );

    /**
     * @notice Emitted when the template escrow implementation is updated.
     * @param oldImpl The address of the previous implementation template.
     * @param newImpl The address of the new implementation template.
     */
    event ImplementationUpdated(address indexed oldImpl, address indexed newImpl);

    /**
     * @notice Emitted when the reputation registry is updated.
     * @param oldRegistry The address of the previous reputation contract.
     * @param newRegistry The address of the new reputation contract.
     */
    event ReputationRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    /**
     * @notice Emitted when the global protocol review window is updated.
     * @param oldWindow The previous review window duration.
     * @param newWindow The new review window duration.
     */
    event ReviewWindowUpdated(uint256 oldWindow, uint256 newWindow);

    /**
     * @notice Emitted when the global mutual cancellation window is updated.
     * @param oldWindow The previous mutual cancel window duration.
     * @param newWindow The new mutual cancel window duration.
     */
    event MutualCancelWindowUpdated(uint256 oldWindow, uint256 newWindow);

    /**
     * @notice Emitted when the canonical cUSDCToken address is updated.
     * @param oldToken The previous token address.
     * @param newToken The new token address.
     */
    event TokenUpdated(address indexed oldToken, address indexed newToken);

    // ============ Custom Errors ============

    error InvalidImplementation();
    error InvalidRegistry();
    error InvalidWindow();
    error InvalidToken();

    // ============ Functions ============

    /**
     * @notice Initializes the global parameters of the factory.
     * @dev Only callable once during UUPS deployment.
     * @param _escrowImplementation Address of the cloned template.
     * @param _reputationRegistry Address of the global reputation keeper.
     * @param _cUSDCToken Address of the canonical ERC-7984 confidential wrapping token.
     */
    function initialize(
        address _escrowImplementation,
        address _reputationRegistry,
        address _cUSDCToken
    ) external;

    /**
     * @notice Deploys a new lightweight clone of the escrow agreement and initializes its state.
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
    ) external returns (address);

    /**
     * @notice Fetch the total number of deployed escrow contracts.
     * @return The total escrow count.
     */
    function escrowsCount() external view returns (uint256);

    /**
     * @notice Check if a specific address is a legitimate escrow contract deployed by this factory.
     * @param _contract The address to check.
     * @return True if the address is a verified cloned escrow, false otherwise.
     */
    function isEscrowContract(address _contract) external view returns (bool);

    /**
     * @notice Get the address of a deployed escrow clone at a specific index.
     * @param index The array index to query.
     * @return The address of the escrow clone.
     */
    function allEscrows(uint256 index) external view returns (address);

    /**
     * @notice Update the template escrow implementation used for cloning.
     * @dev Only callable by the factory owner.
     * @param _newImplementation The new implementation address.
     */
    function setEscrowImplementation(address _newImplementation) external;

    /**
     * @notice Update the global reputation registry address.
     * @dev Only callable by the factory owner.
     * @param _newRegistry The new reputation registry address.
     */
    function setReputationRegistry(address _newRegistry) external;

    /**
     * @notice Update the global default review window.
     * @dev Only callable by the factory owner.
     * @param _newReviewWindow The new review window duration in seconds.
     */
    function setReviewWindow(uint256 _newReviewWindow) external;

    /**
     * @notice Update the global default mutual cancellation window.
     * @dev Only callable by the factory owner.
     * @param _newMutualCancelWindow The new mutual cancel window duration in seconds.
     */
    function setMutualCancelWindow(uint256 _newMutualCancelWindow) external;

    /**
     * @notice Get the global default mutual cancellation window.
     * @return The mutual cancel window duration.
     */
    function mutualCancelWindow() external view returns (uint256);

    /**
     * @notice Update the canonical cUSDCToken address.
     * @dev Only callable by the factory owner.
     * @param _newToken The new token address.
     */
    function setUSDCToken(address _newToken) external;
}
