/**
 * Smart Contract Configuration for Sparrow Protocol
 * Deployed on Base Sepolia Testnet
 */

// Contract Addresses
export const MOCK_USDC_ADDRESS = "0x634aDd941D6844eBc205C0ddc92E2521078Bad30" as const;
export const BOND_FACTORY_ADDRESS = "0x1E18a47843A876e51b1497002e64B17ED07B8182" as const;
export const BOND_EXCHANGE_ADDRESS = "0x3E215AF6a84dF68B5E89c2347753B265c1e05e43" as const;
export const BOND_ESCROW_ADDRESS = "0x769dD7D04988154314516945F6F1C4238cf19341" as const;

// Chain Configuration
export const BASE_SEPOLIA_CHAIN_ID = 84532;

// Contract ABIs
import MockUSDCArtifact from "../../artifacts/contracts/MockUSDC.sol/MockUSDC.json";
import BondFactoryArtifact from "../../artifacts/contracts/BondFactory.sol/BondFactory.json";
import BondExchangeArtifact from "../../artifacts/contracts/BondExchange.sol/BondExchange.json";
import BondTokenArtifact from "../../artifacts/contracts/BondToken.sol/BondToken.json";
import BondEscrowArtifact from "../../artifacts/contracts/BondEscrow.sol/BondEscrow.json";

export const MOCK_USDC_ABI = MockUSDCArtifact.abi;
export const BOND_FACTORY_ABI = BondFactoryArtifact.abi;
export const BOND_EXCHANGE_ABI = BondExchangeArtifact.abi;
export const BOND_TOKEN_ABI = BondTokenArtifact.abi;
export const BOND_ESCROW_ABI = BondEscrowArtifact.abi;

// Contract Configuration Objects
export const CONTRACTS = {
  mockUSDC: {
    address: MOCK_USDC_ADDRESS,
    abi: MOCK_USDC_ABI,
  },
  bondFactory: {
    address: BOND_FACTORY_ADDRESS,
    abi: BOND_FACTORY_ABI,
  },
  bondExchange: {
    address: BOND_EXCHANGE_ADDRESS,
    abi: BOND_EXCHANGE_ABI,
  },
  bondEscrow: {
    address: BOND_ESCROW_ADDRESS,
    abi: BOND_ESCROW_ABI,
  },
} as const;

export type ContractAddresses = {
  mockUSDC: typeof MOCK_USDC_ADDRESS;
  bondFactory: typeof BOND_FACTORY_ADDRESS;
  bondExchange: typeof BOND_EXCHANGE_ADDRESS;
  bondEscrow: typeof BOND_ESCROW_ADDRESS;
};
