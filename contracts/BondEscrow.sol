// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BondEscrow
 * @notice Atomic escrow for secondary market bond trades on Lacus.
 * @dev Seller locks bond tokens when creating a listing.
 *      Buyer calls buyListing() — USDC goes to seller and bonds go to buyer
 *      atomically in a single transaction. No trust required between parties.
 */
contract BondEscrow is ReentrancyGuard {
    IERC20 public immutable usdc;

    struct Listing {
        address seller;
        address bondToken;
        uint256 bondAmount;  // in 1e18
        uint256 usdcPrice;   // total USDC price in 1e6
        bool active;
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed bondToken,
        uint256 bondAmount,
        uint256 usdcPrice
    );
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event ListingFilled(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 bondAmount,
        uint256 usdcPrice
    );

    constructor(address usdc_) {
        require(usdc_ != address(0), "Invalid USDC address");
        usdc = IERC20(usdc_);
    }

    /**
     * @notice Create a listing — locks bond tokens in escrow.
     * @param bondToken_  ERC20 bond token address
     * @param bondAmount_ Amount of bond tokens to sell (1e18)
     * @param usdcPrice_  Total USDC price for the full amount (1e6)
     */
    function createListing(
        address bondToken_,
        uint256 bondAmount_,
        uint256 usdcPrice_
    ) external nonReentrant returns (uint256 listingId) {
        require(bondToken_ != address(0), "Invalid bond token");
        require(bondAmount_ > 0, "Bond amount must be positive");
        require(usdcPrice_ > 0, "Price must be positive");

        require(
            IERC20(bondToken_).transferFrom(msg.sender, address(this), bondAmount_),
            "Bond transfer failed - approve first"
        );

        listingId = nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            bondToken: bondToken_,
            bondAmount: bondAmount_,
            usdcPrice: usdcPrice_,
            active: true
        });

        emit ListingCreated(listingId, msg.sender, bondToken_, bondAmount_, usdcPrice_);
    }

    /**
     * @notice Cancel a listing — returns locked bonds to seller.
     */
    function cancelListing(uint256 listingId_) external nonReentrant {
        Listing storage listing = listings[listingId_];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not your listing");

        listing.active = false;

        require(
            IERC20(listing.bondToken).transfer(listing.seller, listing.bondAmount),
            "Bond return failed"
        );

        emit ListingCancelled(listingId_, msg.sender);
    }

    /**
     * @notice Buy a listing — atomically sends USDC to seller and bonds to buyer.
     * @dev Buyer must approve this contract for usdcPrice USDC before calling.
     */
    function buyListing(uint256 listingId_) external nonReentrant {
        Listing storage listing = listings[listingId_];
        require(listing.active, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy your own listing");

        listing.active = false;

        // Pull USDC from buyer → seller (atomic)
        require(
            usdc.transferFrom(msg.sender, listing.seller, listing.usdcPrice),
            "USDC payment failed - approve first"
        );

        // Send bonds from escrow → buyer (atomic)
        require(
            IERC20(listing.bondToken).transfer(msg.sender, listing.bondAmount),
            "Bond transfer failed"
        );

        emit ListingFilled(
            listingId_,
            msg.sender,
            listing.seller,
            listing.bondAmount,
            listing.usdcPrice
        );
    }

    /**
     * @notice View listing details.
     */
    function getListing(uint256 listingId_) external view returns (
        address seller,
        address bondToken,
        uint256 bondAmount,
        uint256 usdcPrice,
        bool active
    ) {
        Listing memory l = listings[listingId_];
        return (l.seller, l.bondToken, l.bondAmount, l.usdcPrice, l.active);
    }
}
