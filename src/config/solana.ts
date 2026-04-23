import { PublicKey } from '@solana/web3.js';

/**
 * Solana network configuration driven by environment variables
 * Defaults to devnet if not specified
 */

// Network: 'mainnet-beta', 'testnet', 'devnet', or 'localnet'
export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as string;

// RPC endpoint URL
export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Lacus program ID (deployed on Solana devnet)
export const LACUS_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_LACUS_PROGRAM_ID || 'Cw6bBLRd661pFrq5WiUjWQQXBikN6bXxCsUrwFGovSbN'
);

// USDC mint address (devnet by default, override for other networks)
export const USDC_DEVNET_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
);
