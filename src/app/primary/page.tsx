"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { formatDate } from "@/lib/format";
import { useSearchParams } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useLacusProgram } from "@/hooks/useLacus";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OnChainBond {
  bondId: number;
  issuer: string;
  name: string;
  faceValue: number;
  couponRateBps: number;
  maturityTimestamp: number;
  maxSupply: number;
  tokensSold: number;
  isMatured: boolean;
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

const ROMAN = ["i","ii","iii","iv","v","vi","vii","viii","ix","x","xi","xii"];

// ── Main content ──────────────────────────────────────────────────────────────
function PrimaryContent() {
  const searchParams = useSearchParams();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { fetchAllBonds, buyBond } = useLacusProgram();

  const [bonds, setBonds]               = useState<CombinedBond[]>([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [selected, setSelected]         = useState<CombinedBond | null>(null);
  const [payAmount, setPayAmount]       = useState("");
  const [receiveAmt, setReceiveAmt]     = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [solBalance, setSolBalance]     = useState(0);
  const [refreshKey, setRefreshKey]     = useState(0);

  const heroBgRef = useRef<HTMLCanvasElement>(null);
  const depthRef  = useRef<HTMLCanvasElement>(null);

  // ── Hero bg canvas (flowing dot grid)
  useEffect(() => {
    const c = heroBgRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let rafId: number;
    const resize = () => { c.width = c.offsetWidth || window.innerWidth; c.height = c.offsetHeight || window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const draw = (t: number) => {
      const W = c.width, H = c.height; ctx.clearRect(0, 0, W, H);
      const step = 60;
      for (let x = 0; x < W + step; x += step) {
        for (let y = 0; y < H + step; y += step) {
          const wave = Math.sin((x + t * 0.04) * 0.02) * Math.cos((y + t * 0.03) * 0.025) * 20;
          const op = 0.04 + Math.abs(wave) * 0.002;
          ctx.beginPath();
          ctx.arc(x + wave, y + Math.cos((x + t * 0.02) * 0.015) * 15, Math.max(0, 0.8), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(201,149,42,${op})`; ctx.fill();
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(rafId); };
  }, []);

  // ── Depth band canvas (horizontal waves)
  useEffect(() => {
    const c = depthRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let rafId: number;
    const resize = () => { c.width = c.offsetWidth || window.innerWidth; c.height = c.offsetHeight || 400; };
    resize(); window.addEventListener("resize", resize);
    const draw = (t: number) => {
      const W = c.width, H = c.height; ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const y0 = H / 2 + (i - 4) * 40; ctx.moveTo(0, y0);
        for (let x = 0; x <= W; x += 4) {
          ctx.lineTo(x, y0 + Math.sin((x * 0.008 + t * 0.0006 + i * 0.8)) * 18 * Math.sin(i * 0.4 + 0.2));
        }
        ctx.strokeStyle = `rgba(201,149,42,${0.05 + i * 0.015})`; ctx.lineWidth = 0.8; ctx.stroke();
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(rafId); };
  }, []);

  // Scroll reveal: GlobalInteractions'taki global .reveal observer'ı yönetir
  // (MutationObserver'ı async yüklenen bond satırlarını da yakalar)

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

  // ── Buy (original logic preserved exactly)
  const handleBuy = async () => {
    if (!connected || !publicKey) { toast.error("Wallet not connected"); return; }
    if (!selected) { toast.error("No bond selected"); return; }
    const sol = parseFloat(payAmount);
    if (!payAmount || isNaN(sol) || sol <= 0) { toast.error("Enter a valid amount"); return; }
    if (selected.tokensSold >= selected.maxSupply) { toast.error("Bond fully sold"); return; }
    const fv = selected.faceValue / 1e9;
    const qty = Math.floor(sol / fv);
    if (qty === 0) { toast.error(`Minimum: ${fv} SOL per token`); return; }
    if (qty * selected.faceValue > solBalance * 1e9) { toast.error(`Insufficient SOL. Need ${(qty * fv).toFixed(4)} SOL`); return; }
    setIsProcessing(true);
    try {
      const tx = await buyBond(selected.bondId, qty);
      toast.success("Purchase complete!", { description: `TX: ${tx.slice(0,8)}...`, action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${tx}?cluster=devnet`, "_blank") } });
      setPayAmount(""); setReceiveAmt("");
      await fetchBalance(); setRefreshKey(k => k + 1);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Purchase failed"); }
    finally { setIsProcessing(false); }
  };

  // ── Derived values
  const fv      = selected ? selected.faceValue / 1e9 : 0;
  const apy     = selected ? selected.couponRateBps / 100 : 0;
  const fill    = selected ? Math.min((selected.tokensSold / selected.maxSupply) * 100, 100) : 0;
  const soldOut = selected ? selected.tokensSold >= selected.maxSupply : false;

  return (
      <div className="pri-root">

        {/* Hero */}
        <section className="pri-hero">
          <canvas ref={heroBgRef} style={{ position:"absolute", inset:0, pointerEvents:"none" }} />
          <div className="pri-hero-left">
            <div className="pri-hero-eyebrow reveal">§ Primary Market — Initial Offerings</div>
            <h1 className="pri-hero-title reveal">FIRST<br /><span className="gold">DEPTH.</span></h1>
            <div className="pri-hero-rule" />
            <p className="pri-hero-desc reveal">
              The primary market is where capital meets conviction. New instruments, first prices, verified issuers — before the world finds out.
            </p>
          </div>
          <div className="pri-hero-right">
            <div className="pri-stats-grid reveal">
              <div className="pri-stat">
                <div className="pri-stat-num">{loading ? "—" : bonds.length}</div>
                <div className="pri-stat-lbl">Active Offerings</div>
              </div>
              <div className="pri-stat">
                <div className="pri-stat-num">
                  {loading || bonds.length === 0 ? "—" : (bonds.reduce((s,b) => s + b.couponRateBps/100, 0) / bonds.length).toFixed(1)}
                  <span className="suf">%</span>
                </div>
                <div className="pri-stat-lbl">Avg APY</div>
              </div>
              <div className="pri-stat">
                <div className="pri-stat-num">
                  {loading || bonds.length === 0 ? "—" : Math.round(bonds.reduce((s,b) => s + Math.min((b.tokensSold/b.maxSupply)*100,100), 0) / bonds.length)}
                  <span className="suf">%</span>
                </div>
                <div className="pri-stat-lbl">Avg Fill Rate</div>
              </div>
              <div className="pri-stat">
                <div className="pri-stat-num">SOL</div>
                <div className="pri-stat-lbl">Settlement Layer</div>
              </div>
            </div>
            <div className="pri-hero-cta reveal">
              <a href="#offerings" className="pri-btn"><span>Browse Offerings</span></a>
              <a href="/manage/issue" className="pri-btn-ghost">Issue →</a>
            </div>
          </div>
        </section>

        {/* Offerings */}
        <section id="offerings">
          <div className="pri-offerings-header">
            <div className="pri-offerings-title reveal">Open<br />Offerings.</div>
            <div className="pri-offerings-meta reveal">
              {bonds.length} bonds on Solana Devnet<br />
              Click a row to select and purchase
            </div>
          </div>

          <div className="pri-offerings-body">
            {/* Table */}
            <div className="pri-table-wrap">
              <div className="pri-row hdr">
                <div className="pri-row-idx">#</div>
                <div className="pri-cell hdr">Instrument</div>
                <div className="pri-cell hdr">Face Value</div>
                <div className="pri-cell hdr">APY</div>
                <div className="pri-cell hdr">Maturity</div>
                <div className="pri-cell hdr">Status</div>
              </div>

              {loading ? (
                <div style={{ padding:"80px 48px", display:"flex", alignItems:"center", gap:16, color:"var(--pri-ink-dim)", fontSize:11, letterSpacing:".2em" }}>
                  <Loader2 style={{ width:16, height:16, animation:"spin 1s linear infinite" }} />
                  Loading bonds from Solana…
                </div>
              ) : fetchError ? (
                <div style={{ padding:"80px 48px" }}>
                  <p style={{ fontSize:11, letterSpacing:".2em", color:"var(--pri-ink-dim)", marginBottom:24, textTransform:"uppercase" }}>{fetchError}</p>
                  <button className="pri-btn-ghost" onClick={() => setRefreshKey(k => k+1)}><span>Retry</span></button>
                </div>
              ) : bonds.length === 0 ? (
                <div style={{ padding:"80px 48px", fontSize:11, letterSpacing:".2em", color:"var(--pri-ink-dim)", textTransform:"uppercase" }}>
                  No offerings on Solana Devnet
                </div>
              ) : (
                bonds.map((bond, i) => {
                  const fvSol  = bond.faceValue / 1e9;
                  const bApy   = bond.couponRateBps / 100;
                  const isSel  = selected?.bondId === bond.bondId;
                  const isSold = bond.tokensSold >= bond.maxSupply;
                  return (
                    <div
                      key={bond.bondId}
                      className={`pri-row${isSel ? " selected" : ""}`}
                      onClick={() => setSelected(bond)}
                      onMouseEnter={() => document.body.classList.add("cursor-hover")}
                      onMouseLeave={() => document.body.classList.remove("cursor-hover")}
                    >
                      <div className="pri-row-idx">{ROMAN[i] ?? i+1}.</div>
                      <div>
                        <div className="pri-row-name">{bond.symbol}</div>
                        <div className="pri-row-sub">{bond.issuerName} · Fixed-Rate</div>
                      </div>
                      <div className="pri-cell"><div className="lbl">Face Value</div>{fvSol.toFixed(4)} SOL</div>
                      <div className="pri-cell"><div className="lbl">APY</div><span style={{ color:"var(--pri-moss)" }}>{bApy}%</span></div>
                      <div className="pri-cell"><div className="lbl">Maturity</div>{formatDate(bond.maturityTimestamp)}</div>
                      <div className="pri-cell">
                        {isSold
                          ? <span className="pri-badge pri-badge-sold">Sold Out</span>
                          : bond.isMatured
                          ? <span className="pri-badge pri-badge-ended">Matured</span>
                          : <span className="pri-badge pri-badge-live">Live</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Buy Panel */}
            {!selected ? (
              <div className="pri-no-bond">Select an offering<br />to purchase</div>
            ) : (
              <div className="pri-buy-panel">
                <div className="pri-buy-lbl">Purchase</div>
                <div className="pri-buy-name">{selected.symbol}</div>
                <div className="pri-buy-sub">{selected.issuerName}</div>
                <div className="pri-fill-head"><span>Fill</span><span>{fill.toFixed(1)}%</span></div>
                <div className="pri-fill-track"><div className="pri-fill-fill" style={{ width:`${fill}%` }} /></div>

                {!connected ? (
                  <div className="pri-wallet-wrap">
                    <div className="pri-wallet-hint">Connect wallet to purchase</div>
                    <WalletMultiButton />
                  </div>
                ) : soldOut ? (
                  <div style={{ fontSize:11, letterSpacing:".2em", textTransform:"uppercase", color:"var(--pri-copper)", padding:"24px 0", borderTop:"1px solid var(--pri-rule)" }}>
                    This offering is fully sold
                  </div>
                ) : (
                  <>
                    <div className="pri-ibox">
                      <div className="pri-ibox-lbl"><span>You Pay</span><span style={{ color:"var(--pri-ink)" }}>{solBalance.toFixed(4)} SOL</span></div>
                      <input
                        className="pri-ifield"
                        type="number" placeholder="0"
                        value={payAmount}
                        onKeyDown={e => ["e","E","+","-"].includes(e.key) && e.preventDefault()}
                        onChange={e => {
                          setPayAmount(e.target.value);
                          const n = parseFloat(e.target.value);
                          setReceiveAmt(!isNaN(n) && n > 0 && fv > 0 ? (n/fv).toFixed(4) : "");
                        }}
                      />
                      <div className="pri-itoken">SOL</div>
                    </div>
                    <div className="pri-ibox" style={{ marginBottom:24 }}>
                      <div className="pri-ibox-lbl"><span>You Receive</span><span>{selected.symbol}</span></div>
                      <div className="pri-ireadonly">{receiveAmt || "0"}</div>
                      <div className="pri-itoken">{selected.symbol} tokens</div>
                    </div>
                    <div className="pri-bstats">
                      <div className="pri-bstat"><span className="pri-bstat-k">Face Value</span><span className="pri-bstat-v">{fv.toFixed(4)} SOL / token</span></div>
                      <div className="pri-bstat"><span className="pri-bstat-k">APY</span><span className="pri-bstat-v g">{apy}%</span></div>
                      <div className="pri-bstat"><span className="pri-bstat-k">Maturity</span><span className="pri-bstat-v">{formatDate(selected.maturityTimestamp)}</span></div>
                      <div className="pri-bstat"><span className="pri-bstat-k">Remaining</span><span className="pri-bstat-v">{(selected.maxSupply - selected.tokensSold).toLocaleString()} tokens</span></div>
                      <div className="pri-bstat"><span className="pri-bstat-k">Network</span><span className="pri-bstat-v g">Solana Devnet</span></div>
                    </div>
                    <button
                      className="pri-btn"
                      style={{ width:"100%", justifyContent:"center" }}
                      onClick={handleBuy}
                      disabled={!payAmount || payAmount === "0" || isProcessing}
                    >
                      <span>
                        {isProcessing
                          ? <span style={{ display:"flex", alignItems:"center", gap:8 }}><Loader2 style={{ width:14, height:14, animation:"spin 1s linear infinite" }} />Processing…</span>
                          : "Buy Bonds"}
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Depth band */}
        <section className="pri-depth">
          <canvas ref={depthRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />
          <p className="pri-depth-quote reveal">
            "The first price is the truest price.<br />Before noise. Before narrative."
          </p>
        </section>

        {/* How It Works */}
        <section className="pri-how">
          <div className="pri-how-header">
            <div className="pri-how-title reveal">How<br />It Works.</div>
            <p className="pri-how-note reveal">Four steps from intent to instrument. The primary market is not a portal — it is a protocol.</p>
          </div>
          <div className="pri-how-steps">
            {[
              { n:"1", t:"SELECT", d:"Browse live offerings. Each bond shows face value, APY, maturity, and fill rate — all pulled directly from Solana." },
              { n:"2", t:"PAY",    d:"Enter the SOL amount. The interface computes the exact bond token quantity at face value. No slippage, no hidden fees." },
              { n:"3", t:"SETTLE", d:"Solana-native settlement — sub-second finality. Allocations are final and recorded on-chain immediately." },
              { n:"4", t:"HOLD",   d:"Your bond tokens accrue yield until maturity. Transfer them freely on the secondary market any time before then." },
            ].map(s => (
              <div key={s.n} className="pri-how-step reveal">
                <div className="pri-how-step-n">{s.n}</div>
                <div className="pri-how-step-t">{s.t}</div>
                <div className="pri-how-step-d">{s.d}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
  );
}

export default function PrimaryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#0d0b08", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", color:"rgba(240,232,216,0.3)", fontSize:10, letterSpacing:"0.3em", textTransform:"uppercase" }}>
        Loading…
      </div>
    }>
      <PrimaryContent />
    </Suspense>
  );
}
