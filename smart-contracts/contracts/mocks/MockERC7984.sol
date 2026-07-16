// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";

contract MockERC7984 is ERC7984 {
    constructor() ERC7984("Mock Confidential USDC", "mUSDC", "") {}

    /**
     * @notice Mint tokens using an encrypted amount and EIP-712 proof.
     */
    function mint(
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint256) {
        euint256 amount = Nox.fromExternal(encryptedAmount, inputProof);
        return _mint(to, amount);
    }

    /**
     * @notice Helper function to mint tokens using a plaintext amount (for easy test setup).
     */
    function mintPlain(address to, uint256 amount) external returns (euint256) {
        euint256 wrapped = Nox.toEuint256(amount);
        return _mint(to, wrapped);
    }
}
