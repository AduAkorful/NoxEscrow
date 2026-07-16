// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title NoxProxy
 * @notice Standard ERC-1967 Proxy used to deploy and test our upgradeable contracts under real production proxy conditions.
 */
contract NoxProxy is ERC1967Proxy {
    constructor(
        address _logic,
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) {}
}
