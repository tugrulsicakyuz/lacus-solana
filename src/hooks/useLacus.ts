'use client';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { useCallback, useState, useMemo } from 'react';
import { getLacusProgram, getFactoryStatePDA, getBondStatePDA, getBondMintPDA } from '@/lib/lacus-program';
import type { BondState, FactoryState } from '@/types/lacus';

export function useLacusProgram() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();
  const [error, setError] = useState<string | null>(null);

  const program = useMemo(() => wallet ? getLacusProgram(wallet) : null, [wallet]);

  const sendAndConfirm = useCallback(async (tx: Transaction) => {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet!.publicKey;
    const sig = await sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
    return sig;
  }, [connection, sendTransaction, wallet]);

  const fetchAllBonds = useCallback(async () => {
    if (!program) {
      setError('Wallet not connected');
      return [];
    }
    
    try {
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bonds = await (program.account as any).bondState.all();
      const validBonds = bonds
        .map((b: { account: BondState }) => b.account)
        .filter((bond: BondState) => {
          // Filter out bonds with garbage deserialized data from old struct
          return (
            bond.name && bond.name.trim().length > 0 &&
            bond.symbol && bond.symbol.trim().length > 0 &&
            Number(bond.faceValue) > 0 &&
            Number(bond.maxSupply) > 0 &&
            Number(bond.maturityTimestamp) > 1700000000 // after Nov 2023
          );
        });
      return validBonds;
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
        .filter((bond: BondState) => {
          // Filter out bonds with garbage deserialized data from old struct
          const isValid = (
            bond.name && bond.name.trim().length > 0 &&
            bond.symbol && bond.symbol.trim().length > 0 &&
            Number(bond.faceValue) > 0 &&
            Number(bond.maxSupply) > 0 &&
            Number(bond.maturityTimestamp) > 1700000000 // after Nov 2023
          );
          const isMine = bond.issuer.toString() === wallet.publicKey.toString();
          return isValid && isMine;
        });
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
        bondTokenVault,
        issuer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const sig = await sendAndConfirm(tx);
    return { tx: sig, bondId };
  }, [program, wallet, sendAndConfirm]);

  const buyBond = useCallback(async (bondId: number, amount: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');

    const [bondStatePDA] = getBondStatePDA(bondId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bondState = (await (program.account as any).bondState.fetch(bondStatePDA)) as BondState;
    const [bondMintPDA] = getBondMintPDA(bondStatePDA);

    const buyerBondAta = await getAssociatedTokenAddress(bondMintPDA, wallet.publicKey);

    const tx = await program.methods
      .buyBond(new BN(amount))
      .accounts({
        bondState: bondStatePDA,
        buyer: wallet.publicKey,
        buyerBondAta,
        issuer: new PublicKey(bondState.issuer),
        bondTokenVault: bondState.bondTokenVault,
        bondMint: bondMintPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const sig = await sendAndConfirm(tx);
    return sig;
  }, [program, wallet, sendAndConfirm]);

  const depositYield = useCallback(async (bondId: number, amountLamports: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');

    const [bondStatePDA] = getBondStatePDA(bondId);

    const tx = await program.methods
      .depositYield(new BN(amountLamports))
      .accounts({
        bondState: bondStatePDA,
        issuer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const sig = await sendAndConfirm(tx);
    return sig;
  }, [program, wallet, sendAndConfirm]);

  return { program, fetchAllBonds, fetchMyBonds, fetchBond, issueBond, buyBond, depositYield, error };
}
