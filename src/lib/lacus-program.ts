'use client';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { LACUS_PROGRAM_ID, SOLANA_RPC } from '@/config/solana';
import IDL from './lacus-idl.json';

export function getLacusProgram(wallet: AnchorWallet) {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  return new Program(IDL as any, provider);
}

export function getFactoryStatePDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('factory')],
    LACUS_PROGRAM_ID
  );
}

export function getBondStatePDA(bondId: number) {
  const bondIdBuffer = Buffer.alloc(8);
  bondIdBuffer.writeBigUInt64LE(BigInt(bondId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bond'), bondIdBuffer],
    LACUS_PROGRAM_ID
  );
}

export function getBondMintPDA(bondStatePubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('mint'), bondStatePubkey.toBuffer()],
    LACUS_PROGRAM_ID
  );
}

export function getInvestorPositionPDA(bondStatePubkey: PublicKey, investorPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('position'), bondStatePubkey.toBuffer(), investorPubkey.toBuffer()],
    LACUS_PROGRAM_ID
  );
}
