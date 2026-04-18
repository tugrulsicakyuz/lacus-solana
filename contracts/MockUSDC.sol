// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC stablecoin for testing purposes
 * @dev Standard ERC20 with minting capability for testing
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Mock USD Coin", "USDC") Ownable(msg.sender) {
        // Mint initial supply for testing (1 billion USDC)
        _mint(msg.sender, 1_000_000_000 * 10 ** DECIMALS);
    }

    /**
     * @notice Returns the number of decimals used (6, like real USDC)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Mint new tokens (for testing only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Faucet function for easy testing
     * @dev Allows anyone to mint 10,000 USDC for testing
     */
    function faucet() external {
        _mint(msg.sender, 10_000 * 10 ** DECIMALS);
    }
}
