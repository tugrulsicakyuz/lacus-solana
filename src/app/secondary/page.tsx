"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";
import { useLacusProgram, type PortfolioHolding } from "@/hooks/useLacus";
import { getBondStatePDA } from "@/lib/lacus-program";
import type { BondState, Listing } from "@/types/lacus";
import { formatDate, formatSOL } from "@/lib/format";

interface ListingRow {
  pubkey: PublicKey;
  account: Listing;
  bond?: BondState;
  bondId?: number;
}

const SECONDARY_FEE_BPS = 25; // %0.25 (kontrattaki ile aynı)

export default function SecondaryMarket() {
  const { connected, publicKey } = useWallet();
  const { fetchAllBonds, fetchListings, fetchPortfolioBonds, listUnits, cancelListing, buyListing } =
    useLacusProgram();

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sell form
  const [sellBondId, setSellBondId] = useState<number | "">("");
  const [sellUnits, setSellUnits] = useState("");
  const [sellPrice, setSellPrice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allBonds, allListings] = await Promise.all([fetchAllBonds(), fetchListings()]);
      const byState = new Map<string, { bond: BondState; bondId: number }>();
      allBonds.forEach((b: BondState) => {
        const [pda] = getBondStatePDA(Number(b.bondId));
        byState.set(pda.toBase58(), { bond: b, bondId: Number(b.bondId) });
      });
      const rows: ListingRow[] = allListings.map((l) => {
        const hit = byState.get(l.account.bondState.toBase58());
        return { ...l, bond: hit?.bond, bondId: hit?.bondId };
      });
      setListings(rows);
      if (connected) {
        try { setHoldings(await fetchPortfolioBonds()); } catch { setHoldings([]); }
      } else {
        setHoldings([]);
      }
    } catch (e) {
      toast.error("Failed to load the secondary market", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [fetchAllBonds, fetchListings, fetchPortfolioBonds, connected]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const now = Math.floor(Date.now() / 1000);
  const mine = publicKey?.toBase58();
  const myListings = listings.filter((l) => l.account.seller.toBase58() === mine);
  const openListings = listings.filter((l) => l.account.seller.toBase58() !== mine);

  const myListedBondIds = new Set(myListings.map((l) => l.bondId));
  const sellable = holdings.filter(
    (h) =>
      h.bond.funded &&
      Number(h.bond.maturityTimestamp) > now &&
      h.units > 0 &&
      !myListedBondIds.has(Number(h.bond.bondId))
  );

  // İzole log: ilanların neden "Open" yerine "Your listings"e düştüğünü, sellable
  // filtresinin ne elediğini gösterir. Konsolda "[Lacus] secondary" diye filtrele.
  useEffect(() => {
    if (loading) return;
    console.log("[Lacus] secondary breakdown", {
      wallet: mine ?? "(disconnected)",
      totalActiveListings: listings.length,
      openListings_notMine: openListings.length,
      yourListings_mine: myListings.length,
      holdings: holdings.length,
      sellableHoldings: sellable.length,
      sellableReasonHint: "sellable = funded & not matured & units>0 & not already listed by you",
      holdingsDetail: holdings.map((h) => ({
        symbol: h.bond.symbol,
        bondId: Number(h.bond.bondId),
        units: h.units,
        funded: h.bond.funded,
        matured: Number(h.bond.maturityTimestamp) <= now,
        alreadyListedByYou: myListedBondIds.has(Number(h.bond.bondId)),
      })),
    });
  }, [loading, listings, holdings, mine, openListings.length, myListings.length, sellable.length, now, myListedBondIds]);

  const explorer = (tx: string) => () => window.open(`https://explorer.solana.com/tx/${tx}?cluster=devnet`, "_blank");

  const handleBuy = async (row: ListingRow) => {
    if (!connected) { toast.error("Connect a wallet to buy"); return; }
    if (row.bondId == null) { toast.error("Bond for this listing not found"); return; }
    setBusy("buy-" + row.pubkey.toBase58());
    try {
      const tx = await buyListing(row.bondId, row.account.seller);
      toast.success("Trade settled!", { description: `${tx.slice(0, 8)}...`, action: { label: "View", onClick: explorer(tx) } });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(null);
    }
  };

  const handleList = async () => {
    if (!connected) { toast.error("Connect a wallet to sell"); return; }
    if (sellBondId === "") { toast.error("Pick a bond you hold"); return; }
    const u = parseInt(sellUnits);
    const p = parseFloat(sellPrice);
    if (!u || u <= 0) { toast.error("Enter how many units to sell"); return; }
    if (!p || p <= 0) { toast.error("Enter a price per unit"); return; }
    const holding = holdings.find((h) => Number(h.bond.bondId) === sellBondId);
    if (!holding || u > holding.units) { toast.error("You don't hold that many units"); return; }
    setBusy("list");
    try {
      const tx = await listUnits(sellBondId, u, Math.round(p * 1e9));
      toast.success("Listed for sale!", { description: `${tx.slice(0, 8)}...`, action: { label: "View", onClick: explorer(tx) } });
      setSellUnits(""); setSellPrice(""); setSellBondId("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Listing failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (row: ListingRow) => {
    if (row.bondId == null) return;
    setBusy("cancel-" + row.pubkey.toBase58());
    try {
      await cancelListing(row.bondId);
      toast.success("Listing cancelled. Your units are back in your position.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="lx-wrap">
        <div className="lx-pagehead">
          <div className="lx-kicker">Secondary market</div>
          <h1>Trade before maturity.</h1>
          <p className="lx-lede">
            Sell your side of a loan agreement before maturity, or buy into one that is already
            live. Listings settle peer to peer in SOL through the program. Accrued coupon is paid
            to the seller at listing time, so the buyer starts clean.
          </p>
        </div>

        {/* Open listings */}
        <div className="lx-statement">
          <h3 className="lx-subhead">Open listings{!loading && <span className="num"> · {openListings.length}</span>}</h3>
          <div className="lx-drule"></div>
          {loading ? (
            <div className="lx-loading"><Loader2 size={14} className="animate-spin" /> Loading the order book…</div>
          ) : openListings.length === 0 ? (
            <div className="lx-empty"><p>No listings for sale right now. If you hold units, you can list the first one below.</p></div>
          ) : (
            <div className="lx-scroll">
              <table className="lx-table">
                <thead>
                  <tr>
                    <th>Bond</th><th className="r">Coupon</th><th className="r">Maturity</th>
                    <th className="r">Units</th><th className="r">Price / unit</th><th className="r">Total + fee</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {openListings.map((row) => {
                    const units = Number(row.account.units);
                    const price = Number(row.account.pricePerUnit);
                    const total = units * price;
                    const fee = Math.floor((total * SECONDARY_FEE_BPS) / 10000);
                    const sym = row.bond?.symbol ?? "—";
                    const k = "buy-" + row.pubkey.toBase58();
                    return (
                      <tr key={row.pubkey.toBase58()}>
                        <td>
                          {row.bond
                            ? <Link href={`/bond/${sym}`} className="lx-sym mgmt-link">{sym}</Link>
                            : <span className="lx-sym">{sym}</span>}
                          <div className="lx-issuer">{row.bond?.name ?? row.account.seller.toBase58().slice(0, 8) + "…"}</div>
                        </td>
                        <td className="r num">{row.bond ? (row.bond.couponRateBps / 100).toFixed(2) + "%" : "—"}</td>
                        <td className="r num">{row.bond ? formatDate(Number(row.bond.maturityTimestamp)) : "—"}</td>
                        <td className="r num">{units.toLocaleString()}</td>
                        <td className="r num">{formatSOL(price)} SOL</td>
                        <td className="r num">{formatSOL(total + fee)} SOL</td>
                        <td className="r">
                          <button
                            className="lx-btn lx-btn-solid lx-btn-sm"
                            onClick={() => handleBuy(row)}
                            disabled={busy === k || row.bondId == null}
                          >
                            {busy === k ? <Loader2 size={11} className="animate-spin" /> : "Buy"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {openListings.length > 0 && (
            <p className="lx-fn">Total includes the {(SECONDARY_FEE_BPS / 100).toFixed(2)}% protocol fee. Settles in SOL, one transaction, no custody.</p>
          )}
        </div>

        {/* Sell your units */}
        <div className="lx-statement">
          <h3 className="lx-subhead">Sell your units</h3>
          <div className="lx-drule"></div>
          {!connected ? (
            <div className="lx-empty">
              <p>Connect a wallet to list units you hold.</p>
              <div className="lx-wallet"><WalletMultiButton /></div>
            </div>
          ) : sellable.length === 0 ? (
            <div className="lx-empty">
              <p>You have no units available to list. Buy on the <Link href="/primary" className="lx-readmore">primary market</Link> first, or you may already have an open listing below.</p>
            </div>
          ) : (
            <div className="sec-sell" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", paddingTop: 14 }}>
              <label className="lx-field" style={{ minWidth: 220 }}>
                <span>Bond</span>
                <select
                  value={sellBondId}
                  onChange={(e) => setSellBondId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Select a holding…</option>
                  {sellable.map((h) => (
                    <option key={Number(h.bond.bondId)} value={Number(h.bond.bondId)}>
                      {h.bond.symbol} · {h.units.toLocaleString()} units held
                    </option>
                  ))}
                </select>
              </label>
              <label className="lx-field" style={{ width: 130 }}>
                <span>Units</span>
                <input className="num" type="number" min={1} placeholder="0" value={sellUnits} onChange={(e) => setSellUnits(e.target.value)} />
              </label>
              <label className="lx-field" style={{ width: 150 }}>
                <span>Price / unit · SOL</span>
                <input className="num" type="number" min={0} step="0.0001" placeholder="0.00" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
              </label>
              <button className="lx-btn lx-btn-solid" onClick={handleList} disabled={busy === "list"}>
                {busy === "list" ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Loader2 size={13} className="animate-spin" />Listing…</span> : "List for sale"}
              </button>
            </div>
          )}
        </div>

        {/* Your listings */}
        {connected && myListings.length > 0 && (
          <div className="lx-statement">
            <h3 className="lx-subhead">Your listings</h3>
            <div className="lx-drule"></div>
            <div className="lx-scroll">
              <table className="lx-table">
                <thead>
                  <tr><th>Bond</th><th className="r">Units</th><th className="r">Price / unit</th><th className="r">Total</th><th></th></tr>
                </thead>
                <tbody>
                  {myListings.map((row) => {
                    const units = Number(row.account.units);
                    const price = Number(row.account.pricePerUnit);
                    const k = "cancel-" + row.pubkey.toBase58();
                    return (
                      <tr key={row.pubkey.toBase58()}>
                        <td><span className="lx-sym">{row.bond?.symbol ?? "—"}</span></td>
                        <td className="r num">{units.toLocaleString()}</td>
                        <td className="r num">{formatSOL(price)} SOL</td>
                        <td className="r num">{formatSOL(units * price)} SOL</td>
                        <td className="r">
                          <button className="lx-btn lx-btn-ghost lx-btn-sm" onClick={() => handleCancel(row)} disabled={busy === k}>
                            {busy === k ? <Loader2 size={11} className="animate-spin" /> : "Cancel"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={{ paddingBottom: 96 }} />
    </div>
  );
}
