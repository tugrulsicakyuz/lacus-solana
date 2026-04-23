import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * TypeScript interfaces for Lacus Anchor program accounts
 * Generated from programs/lacus/src/lib.rs account structures
 */

/**
 * Factory state account - tracks global bond count and authority
 */
export interface FactoryState {
  authority: PublicKey;
  bondCount: BN;
  bump: number;
}

/**
 * Bond state account - contains all bond parameters and state
 */
export interface BondState {
  bondId: BN;
  issuer: PublicKey;
  name: string;
  symbol: string;
  faceValue: BN;
  couponRateBps: number;
  maturityTimestamp: BN;
  maxSupply: BN;
  tokensSold: BN;
  totalYieldDeposited: BN;
  totalPrincipalDeposited: BN;
  isMatured: boolean;
  principalDeposited: boolean;
  loanAgreementHash: number[]; // [u8; 32]
  bondMint: PublicKey;
  usdcVault: PublicKey;
  bondTokenVault: PublicKey;
  bump: number;
}

/**
 * Investor position account - tracks yield snapshots per investor per bond
 */
export interface InvestorPosition {
  investor: PublicKey;
  bondState: PublicKey;
  lastYieldSnapshot: BN;
  bump: number;
}

/**
 * Parameters for issuing a new bond
 */
export interface IssueBondParams {
  name: string;
  symbol: string;
  faceValue: BN;
  couponRateBps: number;
  maturityTimestamp: BN;
  maxSupply: BN;
  loanAgreementHash: number[]; // [u8; 32]
}

/**
 * On-chain bond data with computed fields for UI
 */
export interface OnChainBond {
  bondId: number;
  issuer: string;
  symbol: string;
  name: string;
  faceValue: number;
  couponRateBps: number;
  maturityTimestamp: number;
  maxSupply: number;
  tokensSold: number;
  totalYieldDeposited: number;
  totalPrincipalDeposited: number;
  isMatured: boolean;
  principalDeposited: boolean;
  bondMint: string;
  usdcVault: string;
  bondTokenVault: string;
}

/**
 * Combined bond data (on-chain + Supabase metadata)
 */
export interface CombinedBond extends OnChainBond {
  symbol: string;
  issuerName: string;
  description?: string;
  logoUrl?: string;
  apy?: number;
  maturityMonths?: number;
}
