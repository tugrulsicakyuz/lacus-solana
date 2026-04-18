// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BondToken
 * @notice ERC20 token representing a tokenized bond with yield distribution and maturity
 * @dev Each bond is backed by a signed Loan Agreement — its SHA-256 hash is stored on-chain
 */
contract BondToken is ERC20, ReentrancyGuard, Ownable {
    IERC20 public immutable paymentToken;

    uint256 public immutable maturityDate;
    uint256 public immutable totalSupplyCap;
    address public immutable issuer;

    // SHA-256 hash of the signed Loan Agreement — set once at deployment, immutable thereafter
    bytes32 public loanAgreementHash;

    uint256 public totalYieldDeposited;
    uint256 public totalPrincipalDeposited;

    bool public isMatured;
    bool public principalDeposited;

    struct YieldCheckpoint {
        uint256 totalYield;
        uint256 totalSupplySnapshot;
        uint256 timestamp;
    }

    YieldCheckpoint[] public yieldCheckpoints;
    mapping(address => uint256) public lastClaimedCheckpoint;

    // Events
    event YieldDeposited(uint256 amount, uint256 checkpointIndex, uint256 timestamp);
    event YieldClaimed(address indexed holder, uint256 amount);
    event PrincipalDeposited(uint256 amount, uint256 timestamp);
    event PrincipalClaimed(address indexed holder, uint256 bondsBurned, uint256 principalAmount);
    event BondMinted(address indexed to, uint256 amount);
    event LoanAgreementSet(bytes32 indexed hash, uint256 timestamp);
    
    constructor(
        string memory name_,
        string memory symbol_,
        address paymentToken_,
        address issuer_,
        uint256 maturityDate_,
        uint256 totalSupplyCap_,
        bytes32 loanAgreementHash_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(paymentToken_ != address(0), "Invalid payment token");
        require(issuer_ != address(0), "Invalid issuer");
        require(maturityDate_ > block.timestamp, "Maturity must be in future");
        require(totalSupplyCap_ > 0, "Supply cap must be positive");
        require(loanAgreementHash_ != bytes32(0), "Loan agreement must be signed before deployment");

        paymentToken = IERC20(paymentToken_);
        issuer = issuer_;
        maturityDate = maturityDate_;
        totalSupplyCap = totalSupplyCap_;
        loanAgreementHash = loanAgreementHash_;

        emit LoanAgreementSet(loanAgreementHash_, block.timestamp);
    }

    /**
     * @notice Update the Loan Agreement hash (only callable by owner/issuer)
     * @param hash_ SHA-256 hash of the signed Loan Agreement
     */
    function setLoanAgreementHash(bytes32 hash_) external onlyOwner {
        require(hash_ != bytes32(0), "Hash cannot be zero");
        require(loanAgreementHash == bytes32(0), "Loan Agreement hash already set and cannot be changed");
        loanAgreementHash = hash_;
        emit LoanAgreementSet(hash_, block.timestamp);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= totalSupplyCap, "Exceeds supply cap");
        require(!isMatured, "Bond has matured");
        _mint(to, amount);
        emit BondMinted(to, amount);
    }
    
    /**
     * @notice Deposit yield for bondholders (anyone can contribute to the yield pool)
     * @param amount Amount of USDC to deposit as yield
     */
    function depositYield(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(totalSupply() > 0, "No bonds issued yet");
        
        // Transfer payment token from issuer
        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        // Create new yield checkpoint
        yieldCheckpoints.push(YieldCheckpoint({
            totalYield: amount,
            totalSupplySnapshot: totalSupply(),
            timestamp: block.timestamp
        }));
        
        totalYieldDeposited += amount;
        
        emit YieldDeposited(amount, yieldCheckpoints.length - 1, block.timestamp);
    }
    
    /**
     * @notice Calculate unclaimed yield for a holder
     * @param holder Address of the bondholder
     * @return Total unclaimed yield amount
     */
    function getUnclaimedYield(address holder) public view returns (uint256) {
        uint256 unclaimedYield = 0;
        uint256 holderBalance = balanceOf(holder);
        
        if (holderBalance == 0) return 0;
        
        uint256 startCheckpoint = lastClaimedCheckpoint[holder];
        
        for (uint256 i = startCheckpoint; i < yieldCheckpoints.length; i++) {
            YieldCheckpoint memory checkpoint = yieldCheckpoints[i];
            // Proportional yield based on balance at checkpoint time
            unclaimedYield += (checkpoint.totalYield * holderBalance) / checkpoint.totalSupplySnapshot;
        }
        
        return unclaimedYield;
    }
    
    /**
     * @notice Claim accumulated yield (pull pattern)
     */
    function claimYield() external nonReentrant {
        uint256 claimableYield = getUnclaimedYield(msg.sender);
        require(claimableYield > 0, "No yield to claim");
        
        // Update last claimed checkpoint
        lastClaimedCheckpoint[msg.sender] = yieldCheckpoints.length;
        
        // Transfer yield to holder
        require(
            paymentToken.transfer(msg.sender, claimableYield),
            "Yield transfer failed"
        );
        
        emit YieldClaimed(msg.sender, claimableYield);
    }
    
    /**
     * @notice Mark bond as matured (automatic after maturity date)
     */
    function checkMaturity() public {
        if (!isMatured && block.timestamp >= maturityDate) {
            isMatured = true;
        }
    }
    
    /**
     * @notice Deposit principal for maturity redemption (only callable by issuer)
     * @param amount Total principal amount in USDC
     */
    function depositPrincipal(uint256 amount) external onlyOwner nonReentrant {
        checkMaturity();
        require(isMatured, "Bond not yet matured");
        require(!principalDeposited, "Principal already deposited");
        require(amount > 0, "Amount must be positive");
        
        // Transfer principal from issuer
        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        totalPrincipalDeposited = amount;
        principalDeposited = true;
        
        emit PrincipalDeposited(amount, block.timestamp);
    }
    
    /**
     * @notice Claim principal at maturity and burn bond tokens
     */
    function claimPrincipal() external nonReentrant {
        checkMaturity();
        require(isMatured, "Bond not yet matured");
        require(principalDeposited, "Principal not deposited by issuer");
        
        uint256 holderBalance = balanceOf(msg.sender);
        require(holderBalance > 0, "No bonds to redeem");
        
        // Calculate proportional principal
        uint256 principalAmount = (totalPrincipalDeposited * holderBalance) / totalSupply();
        
        // Burn bond tokens
        _burn(msg.sender, holderBalance);
        
        // Transfer principal to holder
        require(
            paymentToken.transfer(msg.sender, principalAmount),
            "Principal transfer failed"
        );
        
        emit PrincipalClaimed(msg.sender, holderBalance, principalAmount);
    }
    
    function getBondInfo() external view returns (
        uint256 _maturityDate,
        uint256 _totalSupply,
        uint256 _totalSupplyCap,
        uint256 _totalYieldDeposited,
        uint256 _totalPrincipalDeposited,
        bool _isMatured,
        bool _principalDeposited,
        uint256 _checkpointCount,
        bytes32 _loanAgreementHash
    ) {
        return (
            maturityDate,
            totalSupply(),
            totalSupplyCap,
            totalYieldDeposited,
            totalPrincipalDeposited,
            isMatured || block.timestamp >= maturityDate,
            principalDeposited,
            yieldCheckpoints.length,
            loanAgreementHash
        );
    }
}
