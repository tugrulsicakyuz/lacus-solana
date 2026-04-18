# Lacus Smart Contracts - Legacy Credit Prototype

## Architecture Overview

These contracts power the legacy Lacus prototype for on-chain bond issuance and trading. They remain in the repository as the product migrates toward a Solana-native architecture.

## Contracts

### 1. MockUSDC.sol
**Purpose:** ERC20 stablecoin for testing  
**Features:**
- 6 decimals (matching real USDC)
- Faucet function for easy testing (10,000 USDC per call)
- Owner-controlled minting

**Key Functions:**
- `faucet()` - Get test USDC
- `mint(address to, uint256 amount)` - Owner minting

---

### 2. BondToken.sol
**Purpose:** ERC20 token representing a tokenized bond with yield and maturity  
**Security Features:**
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Checkpoint mechanism prevents flash loan yield draining
- ✅ Pull-based yield claiming (not push)
- ✅ Automatic token burning on principal redemption

**Key Functions:**
- `mint(address to, uint256 amount)` - Issuer mints bond tokens (capped)
- `depositYield(uint256 amount)` - Issuer deposits USDC as yield
- `claimYield()` - Bondholders claim proportional yield (pull pattern)
- `depositPrincipal(uint256 amount)` - Issuer deposits principal at maturity
- `claimPrincipal()` - Bondholders redeem bonds and receive principal (burns tokens)
- `getUnclaimedYield(address holder)` - View unclaimed yield
- `getBondInfo()` - View complete bond state

**Yield Distribution Logic:**
- Checkpoint-based to prevent gaming via flash loans
- Proportional distribution based on balance at checkpoint time
- Users must actively claim (no automatic distributions)

**Maturity Logic:**
- Automatic maturity check via `checkMaturity()`
- Issuer deposits total principal in USDC
- Bondholders redeem proportionally and tokens are burned
- If issuer doesn't deposit, contract remains in "Waiting" state

---

### 3. BondFactory.sol
**Purpose:** Factory for deploying independent BondToken contracts  
**Security Features:**
- ✅ ReentrancyGuard on deployment
- ✅ Input validation on all parameters
- ✅ Tracks all deployed bonds with metadata

**Key Functions:**
- `createBond(...)` - Deploy new bond contract
- `getAllBonds()` - Get all deployed bond addresses
- `getBondsByIssuer(address issuer)` - Get bonds by specific issuer
- `isBond(address bondAddress)` - Verify if address is a deployed bond
- `getBondMetadata(address bondAddress)` - Get bond metadata

**Design Pattern:**
- Factory creates independent contracts (not proxies)
- Each bond is a standalone ERC20 with isolated state
- Factory maintains registry for discovery

---

### 4. BondExchange.sol
**Purpose:** On-chain limit order book exchange for bond trading  
**Security Features:**
- ✅ ReentrancyGuard on all trading functions
- ✅ Asset locking mechanism (no double-spending)
- ✅ Atomic order matching with price improvement
- ✅ FIFO (First In First Out) order execution

**Key Functions:**
- `placeBidOrder(address bondToken, uint256 price, uint256 amount)` - Place buy order
- `placeAskOrder(address bondToken, uint256 price, uint256 amount)` - Place sell order
- `cancelOrder(address bondToken, uint256 orderId)` - Cancel unfilled/partial order
- `getOrderBook(address bondToken)` - View all bids and asks
- `getBestBid(address bondToken)` - Get highest bid price
- `getBestAsk(address bondToken)` - Get lowest ask price
- `getUserOrders(address trader, address bondToken)` - Get user's orders

**Trading Mechanism:**
- **Limit orders only** (no market orders to prevent frontrunning)
- **Automatic matching** when prices cross
- **Price improvement**: Buyer pays ask price if bid > ask
- **Locked balances**: Assets locked when order placed, unlocked on cancel
- **Partial fills**: Orders can be partially filled over multiple matches

**Price Format:**
- Prices scaled by 1e18 for precision
- Example: 102.50 USDC = 102500000000000000000

