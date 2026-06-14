"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { formatDate } from "@/lib/format";
import { useSearchParams } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { retryUpsert } from "@/lib/supabase-retry";
import { toast } from "sonner";
import { useLacusProgram } from "@/hooks/useLacus";
import { buildAgreementText, hashAgreementText, shortHash, type AgreementTerms } from "@/lib/loan-agreement";
import { requireKyc } from "@/lib/kyc";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OnChainBond {
  bondId: number;
  issuer: string;
  name: string;
  faceValue: number;
  couponRateBps: number;
  maturityTimestamp: number;
  saleDeadline: number;
  maxSupply: number;
  tokensSold: number;
  funded: boolean;
}
interface BondMetadata {
  id: number;
  symbol: string;
  issuer_name: string;
  apy?: number;
  maturity_months?: number;
  price_per_token?: number;
  total_issue_size?: number;
  filled_percentage?: number;
  description?: string;
}
interface CombinedBond extends OnChainBond {
  symbol: string;
  issuerName: string;
  description?: string;
}

// ── Main content ──────────────────────────────────────────────────────────────
function PrimaryContent() {
  const searchParams = useSearchParams();
  const { publicKey, connected, signMessage } = useWallet();
  const { connection } = useConnection();
  const { fetchAllBonds, buyBond } = useLacusProgram();

  // Loan agreement accept/sign modal
  const [showAgreement, setShowAgreement] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [pending, setPending] = useState<{ qty: number; text: string; hashHex: string } | null>(null);

  const [bonds, setBonds]               = useState<CombinedBond[]>([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [selected, setSelected]         = useState<CombinedBond | null>(null);
  const [payAmount, setPayAmount]       = useState("");
  const [receiveAmt, setReceiveAmt]     = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [solBalance, setSolBalance]     = useState(0);
  const [refreshKey, setRefreshKey]     = useState(0);

  // ── SOL balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) { setSolBalance(0); return; }
    try { setSolBalance((await connection.getBalance(publicKey)) / 1e9); } catch { setSolBalance(0); }
  }, [publicKey, connected, connection]);

  // ── Fetch bonds (original logic preserved exactly)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setFetchError(null);

      try {
        const onChainData = await fetchAllBonds();

        const { data: metadata, error: metaError } = await supabase
          .from("bonds")
          .select("id, symbol, issuer_name, apy, maturity_months, price_per_token, total_issue_size, filled_percentage, description");

        if (metaError) console.warn("Could not fetch bond metadata:", metaError?.message ?? metaError);

        const combined: CombinedBond[] = onChainData.map((bond: any, index: number) => {
          const meta = metadata?.find((m: BondMetadata) => m.id === bond.bondId) || metadata?.[index];
          return {
            ...bond,
            name: bond.name || meta?.issuer_name || "Unknown Bond",
            symbol: meta?.symbol || bond.symbol || `BOND-${bond.bondId}`,
            issuerName: meta?.issuer_name || bond.name || `${bond.issuer.toString().slice(0, 6)}...${bond.issuer.toString().slice(-4)}`,
            description: meta?.description ?? undefined,
          };
        });

        setBonds(combined);

        const bondParam = searchParams.get("bond");
        if (bondParam) {
          const match = combined.find((b) => b.symbol === bondParam);
          setSelected(match ?? combined[0] ?? null);
        } else if (combined.length > 0) {
          setSelected(combined[0]);
        }
      } catch (error) {
        setFetchError("Failed to load bonds. Please try again.");
        toast.error("Failed to load bonds", { description: error instanceof Error ? error.message : undefined });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    fetchBalance();
  }, [connected, refreshKey, fetchBalance]);

  useEffect(() => { setPayAmount(""); setReceiveAmt(""); }, [selected]);

  // ── Step 1: validate + KYC gate, then load the agreement and open the modal
  const handleBuy = async () => {
    if (!connected || !publicKey) { toast.error("Wallet not connected"); return; }
    if (!selected) { toast.error("No bond selected"); return; }
    const sol = parseFloat(payAmount);
    if (!payAmount || isNaN(sol) || sol <= 0) { toast.error("Enter a valid amount"); return; }
    if (Number(selected.tokensSold) >= Number(selected.maxSupply)) { toast.error("Bond fully sold"); return; }
    if (selected.funded || Math.floor(Date.now() / 1000) >= Number(selected.saleDeadline)) { toast.error("Subscription is closed for this offering"); return; }
    const fv = Number(selected.faceValue) / 1e9;
    const qty = Math.floor(sol / fv);
    if (qty === 0) { toast.error(`Minimum: ${fv} SOL per token`); return; }
    if (qty * Number(selected.faceValue) > solBalance * 1e9) { toast.error(`Insufficient SOL. Need ${(qty * fv).toFixed(4)} SOL`); return; }

    // KYC gate (no-op while disabled)
    const kyc = await requireKyc(publicKey);
    if (!kyc.ok) { toast.error("KYC required", { description: `Your wallet is not approved (status: ${kyc.status}).` }); return; }

    // Load the issuer's published agreement; fall back to rebuilding it from on-chain terms.
    try {
      const { data: ag } = await supabase
        .from("agreements")
        .select("agreement_text, sha256_hex")
        .eq("bond_id", selected.bondId)
        .maybeSingle();

      let text: string;
      let hashHex: string;
      if (ag?.agreement_text && ag?.sha256_hex) {
        text = ag.agreement_text;
        hashHex = ag.sha256_hex;
      } else {
        const terms: AgreementTerms = {
          issuer: selected.issuer.toString(),
          name: selected.name,
          symbol: selected.symbol,
          faceValueLamports: Number(selected.faceValue),
          couponRateBps: selected.couponRateBps,
          maturityTimestamp: Number(selected.maturityTimestamp),
          maxSupply: Number(selected.maxSupply),
        };
        text = buildAgreementText(terms);
        hashHex = (await hashAgreementText(text)).hashHex;
      }
      setPending({ qty, text, hashHex });
      setAccepted(false);
      setShowAgreement(true);
    } catch (e) {
      toast.error("Could not load the loan agreement", { description: e instanceof Error ? e.message : undefined });
    }
  };

  // ── Step 2: sign the agreement (free), record acceptance, then buy on chain
  const confirmAndBuy = async () => {
    if (!pending || !selected || !publicKey) return;
    if (!signMessage) { toast.error("Your wallet does not support message signing"); return; }

    setIsSigning(true);
    try {
      const sig = await signMessage(new TextEncoder().encode(pending.hashHex));
      const sigB64 = btoa(String.fromCharCode(...sig));
      const accRes = await retryUpsert(
        "agreement_acceptances",
        { bond_id: selected.bondId, investor_wallet: publicKey.toBase58(), sha256_hex: pending.hashHex, signature: sigB64 },
        3,
        "bond_id,investor_wallet"
      );
      if (!accRes.success) toast.warning("Could not record acceptance, continuing", { description: accRes.error });
    } catch (e) {
      toast.error("Agreement not signed", { description: e instanceof Error ? e.message : undefined });
      setIsSigning(false);
      return;
    }
    setIsSigning(false);

    setIsProcessing(true);
    try {
      const tx = await buyBond(selected.bondId, pending.qty);
      toast.success("Purchase complete!", { description: `TX: ${tx.slice(0,8)}...`, action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${tx}?cluster=devnet`, "_blank") } });
      setPayAmount(""); setReceiveAmt("");
      setShowAgreement(false); setPending(null); setAccepted(false);
      await fetchBalance(); setRefreshKey(k => k + 1);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Purchase failed"); }
    finally { setIsProcessing(false); }
  };

  // ── Derived values
  const nowSec  = Math.floor(Date.now() / 1000);
  const fv      = selected ? Number(selected.faceValue) / 1e9 : 0;
  const apy     = selected ? selected.couponRateBps / 100 : 0;
  const fill    = selected ? Math.min((Number(selected.tokensSold) / Number(selected.maxSupply)) * 100, 100) : 0;
  const soldOut = selected ? Number(selected.tokensSold) >= Number(selected.maxSupply) : false;
  const saleClosed = selected ? (selected.funded || nowSec >= Number(selected.saleDeadline)) : false;
  const closed = soldOut || saleClosed; // yeni alım yapılamaz

  return (
    <div className="lx-wrap">
      <div className="lx-pagehead">
        <div className="lx-kicker">Primary market</div>
        <h1>Subscribe to live issues.</h1>
        <p className="lx-lede">
          Lend directly to the borrower at the offering price. No underwriter sets the terms. Your
          money sits in program escrow until close, not with us.
        </p>
      </div>

      <div className="pri-grid">
        {/* Table */}
        <div>
          {loading ? (
            <div className="lx-loading">
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Loading bonds from Solana…
            </div>
          ) : fetchError ? (
            <div className="lx-empty">
              <p>{fetchError}</p>
              <button className="lx-btn lx-btn-ghost lx-btn-sm" onClick={() => setRefreshKey(k => k + 1)}>Retry</button>
            </div>
          ) : bonds.length === 0 ? (
            <div className="lx-empty">
              <p>No offerings are open right now. New issues appear here the moment a borrower publishes one.</p>
            </div>
          ) : (
            <div className="lx-scroll">
              <table className="lx-table">
                <thead>
                  <tr>
                    <th>No.</th><th>Bond</th><th className="r">Coupon</th><th className="r">Maturity</th>
                    <th className="r">Face value</th><th className="r">Subscription</th><th className="r">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bonds.map((bond, i) => {
                    const fvSol  = Number(bond.faceValue) / 1e9;
                    const bApy   = bond.couponRateBps / 100;
                    const bFill  = Math.min((Number(bond.tokensSold) / Number(bond.maxSupply)) * 100, 100);
                    const isSel  = selected?.bondId === bond.bondId;
                    const isSold = Number(bond.tokensSold) >= Number(bond.maxSupply);
                    const bClosed = bond.funded || nowSec >= Number(bond.saleDeadline);
                    return (
                      <tr
                        key={bond.bondId}
                        className={`pri-row${isSel ? " sel" : ""}`}
                        onClick={() => setSelected(bond)}
                      >
                        <td className="lx-rowno">{String(i + 1).padStart(2, "0")}</td>
                        <td>
                          <div className="lx-sym">{bond.symbol}</div>
                          <div className="lx-issuer">{bond.issuerName}</div>
                        </td>
                        <td className="r num">{bApy.toFixed(2)}%</td>
                        <td className="r num">{formatDate(bond.maturityTimestamp)}</td>
                        <td className="r num">{fvSol.toFixed(4)} SOL</td>
                        <td className="r"><span className={`lx-stamp num${isSold ? "" : " open"}`}>{bFill.toFixed(0)}% SOLD</span></td>
                        <td className="r">
                          {isSold
                            ? <span className="lx-stamp">SOLD OUT</span>
                            : bClosed
                            ? <span className="lx-stamp">CLOSED</span>
                            : <span className="lx-stamp open">● OPEN</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Subscription ticket */}
        <div className="lx-sticky">
          {!selected ? (
            <div className="lx-empty" style={{ marginTop: 0 }}>
              <p>Select an offering to subscribe.</p>
            </div>
          ) : (
            <div className="lx-ticket">
              <div className="lx-ticket-head">
                <button className="on">SUBSCRIBE</button>
              </div>
              <div className="lx-ticket-body">
                <div className="lx-trow"><span>Bond</span><span className="v lx-sym">{selected.symbol}</span></div>
                <div className="lx-trow"><span>Face value</span><span className="v num">{fv.toFixed(4)} SOL / unit</span></div>
                <div className="lx-trow"><span>Coupon</span><span className="v num">{apy.toFixed(2)}%</span></div>
                <div className="lx-trow"><span>Maturity</span><span className="v num">{formatDate(selected.maturityTimestamp)}</span></div>

                <div className="lx-submeter" style={{ margin: "14px 0" }}>
                  <div className="cap"><span>Subscribed</span><span className="num">{fill.toFixed(1)}%</span></div>
                  <div className="bar"><i style={{ width: `${fill}%` }}></i></div>
                </div>

                {!connected ? (
                  <div className="pri-wallet lx-wallet">
                    <p className="lx-fn" style={{ marginTop: 0 }}>Connect wallet to purchase</p>
                    <WalletMultiButton />
                  </div>
                ) : soldOut ? (
                  <p className="lx-fn" style={{ marginTop: 0 }}>This offering is fully sold</p>
                ) : saleClosed ? (
                  <p className="lx-fn" style={{ marginTop: 0 }}>Subscription is closed for this offering</p>
                ) : (
                  <>
                    <label className="lx-field" style={{ margin: "14px 0" }}>
                      <span>You pay · SOL (balance: {solBalance.toFixed(4)})</span>
                      <input
                        className="num"
                        type="number" placeholder="0"
                        value={payAmount}
                        onKeyDown={e => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                        onChange={e => {
                          setPayAmount(e.target.value);
                          const n = parseFloat(e.target.value);
                          setReceiveAmt(!isNaN(n) && n > 0 && fv > 0 ? (n / fv).toFixed(4) : "");
                        }}
                      />
                    </label>
                    <div className="lx-trow"><span>You&apos;ll receive</span><span className="v num">{receiveAmt || "0"} × {selected.symbol}</span></div>
                    <div className="lx-trow"><span>Remaining</span><span className="v num">{(Number(selected.maxSupply) - Number(selected.tokensSold)).toLocaleString()} units</span></div>
                    <div className="lx-trow total"><span>Total</span><span className="v num">{payAmount || "0"} SOL</span></div>
                  </>
                )}
              </div>
              {connected && !closed && (
                <div className="lx-ticket-foot">
                  <button
                    className="lx-btn lx-btn-solid lx-btn-block"
                    onClick={handleBuy}
                    disabled={!payAmount || payAmount === "0" || isProcessing}
                  >
                    {isProcessing
                      ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />Processing…</span>
                      : "Buy units"}
                  </button>
                </div>
              )}
              <div className="lx-finefoot">SOLANA DEVNET · TEST INSTRUMENTS</div>
            </div>
          )}
        </div>
      </div>

      {showAgreement && pending && selected && (
        <div
          onClick={() => !isSigning && !isProcessing && setShowAgreement(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 560, background: "var(--paper)", color: "var(--ink)", borderRadius: 12, padding: "20px 22px", maxHeight: "85vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <strong style={{ fontSize: 18 }}>Loan agreement</strong>
              <button onClick={() => setShowAgreement(false)} disabled={isSigning || isProcessing} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <p className="lx-fn" style={{ marginTop: 0 }}>{selected.symbol} · you are buying {pending.qty} {pending.qty === 1 ? "unit" : "units"}</p>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "12px 14px", maxHeight: 240, overflow: "auto", margin: "8px 0" }}>{pending.text}</pre>
            <p className="lx-fn" style={{ marginTop: 0, fontFamily: "monospace" }}>on-chain hash · {shortHash(pending.hashHex)}</p>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, margin: "10px 0" }}>
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I have read and agree to this loan agreement.</span>
            </label>
            <button className="lx-btn lx-btn-solid lx-btn-block" onClick={confirmAndBuy} disabled={!accepted || isSigning || isProcessing}>
              {isSigning
                ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />Waiting for signature…</span>
                : isProcessing
                ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />Processing…</span>
                : "Sign agreement, then buy"}
            </button>
            <p className="lx-fn" style={{ marginTop: 8 }}>
              Two wallet approvals: sign the agreement (free), then confirm the purchase ({(pending.qty * (Number(selected.faceValue) / 1e9)).toFixed(4)} SOL).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrimaryPage() {
  return (
    <Suspense fallback={<div className="lx-loading">Loading…</div>}>
      <PrimaryContent />
    </Suspense>
  );
}
