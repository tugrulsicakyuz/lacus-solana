'use client';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useCallback, useState, useMemo } from 'react';
import {
  getLacusProgram,
  getLacusProgramReadOnly,
  getFactoryStatePDA,
  getBondStatePDA,
  getEscrowVaultPDA,
  getYieldVaultPDA,
  getPrincipalVaultPDA,
  getInvestorPositionPDA,
  getListingPDA,
} from '@/lib/lacus-program';
import type { BondState, FactoryState, Listing } from '@/types/lacus';
import { fetchChainIndex, refreshChainIndex } from '@/lib/chain-index';

// Eski/bozuk struct'tan deserialize olan hesapları ele
const isValidBond = (bond: BondState) =>
  !!bond.name && bond.name.trim().length > 0 &&
  !!bond.symbol && bond.symbol.trim().length > 0 &&
  Number(bond.faceValue) > 0 &&
  Number(bond.maxSupply) > 0 &&
  Number(bond.maturityTimestamp) > 1700000000; // Kasım 2023 sonrası

// Solana/Anchor hata mesajını insanca çıkar (wallet'ın jenerik "Unexpected error"u yerine)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeSolanaError(e: any): string {
  if (!e) return 'Unknown error';
  if (e.error?.errorMessage) {
    const code = e.error?.errorCode?.code ? `${e.error.errorCode.code}: ` : '';
    return `${code}${e.error.errorMessage}`;
  }
  const logs: string[] | undefined = e.logs || e.transactionLogs;
  if (Array.isArray(logs) && logs.length) {
    const hit = logs.find((l) => /error|failed|insufficient|custom program error/i.test(l));
    if (hit) return hit;
  }
  return e.message || String(e);
}

// İzole edilebilir akış logları. Tarayıcı konsolunda "[Lacus]" diye filtrele.
const L = (label: string, data?: unknown) => {
  if (data !== undefined) console.log(`[Lacus] ${label}`, data);
  else console.log(`[Lacus] ${label}`);
};
const LErr = (label: string, e: unknown) => console.error(`[Lacus] ✗ ${label}`, e);

