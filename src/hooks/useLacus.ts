'use client';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { useCallback } from 'react';
import { getLacusProgram, getFactoryStatePDA, getBondStatePDA, getBondMintPDA } from '@/lib/lacus-program';
import { USDC_DEVNET_MINT } from '@/config/solana';
import type { BondState, FactoryState } from '@/types/lacus';

export function useLacusProgram() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const program = wallet ? getLacusProgram(wallet) : null;

  const fetchAllBonds = useCallback(async () => {
    if (!program) return [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bonds = await (program.account as any).bondState.all();
      return bonds.map((b: { account: BondState }) => b.account);
    } catch (e) {
      console.error('fetchAllBonds error:', e);
      return [];
    }
  }, [program]);

  const fetchBond = useCallback(async (bondId: number) => {
    if (!program) return null;
    const [bondStatePDA] = getBondStatePDA(bondId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await (program.account as any).bondState.fetch(bondStatePDA)) as BondState;
    } catch (e) {
      return null;
    }
  }, [program]);

  const issueBond = useCallback(async (params: {
    name: string;
    symbol: string;
    faceValue: number;
    couponRateBps: number;
    maturityTimestamp: number;
    maxSupply: number;
    loanAgreementHash: Uint8Array;
  }) => {
    if (!program || !wallet) throw new Error('Wallet not connected');

    const [factoryStatePDA] = getFactoryStatePDA();
    let factoryState: FactoryState;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      factoryState = (await (program.account as any).factoryState.fetch(factoryStatePDA)) as FactoryState;
    } catch {
      throw new Error('Factory not initialized');
    }

    const bondId = factoryState.bondCount.toNumber();
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [bondMintPDA] = getBondMintPDA(bondStatePDA);
    const bondYieldVault = await getAssociatedTokenAddress(new PublicKey(USDC_DEVNET_MINT), bondStatePDA, true);
    const bondTokenVault = await getAssociatedTokenAddress(bondMintPDA, bondStatePDA, true);

    const hashArray = Array.from(params.loanAgreementHash);

    const tx = await program.methods
      .issueBond({
        name: params.name,
        symbol: params.symbol,
        faceValue: new BN(params.faceValue),
        couponRateBps: params.couponRateBps,
        maturityTimestamp: new BN(params.maturityTimestamp),
        maxSupply: new BN(params.maxSupply),
        loanAgreementHash: hashArray,
      })
      .accounts({
        factoryState: factoryStatePDA,
        bondState: bondStatePDA,
        bondMint: bondMintPDA,
        bondYieldVault,
        bondTokenVault,
        issuer: wallet.publicKey,
        usdcMint: new PublicKey(USDC_DEVNET_MINT),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return { tx, bondId };
  }, [program, wallet]);

  const buyBond = useCallback(async (bondId: number, amount: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');

    const [bondStatePDA] = getBondStatePDA(bondId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bondState = (await (program.account as any).bondState.fetch(bondStatePDA)) as BondState;
    const [bondMintPDA] = getBondMintPDA(bondStatePDA);

    const buyerBondAta = await getAssociatedTokenAddress(bondMintPDA, wallet.publicKey);
    const buyerUsdcAta = await getAssociatedTokenAddress(new PublicKey(USDC_DEVNET_MINT), wallet.publicKey);
    const issuerUsdcAta = await getAssociatedTokenAddress(new PublicKey(USDC_DEVNET_MINT), new PublicKey(bondState.issuer));

    const tx = await program.methods
      .buyBond(new BN(amount))
      .accounts({
        bondState: bondStatePDA,
        buyer: wallet.publicKey,
        buyerBondAta,
        issuerUsdcAta,
        bondTokenVault: bondState.bondTokenVault,
        bondMint: bondMintPDA,
        buyerUsdcAta,
        usdcMint: new PublicKey(USDC_DEVNET_MINT),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }, [program, wallet]);

  return { program, fetchAllBonds, fetchBond, issueBond, buyBond };
}
