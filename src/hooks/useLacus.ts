'use client';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { useCallback, useState, useMemo } from 'react';
import { getLacusProgram, getFactoryStatePDA, getBondStatePDA, getBondMintPDA } from '@/lib/lacus-program';
import { USDC_DEVNET_MINT } from '@/config/solana';
import type { BondState, FactoryState } from '@/types/lacus';

export function useLacusProgram() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [error, setError] = useState<string | null>(null);

  const program = useMemo(() => wallet ? getLacusProgram(wallet) : null, [wallet]);

  const fetchAllBonds = useCallback(async () => {
    if (!program) {
      setError('Wallet not connected');
      return [];
    }
    
    try {
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bonds = await (program.account as any).bondState.all();
      return bonds.map((b: { account: BondState }) => b.account);
    } catch (e) {
      console.error('fetchAllBonds error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to fetch bonds: ${errorMessage}`);
      return [];
    }
  }, [program]);

  const fetchMyBonds = useCallback(async () => {
    if (!program || !wallet) {
      setError('Wallet not connected');
      return [];
    }
    
    try {
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allBonds = await (program.account as any).bondState.all();
      const myBonds = allBonds
        .map((b: { account: BondState }) => b.account)
        .filter((bond: BondState) => bond.issuer.toString() === wallet.publicKey.toString());
      return myBonds;
    } catch (e) {
      console.error('fetchMyBonds error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to fetch your bonds: ${errorMessage}`);
      return [];
    }
  }, [program, wallet]);

  const fetchBond = useCallback(async (bondId: number) => {
    if (!program) {
      throw new Error('Wallet not connected');
    }
    
    const [bondStatePDA] = getBondStatePDA(bondId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await (program.account as any).bondState.fetch(bondStatePDA)) as BondState;
    } catch (e) {
      console.error('fetchBond error:', e);
      throw new Error(`Failed to fetch bond ${bondId}: ${e instanceof Error ? e.message : 'Unknown error'}`);
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

    // Validation: Required fields
    if (!params.name || params.name.trim() === '') {
      throw new Error('Bond name is required');
    }
    if (!params.symbol || params.symbol.trim() === '') {
      throw new Error('Bond symbol is required');
    }
    if (!params.maturityTimestamp || params.maturityTimestamp <= 0) {
      throw new Error('Maturity date is required');
    }
    if (!params.couponRateBps || params.couponRateBps <= 0) {
      throw new Error('Coupon rate must be greater than 0');
    }

    // Validation: Supply limits
    const MIN_SUPPLY = 100;
    const MAX_SUPPLY = 1_000_000;
    
    if (params.maxSupply < MIN_SUPPLY) {
      throw new Error(`Minimum supply is ${MIN_SUPPLY.toLocaleString()} tokens`);
    }
    if (params.maxSupply > MAX_SUPPLY) {
      throw new Error(`Maximum supply is ${MAX_SUPPLY.toLocaleString()} tokens`);
    }

    // Validation: Face value
    if (params.faceValue <= 0) {
      throw new Error('Face value must be greater than 0');
    }

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

    // Create instruction to initialize issuer's USDC ATA if it doesn't exist
    // This is idempotent - if account already exists, it does nothing
    const createIssuerAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, // payer
      issuerUsdcAta, // ata
      new PublicKey(bondState.issuer), // owner
      new PublicKey(USDC_DEVNET_MINT) // mint
    );

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
      .preInstructions([createIssuerAtaIx]) // Add pre-instruction to create ATA if needed
      .rpc();

    return tx;
  }, [program, wallet]);

  return { program, fetchAllBonds, fetchMyBonds, fetchBond, issueBond, buyBond, error };
}
