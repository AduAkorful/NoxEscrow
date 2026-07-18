// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";

/**
 * @title ConfidentialUSDCToken
 * @notice Standard ERC-7984 compliant wrapped confidential USDC token.
 * Wraps public USDC (underlying ERC-20) into private, encrypted balances.
 */
contract ConfidentialUSDCToken is ERC20ToERC7984Wrapper {
    constructor(
        address _underlyingUSDC
    )
        ERC20ToERC7984Wrapper(
            "Confidential Wrapped USDC",
            "cUSDC",
            "",
            IERC20(_underlyingUSDC)
        )
    {}
}
