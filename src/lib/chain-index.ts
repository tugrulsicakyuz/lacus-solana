'use client';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import type { BondState, Listing, InvestorPosition } from '@/types/lacus';

// Sunucu indeksinden (/api/chain-index) okunan snapshot'i, on-chain okumayla AYNI
// sekillere (BN + PublicKey) rehydrate eder. Boylece useLacus cagiranlari hic
// degismeden indeksten beslenebilir; client getProgramAccounts yapmaz (429 yok).

export interface ChainSnapshot {
  source: string;
  updatedAt: string;
  bonds: BondState[];
  listings: { pubkey: PublicKey; account: Listing }[];
  positions: { pubkey: PublicKey; account: InvestorPosition }[];
}

const pk = (s: string) => new PublicKey(s);
const bn = (s: string | number) => new BN(String(s));

export async function fetchChainIndex(force = false): Promise<ChainSnapshot> {
  const res = await fetch(`/api/chain-index${force ? '?refresh=1' : ''}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`chain-index HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bonds: BondState[] = (j.bonds || []).map((b: any) => ({
    bondId: bn(b.bondId),
    issuer: pk(b.issuer),
    name: b.name,
    symbol: b.symbol,
    faceValue: bn(b.faceValue),
    couponRateBps: b.couponRateBps,
    saleDeadline: bn(b.saleDeadline),
    maturityTimestamp: bn(b.maturityTimestamp),
    fundingGoal: bn(b.fundingGoal),
    maxSupply: bn(b.maxSupply),
    tokensSold: bn(b.tokensSold),
    totalRaised: bn(b.totalRaised),
    totalYieldDeposited: bn(b.totalYieldDeposited),
    totalPrincipalDeposited: bn(b.totalPrincipalDeposited),
    funded: b.funded,
    principalFunded: b.principalFunded,
    loanAgreementHash: b.loanAgreementHash,
    bump: b.bump,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listings = (j.listings || []).map((l: any) => ({
    pubkey: pk(l.pubkey),
    account: {
      seller: pk(l.seller),
      bondState: pk(l.bondState),
      units: bn(l.units),
      pricePerUnit: bn(l.pricePerUnit),
      contributionShare: bn(l.contributionShare),
      yieldClaimedShare: bn(l.yieldClaimedShare),
      active: l.active,
      bump: l.bump,
    } as Listing,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positions = (j.positions || []).map((p: any) => ({
    pubkey: pk(p.pubkey),
    account: {
      investor: pk(p.investor),
      bondState: pk(p.bondState),
      units: bn(p.units),
      contribution: bn(p.contribution),
      yieldClaimed: bn(p.yieldClaimed),
      redeemed: p.redeemed,
      refunded: p.refunded,
      bump: p.bump,
    } as InvestorPosition,
  }));

  return { source: j.source, updatedAt: j.updatedAt, bonds, listings, positions };
}

// Yazimdan sonra indeksi zorla tazele (ates-et-unut). Hata yutulur.
export async function refreshChainIndex(): Promise<void> {
  try {
    await fetch('/api/chain-index?refresh=1', { cache: 'no-store' });
  } catch {
    /* yoksay */
  }
}