// Public devnet RPC getProgramAccounts cagrilarini 429'luyor. Bu yuzden agir
// okuma cagrilarini (.all()) 429'da ustel backoff ile tekrar dene.
async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const is429 = /\b429\b|too many requests/i.test(msg);
      if (!is429 || i === tries - 1) throw e;
      const wait = 500 * Math.pow(2, i); // 500, 1000, 2000 ms
      L(`${label}: RPC 429, ${wait}ms sonra tekrar (deneme ${i + 1}/${tries})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export interface PortfolioHolding {
  bond: BondState;
  units: number;
  contribution: number;     // lamport
  yieldClaimed: number;     // lamport
  claimableYield: number;   // lamport
  redeemed: boolean;
  refunded: boolean;
}

export function useLacusProgram() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();
  const [error, setError] = useState<string | null>(null);

  const program = useMemo(() => wallet ? getLacusProgram(wallet) : null, [wallet]);

  const sendAndConfirm = useCallback(async (tx: Transaction) => {
    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet!.publicKey;

      // Tanı: göndermeden önce simüle et, gerçek program log'larını yakala
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sim = await connection.simulateTransaction(tx as any);
        if (sim?.value?.err) {
          console.error('[Lacus] simulate failed:', JSON.stringify(sim.value.err));
          console.error('[Lacus] program logs:\n' + (sim.value.logs || []).join('\n'));
        }
      } catch (simErr) {
        console.warn('[Lacus] simulate threw (devam ediliyor):', simErr);
      }

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      // Yazim sonrasi indeksi zorla tazele ki sonraki okumalar (liste) guncel olsun.
      await refreshChainIndex();
      return sig;
    } catch (e: unknown) {
      console.error('[Lacus] tx failed:', e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const any = e as any;
      if (any?.logs) console.error('[Lacus] error logs:\n' + any.logs.join('\n'));
      if (typeof any?.getLogs === 'function') {
        try { console.error('[Lacus] getLogs():', await any.getLogs(connection)); } catch { /* yoksay */ }
      }
      throw new Error(describeSolanaError(any));
    }
  }, [connection, sendTransaction, wallet]);

  const fetchAllBonds = useCallback(async () => {
    // İndeks-öncelikli: client getProgramAccounts yapmaz (429 yok). Hata → RPC fallback.
    try {
      const snap = await fetchChainIndex();
      L(`fetchAllBonds: index ${snap.bonds.length} bond (source ${snap.source})`);
      return snap.bonds.filter(isValidBond);
    } catch (idxErr) {
      L('fetchAllBonds: index basarisiz, RPC fallback', idxErr);
    }
    const readProgram = program ?? getLacusProgramReadOnly();
    try {
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bonds = await withRetry<any[]>(() => (readProgram.account as any).bondState.all(), 'fetchAllBonds');
      return bonds
        .map((b: { account: BondState }) => b.account)
        .filter(isValidBond);
    } catch (e) {
      console.error('fetchAllBonds error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to fetch bonds: ${msg}`);
      throw new Error(`Failed to fetch bonds: ${msg}`);
    }
  }, [program]);

  const fetchMyBonds = useCallback(async () => {
    if (!program || !wallet) { setError('Wallet not connected'); return []; }
    // İndeks-öncelikli.
    try {
      const snap = await fetchChainIndex();
      return snap.bonds.filter(
        (bond) => isValidBond(bond) && bond.issuer.toString() === wallet.publicKey.toString()
      );
    } catch (idxErr) {
      L('fetchMyBonds: index basarisiz, RPC fallback', idxErr);
    }
    try {
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allBonds = await withRetry<any[]>(() => (program.account as any).bondState.all(), 'fetchMyBonds');
      return allBonds
        .map((b: { account: BondState }) => b.account)
        .filter((bond: BondState) =>
          isValidBond(bond) && bond.issuer.toString() === wallet.publicKey.toString()
        );
    } catch (e) {
      console.error('fetchMyBonds error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to fetch your bonds: ${msg}`);
      throw new Error(`Failed to fetch your bonds: ${msg}`);
    }
  }, [program, wallet]);

  // Portföy artık token bakiyesinden değil, InvestorPosition kayıtlarından gelir.
  const fetchPortfolioBonds = useCallback(async (): Promise<PortfolioHolding[]> => {
    if (!program || !wallet) { setError('Wallet not connected'); return []; }

    // İndeks-öncelikli: pozisyonlari snapshot'tan filtrele, bond'la birlestir.
    try {
      const snap = await fetchChainIndex();
      const byState = new Map<string, BondState>();
      for (const b of snap.bonds) {
        const [pda] = getBondStatePDA(Number(b.bondId));
        byState.set(pda.toBase58(), b);
      }
      const mine = wallet.publicKey.toBase58();
      const holdings: PortfolioHolding[] = [];
      for (const { account: pos } of snap.positions) {
        if (pos.investor.toString() !== mine) continue;
        const units = Number(pos.units);
        if (units <= 0) continue;
        const bond = byState.get(pos.bondState.toString());
        if (!bond || !isValidBond(bond)) continue;
        const tokensSold = Number(bond.tokensSold);
        const entitled = tokensSold > 0 ? Math.floor((Number(bond.totalYieldDeposited) * units) / tokensSold) : 0;
        const yieldClaimed = Number(pos.yieldClaimed);
        holdings.push({
          bond, units, contribution: Number(pos.contribution), yieldClaimed,
          claimableYield: Math.max(0, entitled - yieldClaimed),
          redeemed: !!pos.redeemed, refunded: !!pos.refunded,
        });
      }
      L(`fetchPortfolioBonds: index ${holdings.length} holding(s)`);
      return holdings;
    } catch (idxErr) {
      L('fetchPortfolioBonds: index basarisiz, RPC fallback', idxErr);
    }

    try {
      setError(null);
      // Bu cüzdana ait tüm pozisyonlar (offset 8 = discriminator sonrası investor: Pubkey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const positions = await withRetry<any[]>(() => (program.account as any).investorPosition.all([
        { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } },
      ]), 'fetchPortfolioBonds');

      const holdings: PortfolioHolding[] = [];
      for (const p of positions) {
        const pos = p.account;
        const units = Number(pos.units);
        if (units <= 0) continue; // refund edilmiş / boş pozisyon
        let bond: BondState;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          bond = (await (program.account as any).bondState.fetch(pos.bondState)) as BondState;
        } catch { continue; }
        if (!isValidBond(bond)) continue;

        const tokensSold = Number(bond.tokensSold);
        const entitled = tokensSold > 0
          ? Math.floor((Number(bond.totalYieldDeposited) * units) / tokensSold)
          : 0;
        const yieldClaimed = Number(pos.yieldClaimed);
        const claimableYield = Math.max(0, entitled - yieldClaimed);

        holdings.push({
          bond,
          units,
          contribution: Number(pos.contribution),
          yieldClaimed,
          claimableYield,
          redeemed: !!pos.redeemed,
          refunded: !!pos.refunded,
        });
      }
      L(`fetchPortfolioBonds: ${holdings.length} holding(s)`,
        holdings.map((h) => ({ symbol: h.bond.symbol, bondId: Number(h.bond.bondId), units: h.units, funded: h.bond.funded, matured: Number(h.bond.maturityTimestamp) <= Math.floor(Date.now() / 1000) })));
      return holdings;
    } catch (e) {
      console.error('fetchPortfolioBonds error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to fetch portfolio: ${msg}`);
      throw new Error(`Failed to fetch portfolio: ${msg}`);
    }
  }, [program, wallet]);

  const fetchBond = useCallback(async (bondId: number) => {
    if (!program) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await (program.account as any).bondState.fetch(bondStatePDA)) as BondState;
    } catch (e) {
      console.error('fetchBond error:', e);
      throw new Error(`Failed to fetch bond ${bondId}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [program]);

  // ── Issuer: ihraç ──────────────────────────────────────────────────────────
  const issueBond = useCallback(async (params: {
    name: string;
    symbol: string;
    faceValue: number;          // lamport
    couponRateBps: number;
    saleDeadline: number;       // unix saniye
    maturityTimestamp: number;  // unix saniye
    fundingGoal: number;        // lamport
    maxSupply: number;
    loanAgreementHash: Uint8Array;
  }) => {
    if (!program || !wallet) throw new Error('Wallet not connected');

    if (!params.name?.trim()) throw new Error('Bond name is required');
    if (!params.symbol?.trim()) throw new Error('Bond symbol is required');
    if (params.faceValue <= 0) throw new Error('Face value must be greater than 0');
    if (params.maxSupply <= 0) throw new Error('Supply must be greater than 0');
    if (params.fundingGoal <= 0) throw new Error('Funding goal must be greater than 0');
    if (params.fundingGoal > params.faceValue * params.maxSupply) {
      throw new Error('Funding goal cannot exceed max raise (face value × supply)');
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (params.saleDeadline <= nowSec) throw new Error('Subscription close date must be in the future');
    if (params.maturityTimestamp <= params.saleDeadline) throw new Error('Maturity must be after the subscription close date');

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

    console.info('[Lacus] issueBond →', {
      programId: program.programId.toBase58(),
      bondId,
      faceValue: params.faceValue,
      maxSupply: params.maxSupply,
      fundingGoal: params.fundingGoal,
      saleDeadline: params.saleDeadline,
      maturityTimestamp: params.maturityTimestamp,
    });

    const tx = await program.methods
      .issueBond({
        name: params.name,
        symbol: params.symbol,
        faceValue: new BN(params.faceValue),
        couponRateBps: params.couponRateBps,
        saleDeadline: new BN(params.saleDeadline),
        maturityTimestamp: new BN(params.maturityTimestamp),
        fundingGoal: new BN(params.fundingGoal),
        maxSupply: new BN(params.maxSupply),
        loanAgreementHash: Array.from(params.loanAgreementHash),
      })
      .accounts({
        issuer: wallet.publicKey,
        factoryState: factoryStatePDA,
        bondState: bondStatePDA,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const sig = await sendAndConfirm(tx);
    return { tx: sig, bondId };
  }, [program, wallet, sendAndConfirm]);

  // ── Lender: satın alma → escrow ─────────────────────────────────────────────
  const buyBond = useCallback(async (bondId: number, units: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [escrowVault] = getEscrowVaultPDA(bondId);
    const [investorPosition] = getInvestorPositionPDA(bondStatePDA, wallet.publicKey);
    L('buyBond →', { bondId, units, buyer: wallet.publicKey.toBase58(), positionPDA: investorPosition.toBase58() });

    try {
      const tx = await program.methods
        .buyBond(new BN(units))
        .accounts({
          bondState: bondStatePDA,
          escrowVault,
          buyer: wallet.publicKey,
          investorPosition,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      const sig = await sendAndConfirm(tx);
      L('buyBond ✓ confirmed', sig);
      return sig;
    } catch (e) {
      LErr('buyBond failed', e);
      throw e;
    }
  }, [program, wallet, sendAndConfirm]);

  // ── Issuer: funding başarılıysa escrow'u çek (issuer + %1 fee) ───────────────
  const withdrawEscrow = useCallback(async (bondId: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [factoryStatePDA] = getFactoryStatePDA();
    const [escrowVault] = getEscrowVaultPDA(bondId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const factoryState = (await (program.account as any).factoryState.fetch(factoryStatePDA)) as FactoryState;
    L('withdrawEscrow →', { bondId, issuer: wallet.publicKey.toBase58() });

    try {
      const tx = await program.methods
        .withdrawEscrow()
        .accounts({
          bondState: bondStatePDA,
          factoryState: factoryStatePDA,
          escrowVault,
          issuer: wallet.publicKey,
          feeRecipient: new PublicKey(factoryState.authority),
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      const sig = await sendAndConfirm(tx);
      L('withdrawEscrow ✓ confirmed', sig);
      return sig;
    } catch (e) {
      LErr('withdrawEscrow failed', e);
      throw e;
    }
  }, [program, wallet, sendAndConfirm]);

  // ── Lender: funding başarısız/abandoned → katkı iadesi ──────────────────────
  const refund = useCallback(async (bondId: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [escrowVault] = getEscrowVaultPDA(bondId);
    const [investorPosition] = getInvestorPositionPDA(bondStatePDA, wallet.publicKey);

    const tx = await program.methods
      .refund()
      .accounts({
        bondState: bondStatePDA,
        escrowVault,
        investor: wallet.publicKey,
        investorPosition,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return sendAndConfirm(tx);
  }, [program, wallet, sendAndConfirm]);

  // ── Issuer: kupon yatır → yield vault ───────────────────────────────────────
  const depositYield = useCallback(async (bondId: number, amountLamports: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [yieldVault] = getYieldVaultPDA(bondId);
    L('depositYield →', { bondId, amountLamports, sol: amountLamports / 1e9 });

    try {
      const tx = await program.methods
        .depositYield(new BN(amountLamports))
        .accounts({
          bondState: bondStatePDA,
          yieldVault,
          issuer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      const sig = await sendAndConfirm(tx);
      L('depositYield ✓ confirmed', sig);
      return sig;
    } catch (e) {
      LErr('depositYield failed', e);
      throw e;
    }
  }, [program, wallet, sendAndConfirm]);

  // ── Issuer: anapara yatır → principal vault ─────────────────────────────────
  const depositPrincipal = useCallback(async (bondId: number, amountLamports: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [principalVault] = getPrincipalVaultPDA(bondId);

    const tx = await program.methods
      .depositPrincipal(new BN(amountLamports))
      .accounts({
        bondState: bondStatePDA,
        principalVault,
        issuer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return sendAndConfirm(tx);
  }, [program, wallet, sendAndConfirm]);

  // ── Lender: kupon talebi ────────────────────────────────────────────────────
  const claimYield = useCallback(async (bondId: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [yieldVault] = getYieldVaultPDA(bondId);
    const [investorPosition] = getInvestorPositionPDA(bondStatePDA, wallet.publicKey);

    const tx = await program.methods
      .claimYield()
      .accounts({
        bondState: bondStatePDA,
        yieldVault,
        investor: wallet.publicKey,
        investorPosition,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return sendAndConfirm(tx);
  }, [program, wallet, sendAndConfirm]);

  // ── Lender: vade sonrası anapara itfası ─────────────────────────────────────
  const redeemBond = useCallback(async (bondId: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [principalVault] = getPrincipalVaultPDA(bondId);
    const [investorPosition] = getInvestorPositionPDA(bondStatePDA, wallet.publicKey);

    const tx = await program.methods
      .redeemBond()
      .accounts({
        bondState: bondStatePDA,
        principalVault,
        investor: wallet.publicKey,
        investorPosition,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return sendAndConfirm(tx);
  }, [program, wallet, sendAndConfirm]);

  // ── Secondary: ilan oluştur (birimleri Listing'e kilitle) ───────────────────
  const listUnits = useCallback(async (bondId: number, units: number, pricePerUnitLamports: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [yieldVault] = getYieldVaultPDA(bondId);
    const [investorPosition] = getInvestorPositionPDA(bondStatePDA, wallet.publicKey);
    const [listing] = getListingPDA(bondStatePDA, wallet.publicKey);
    L('listUnits →', { bondId, units, pricePerUnitLamports, seller: wallet.publicKey.toBase58(), bondStatePDA: bondStatePDA.toBase58(), listingPDA: listing.toBase58() });

    try {
      const tx = await program.methods
        .listUnits(new BN(units), new BN(pricePerUnitLamports))
        .accounts({
          bondState: bondStatePDA,
          yieldVault,
          seller: wallet.publicKey,
          investorPosition,
          listing,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      const sig = await sendAndConfirm(tx);
      L('listUnits ✓ confirmed', sig);
      return sig;
    } catch (e) {
      LErr('listUnits failed', e);
      throw e;
    }
  }, [program, wallet, sendAndConfirm]);

  // ── Secondary: ilanı iptal et (birimler pozisyona geri döner) ───────────────
  const cancelListing = useCallback(async (bondId: number) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [investorPosition] = getInvestorPositionPDA(bondStatePDA, wallet.publicKey);
    const [listing] = getListingPDA(bondStatePDA, wallet.publicKey);
    L('cancelListing →', { bondId, listingPDA: listing.toBase58() });

    try {
      const tx = await program.methods
        .cancelListing()
        .accounts({
          bondState: bondStatePDA,
          investorPosition,
          listing,
          seller: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      const sig = await sendAndConfirm(tx);
      L('cancelListing ✓ confirmed', sig);
      return sig;
    } catch (e) {
      LErr('cancelListing failed', e);
      throw e;
    }
  }, [program, wallet, sendAndConfirm]);

  // ── Secondary: bir ilanı satın al (atomik SOL ↔ birim) ──────────────────────
  const buyListing = useCallback(async (bondId: number, seller: PublicKey) => {
    if (!program || !wallet) throw new Error('Wallet not connected');
    const [bondStatePDA] = getBondStatePDA(bondId);
    const [factoryStatePDA] = getFactoryStatePDA();
    const [listing] = getListingPDA(bondStatePDA, seller);
    const [buyerPosition] = getInvestorPositionPDA(bondStatePDA, wallet.publicKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const factoryState = (await (program.account as any).factoryState.fetch(factoryStatePDA)) as FactoryState;
    L('buyListing →', { bondId, seller: seller.toBase58(), buyer: wallet.publicKey.toBase58(), listingPDA: listing.toBase58(), feeRecipient: factoryState.authority.toString() });

    try {
      const tx = await program.methods
        .buyListing()
        .accounts({
          bondState: bondStatePDA,
          factoryState: factoryStatePDA,
          listing,
          seller,
          buyer: wallet.publicKey,
          buyerPosition,
          feeRecipient: new PublicKey(factoryState.authority),
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      const sig = await sendAndConfirm(tx);
      L('buyListing ✓ confirmed', sig);
      return sig;
    } catch (e) {
      LErr('buyListing failed', e);
      throw e;
    }
  }, [program, wallet, sendAndConfirm]);

  // ── Secondary: tüm aktif ilanları çek ───────────────────────────────────────
  const fetchListings = useCallback(async (): Promise<{ pubkey: PublicKey; account: Listing }[]> => {
    // İndeks-öncelikli.
    try {
      const snap = await fetchChainIndex();
      const filtered = snap.listings.filter((l) => l.account.active && Number(l.account.units) > 0);
      L(`fetchListings: index ${snap.listings.length} raw, ${filtered.length} active (source ${snap.source})`);
      return filtered;
    } catch (idxErr) {
      L('fetchListings: index basarisiz, RPC fallback', idxErr);
    }
    const readProgram = program ?? getLacusProgramReadOnly();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = await withRetry<any[]>(() => (readProgram.account as any).listing.all(), 'fetchListings');
      L(`fetchListings: ${all.length} raw listing account(s)`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.map((l: any) => ({ pubkey: l.publicKey.toBase58(), seller: l.account.seller.toString(), bondState: l.account.bondState.toString(), units: Number(l.account.units), price: Number(l.account.pricePerUnit), active: l.account.active })));
      const filtered = all
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((l: any) => ({ pubkey: l.publicKey as PublicKey, account: l.account as Listing }))
        .filter((l: { account: Listing }) => l.account.active && Number(l.account.units) > 0);
      L(`fetchListings: ${filtered.length} active listing(s) after filter`);
      return filtered;
    } catch (e) {
      LErr('fetchListings failed', e);
      return [];
    }
  }, [program]);

  return {
    program,
    fetchAllBonds,
    fetchMyBonds,
    fetchPortfolioBonds,
    fetchBond,
    issueBond,
    buyBond,
    withdrawEscrow,
    refund,
    depositYield,
    depositPrincipal,
    claimYield,
    redeemBond,
    listUnits,
    cancelListing,
    buyListing,
    fetchListings,
    error,
  };
}
