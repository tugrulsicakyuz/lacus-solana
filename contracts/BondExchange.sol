// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBondToken {
    function issuer() external view returns (address);
}

/**
 * @title BondExchange
 * @notice Primary market exchange for purchasing bond tokens
 * @dev Secondary market is handled via direct P2P ERC-20 transfers (no order book).
 *      USDC payments flow directly to bond issuers — platform holds no custody.
 */
contract BondExchange is ReentrancyGuard, Ownable {
    IERC20 public immutable paymentToken;
    address public bondFactory;

    // Bond prices for primary market purchase (scaled by 1e6 for USDC decimals)
    mapping(address => uint256) public bondPrices;

    // Events
    event BondSold(
        address indexed bondToken,
        address indexed buyer,
        address indexed issuer,
        uint256 amount,
        uint256 payment,
        uint256 timestamp
    );
    
    /**
     * @notice Constructor
     * @param paymentToken_ Address of the USDC/payment token
     */
    constructor(address paymentToken_) Ownable(msg.sender) {
        require(paymentToken_ != address(0), "Invalid payment token");
        paymentToken = IERC20(paymentToken_);
    }

    /**
     * @notice Set the BondFactory address
     * @param factory_ Address of the BondFactory contract
     */
    function setBondFactoryAddress(address factory_) external onlyOwner {
        require(factory_ != address(0), "Invalid factory address");
        bondFactory = factory_;
    }

    /**
     * @notice Set bond price for primary market
     * @param bondToken_ Address of the bond token
     * @param price_ Price per bond token (scaled by 1e6 for USDC decimals)
     */
    function setBondPrice(address bondToken_, uint256 price_) external {
        require(msg.sender == owner() || msg.sender == bondFactory, "Not authorized");
        require(bondToken_ != address(0), "Invalid bond token");
        bondPrices[bondToken_] = price_;
    }

    /**
     * @notice Buy bond tokens from primary market
     * @dev USDC payment goes directly to bond issuer — platform holds no custody
     * @param bondToken_ Address of the bond token to buy
     * @param amount_ Amount of bond tokens to buy (scaled by 1e18)
     */
    function buyFromExchange(address bondToken_, uint256 amount_) external nonReentrant {
        require(bondToken_ != address(0), "Invalid bond token");
        require(amount_ > 0, "Amount must be positive");

        uint256 exchangeBalance = IERC20(bondToken_).balanceOf(address(this));
        require(exchangeBalance >= amount_, "Insufficient exchange balance");

        uint256 price = bondPrices[bondToken_];
        require(price > 0, "Bond price not set");

        // (price in 1e6) * (amount in 1e18) / 1e18 = USDC in 1e6
        uint256 totalPayment = (price * amount_) / 1e18;

        // Get issuer address directly from bond contract
        address issuerAddress = IBondToken(bondToken_).issuer();
        require(issuerAddress != address(0), "Invalid issuer");

        // Transfer USDC directly from buyer to issuer (no platform custody)
        require(
            paymentToken.transferFrom(msg.sender, issuerAddress, totalPayment),
            "Payment transfer failed"
        );

        // Transfer bond tokens from exchange to buyer
        require(
            IERC20(bondToken_).transfer(msg.sender, amount_),
            "Bond transfer failed"
        );

        emit BondSold(bondToken_, msg.sender, issuerAddress, amount_, totalPayment, block.timestamp);
    }
}
