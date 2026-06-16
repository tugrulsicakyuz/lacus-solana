'use client';
import { Program, AnchorProvider, web3, BN, setProvider } from '@coral-xyz/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { LACUS_PROGRAM_ID, SOLANA_RPC } from '@/config/solana';
import IDL from './lacus-idl.json';

export function getLacusProgram(wallet: AnchorWallet) {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  setProvider(provider);
  return new Program(IDL as any, provider);
}

export function getLacusProgramReadOnly() {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const dummyWallet = {
    publicKey: web3.Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new AnchorProvider(connection, dummyWallet as AnchorWallet, { commitment: 'confirmed' });
  return new Program(IDL as any, provider);
}

function bondIdSeed(bondId: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(bondId));
  return buf;
}

export function getFactoryStatePDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('factory')],
    LACUS_PROGRAM_ID
  );
}

export function getBondStatePDA(bondId: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bond'), bondIdSeed(bondId)],
    LACUS_PROGRAM_ID
  );
}

/** Escrow vault — lender katkıları (funding sırasında) burada tutulur. */
export function getEscrowVaultPDA(bondId: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), bondIdSeed(bondId)],
    LACUS_PROGRAM_ID
  );
}

/** Yield vault — issuer'ın yatırdığı kuponlar. */
export function getYieldVaultPDA(bondId: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('yield'), bondIdSeed(bondId)],
    LACUS_PROGRAM_ID
  );
}

/** Principal vault — issuer'ın yatırdığı itfa anaparası. */
export function getPrincipalVaultPDA(bondId: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('principal'), bondIdSeed(bondId)],
    LACUS_PROGRAM_ID
  );
}

export function getInvestorPositionPDA(bondStatePubkey: PublicKey, investorPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('position'), bondStatePubkey.toBuffer(), investorPubkey.toBuffer()],
    LACUS_PROGRAM_ID
  );
}

/** Listing — ikincil piyasada satıcı başına tek aktif ilan. */
export function getListingPDA(bondStatePubkey: PublicKey, sellerPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('listing'), bondStatePubkey.toBuffer(), sellerPubkey.toBuffer()],
    LACUS_PROGRAM_ID
  );
}
