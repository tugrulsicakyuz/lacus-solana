import { NextResponse } from "next/server";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { SOLANA_RPC } from "@/config/solana";
import { supabase } from "@/lib/supabase";
import IDL from "@/lib/lacus-idl.json";

// Sunucu-taraflı indeks: zinciri (getProgramAccounts) burada, tek seferde, TTL ile
// tarariz; client artik agir RPC cagrisi yapmaz (429 biter). Snapshot Supabase'de
// tek satir JSON. ?refresh=1 ile bayatlik beklenmeden zorla taranir (yazimdan sonra).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 15_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bnum = (x: any): string => (x?.toString ? x.toString() : String(x));

function buildProgram() {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  // Read-only: imza gerekmez, dummy wallet yeterli (getProgramAccounts icin).
  const dummyWallet = {
    publicKey: Keypair.generate().publicKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signTransaction: async (tx: any) => tx,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signAllTransactions: async (txs: any[]) => txs,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program(IDL as any, provider);
}

async function scanChain() {
  const program = buildProgram();
  const [bonds, listings, positions] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (program.account as any).bondState.all(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (program.account as any).listing.all(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (program.account as any).investorPosition.all(),
  ]);

  return {
    updatedAt: new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bonds: bonds.map((b: any) => ({
      bondId: bnum(b.account.bondId),
      issuer: b.account.issuer.toBase58(),
      name: b.account.name,
      symbol: b.account.symbol,
      faceValue: bnum(b.account.faceValue),
      couponRateBps: b.account.couponRateBps,
      saleDeadline: bnum(b.account.saleDeadline),
      maturityTimestamp: bnum(b.account.maturityTimestamp),
      fundingGoal: bnum(b.account.fundingGoal),
      maxSupply: bnum(b.account.maxSupply),
      tokensSold: bnum(b.account.tokensSold),
      totalRaised: bnum(b.account.totalRaised),
      totalYieldDeposited: bnum(b.account.totalYieldDeposited),
      totalPrincipalDeposited: bnum(b.account.totalPrincipalDeposited),
      funded: b.account.funded,
      principalFunded: b.account.principalFunded,
      loanAgreementHash: b.account.loanAgreementHash,
      bump: b.account.bump,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listings: listings.map((l: any) => ({
      pubkey: l.publicKey.toBase58(),
      seller: l.account.seller.toBase58(),
      bondState: l.account.bondState.toBase58(),
      units: bnum(l.account.units),
      pricePerUnit: bnum(l.account.pricePerUnit),
      contributionShare: bnum(l.account.contributionShare),
      yieldClaimedShare: bnum(l.account.yieldClaimedShare),
      active: l.account.active,
      bump: l.account.bump,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    positions: positions.map((p: any) => ({
      pubkey: p.publicKey.toBase58(),
      investor: p.account.investor.toBase58(),
      bondState: p.account.bondState.toBase58(),
      units: bnum(p.account.units),
      contribution: bnum(p.account.contribution),
      yieldClaimed: bnum(p.account.yieldClaimed),
      redeemed: p.account.redeemed,
      refunded: p.account.refunded,
      bump: p.account.bump,
    })),
  };
}

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const { data: row } = await supabase
      .from("chain_index")
      .select("snapshot, updated_at")
      .eq("id", 1)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = row?.snapshot as any;
    const fresh = row?.updated_at && Date.now() - new Date(row.updated_at).getTime() < TTL_MS;
    if (!force && fresh && snap && Array.isArray(snap.bonds)) {
      return NextResponse.json({ source: "cache", ...snap });
    }

    const scanned = await scanChain();
    await supabase.from("chain_index").upsert({ id: 1, snapshot: scanned, updated_at: scanned.updatedAt });
    return NextResponse.json({ source: "chain", ...scanned });
  } catch (e) {
    // Tarama hatasi ( or. 429): bayat da olsa elimizdeki cache'i dondur.
    const { data: row } = await supabase.from("chain_index").select("snapshot").eq("id", 1).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = row?.snapshot as any;
    if (snap && Array.isArray(snap.bonds)) {
      return NextResponse.json({ source: "stale-cache", ...snap });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "index failed" }, { status: 502 });
  }
}
