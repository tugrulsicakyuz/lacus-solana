import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * TypeScript interfaces for the Lacus Anchor program accounts (v2 — escrow model).
 * Kaynak: programs/lacus/src/lib.rs. Token YOK; muhasebe InvestorPosition üzerinden.
 */

/** Factory state — global bond sayacı + platform authority (fee alıcısı). */
export interface FactoryState {
  authority: PublicKey;
  bondCount: BN;
  bump: number;
}

/** Bond state — tahvil parametreleri + escrow/funding/itfa durumu. */
export interface BondState {
  bondId: BN;
  issuer: PublicKey;
  name: string;
  symbol: string;
  faceValue: BN;
  couponRateBps: number;
  saleDeadline: BN;
  maturityTimestamp: BN;
  fundingGoal: BN;
  maxSupply: BN;
  tokensSold: BN;
  totalRaised: BN;
  totalYieldDeposited: BN;
  totalPrincipalDeposited: BN;
  funded: boolean;
  principalFunded: boolean;
  loanAgreementHash: number[]; // [u8; 32]
  bump: number;
}

/** Investor position — lender'ın sabit holding kaydı (non-transferable). */
export interface InvestorPosition {
  investor: PublicKey;
  bondState: PublicKey;
  units: BN;
  contribution: BN;
  yieldClaimed: BN;
  redeemed: boolean;
  refunded: boolean;
  bump: number;
}

/** issue_bond parametreleri. */
export interface IssueBondParams {
  name: string;
  symbol: string;
  faceValue: BN;
  couponRateBps: number;
  saleDeadline: BN;
  maturityTimestamp: BN;
  fundingGoal: BN;
  maxSupply: BN;
  loanAgreementHash: number[]; // [u8; 32]
}

/** UI için hesaplanmış (number'a indirgenmiş) bond verisi. */
export interface OnChainBond {
  bondId: number;
  issuer: string;
  symbol: string;
  name: string;
  faceValue: number;
  couponRateBps: number;
  saleDeadline: number;
  maturityTimestamp: number;
  fundingGoal: number;
  maxSupply: number;
  tokensSold: number;
  totalRaised: number;
  totalYieldDeposited: number;
  totalPrincipalDeposited: number;
  funded: boolean;
  principalFunded: boolean;
}

/** On-chain + Supabase metadata birleşik bond. */
export interface CombinedBond extends OnChainBond {
  issuerName: string;
  description?: string;
  logoUrl?: string;
  apy?: number;
  maturityMonths?: number;
}
