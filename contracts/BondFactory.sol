// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BondToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBondExchange {
    function setBondPrice(address bondToken_, uint256 price_) external;
}

/**
 * @title BondFactory
 * @notice Factory contract for deploying independent BondToken contracts
 */
contract BondFactory is ReentrancyGuard, Ownable {
    IERC20 public immutable paymentToken;
    address public immutable bondExchange;

    address[] public deployedBonds;

    mapping(address => BondMetadata) public bondMetadata;
    mapping(address => address[]) public issuerBonds;

    struct BondMetadata {
        string name;
        string symbol;
        address issuer;
        uint256 maturityDate;
        uint256 totalSupplyCap;
        uint256 deployedAt;
        bytes32 loanAgreementHash;
        bool exists;
    }

    event BondDeployed(
        address indexed bondAddress,
        address indexed issuer,
        string name,
        string symbol,
        uint256 maturityDate,
        uint256 totalSupplyCap,
        bytes32 loanAgreementHash,
        uint256 timestamp
    );
    
    /**
     * @notice Constructor
     * @param paymentToken_ Address of the USDC/payment token
     * @param bondExchange_ Address of the BondExchange contract
     */
    constructor(address paymentToken_, address bondExchange_) Ownable(msg.sender) {
        require(paymentToken_ != address(0), "Invalid payment token");
        require(bondExchange_ != address(0), "Invalid bond exchange");
        paymentToken = IERC20(paymentToken_);
        bondExchange = bondExchange_;
    }

    /**
     * @notice Deploy a new bond token contract
     * @param name_ Name of the bond
     * @param symbol_ Symbol of the bond token
     * @param issuer_ Address of the bond issuer
     * @param maturityDate_ Unix timestamp of maturity date
     * @param totalSupplyCap_ Maximum supply of bond tokens
     * @param pricePerToken_ Price per token in USDC (scaled by 1e6)
     * @param loanAgreementHash_ SHA-256 hash of the signed Loan Agreement (must not be zero)
     * @return bondAddress Address of the newly deployed bond contract
     */
    function createBond(
        string memory name_,
        string memory symbol_,
        address issuer_,
        uint256 maturityDate_,
        uint256 totalSupplyCap_,
        uint256 pricePerToken_,
        bytes32 loanAgreementHash_
    ) external nonReentrant returns (address bondAddress) {
        require(issuer_ != address(0), "Invalid issuer address");
        require(maturityDate_ > block.timestamp, "Maturity must be in future");
        require(totalSupplyCap_ > 0, "Supply cap must be positive");
        require(bytes(name_).length > 0, "Name cannot be empty");
        require(bytes(symbol_).length > 0, "Symbol cannot be empty");
        require(loanAgreementHash_ != bytes32(0), "Loan Agreement must be signed before deployment");

        BondToken newBond = new BondToken(
            name_,
            symbol_,
            address(paymentToken),
            issuer_,
            maturityDate_,
            totalSupplyCap_,
            loanAgreementHash_
        );

        bondAddress = address(newBond);

        newBond.mint(bondExchange, totalSupplyCap_);

        IBondExchange(bondExchange).setBondPrice(bondAddress, pricePerToken_);

        newBond.transferOwnership(issuer_);

        bondMetadata[bondAddress] = BondMetadata({
            name: name_,
            symbol: symbol_,
            issuer: issuer_,
            maturityDate: maturityDate_,
            totalSupplyCap: totalSupplyCap_,
            deployedAt: block.timestamp,
            loanAgreementHash: loanAgreementHash_,
            exists: true
        });

        deployedBonds.push(bondAddress);
        issuerBonds[issuer_].push(bondAddress);

        emit BondDeployed(
            bondAddress,
            issuer_,
            name_,
            symbol_,
            maturityDate_,
            totalSupplyCap_,
            loanAgreementHash_,
            block.timestamp
        );

        return bondAddress;
    }


    function getAllBonds() external view returns (address[] memory) {
        return deployedBonds;
    }

    function getBondsByIssuer(address issuer_) external view returns (address[] memory) {
        return issuerBonds[issuer_];
    }

    function getBondCount() external view returns (uint256) {
        return deployedBonds.length;
    }

    function isBond(address bondAddress_) external view returns (bool) {
        return bondMetadata[bondAddress_].exists;
    }

    function getBondMetadata(address bondAddress_) external view returns (BondMetadata memory) {
        require(bondMetadata[bondAddress_].exists, "Bond does not exist");
        return bondMetadata[bondAddress_];
    }
}