---

## Security Audit Checklist

### ✅ Implemented Protections:
1. **Reentrancy Guards** - All state-changing functions protected
2. **Integer Overflow** - Using Solidity ^0.8.20 (automatic checks)
3. **Access Control** - Owner-only functions for issuer actions
4. **Flash Loan Protection** - Yield checkpoint mechanism
5. **Asset Locking** - Prevents double-spending in exchange
6. **Pull Pattern** - Yield claiming uses pull over push
7. **Input Validation** - All parameters validated
8. **Immutable Variables** - Core addresses marked immutable
9. **Safe ERC20** - Using OpenZeppelin's battle-tested implementation

### ⚠️ Notes for Production:
- Add Pausable pattern for emergency stops
- Consider time-weighted average price (TWAP) oracles for pricing
- Implement governance for protocol upgrades
- Add circuit breakers for extreme volatility
- Consider integration with Chainlink for off-chain data

---

## Gas Optimizations

### Implemented:
- `immutable` for addresses that never change
- Packed structs where possible
- View functions for off-chain data queries
- Batch operations potential (not yet implemented)

### Future Optimizations:
- Order book pruning (remove filled/cancelled orders periodically)
- Bitmap indexing for order status
- ERC20 permit for gasless approvals

---

## Deployment Flow

1. **Deploy MockUSDC** (for testing) or use real USDC address
2. **Deploy BondFactory** with USDC address
3. **Deploy BondExchange** with USDC address
4. **Create Bonds** via BondFactory.createBond()
5. **Mint Bonds** to investors via BondToken.mint()
6. **Trade Bonds** on BondExchange
7. **Distribute Yield** via BondToken.depositYield()
8. **Investors Claim** via BondToken.claimYield()
9. **At Maturity** issuer calls depositPrincipal()
10. **Investors Redeem** via claimPrincipal() (burns tokens)

---

## Business Rules Compliance

✅ **Factory Architecture**: BondFactory deploys independent BondToken contracts  
✅ **Base Currency**: All operations use USDC (MockUSDC for testing)  
✅ **Order Book Exchange**: BondExchange implements limit orders, no AMM  
✅ **Yield Distribution**: Pull pattern with checkpoint anti-gaming  
✅ **Maturity & Burn**: Principal redemption burns bond tokens  
✅ **Transferability**: Standard ERC20, fully permissionless  
✅ **Default State**: Contract waits indefinitely if principal not deposited  

---

## Testing Checklist

### BondToken Tests:
- [ ] Mint tokens up to cap
- [ ] Deposit yield creates checkpoint
- [ ] Claim yield distributes proportionally
- [ ] Flash loan attack fails (checkpoint protection)
- [ ] Maturity triggers after date
- [ ] Principal deposit works
- [ ] Principal claim burns tokens
- [ ] Transfer preserves unclaimed yield rights

### BondFactory Tests:
- [ ] Deploy bond with valid parameters
- [ ] Reject invalid parameters
- [ ] Track all deployed bonds
- [ ] Filter bonds by issuer
- [ ] Metadata stored correctly

### BondExchange Tests:
- [ ] Place bid locks USDC
- [ ] Place ask locks bond tokens
- [ ] Crossing orders match automatically
- [ ] Partial fills work correctly
- [ ] Cancel order refunds assets
- [ ] FIFO execution maintained
- [ ] Price improvement on bid > ask
- [ ] Order book queries accurate

---

## OpenZeppelin Dependencies

```json
{
  "@openzeppelin/contracts": "^5.0.0"
}
```

**Required Imports:**
- `ERC20.sol` - Token standard
- `Ownable.sol` - Access control
- `ReentrancyGuard.sol` - Reentrancy protection
- `IERC20.sol` - Interface for token interactions

---

## License

MIT License - See contract headers for details

---

## Version

**Solidity Version:** ^0.8.20  
**Contract Version:** 1.0.0  
**Status:** ⚠️ NOT AUDITED - For development/testing only
