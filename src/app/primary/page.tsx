"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
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
  description?: string;
}
interface CombinedBond extends OnChainBond {
  symbol: string;
  issuerName: string;
  description?: string;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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

  const grainRef  = useRef<HTMLCanvasElement>(null);
  const heroBgRef = useRef<HTMLCanvasElement>(null);
  const depthRef  = useRef<HTMLCanvasElement>(null);
  const dotRef    = useRef<HTMLDivElement>(null);
  const ringRef   = useRef<HTMLDivElement>(null);

  // ── Grain canvas
  useEffect(() => {
    const c = grainRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let tid: ReturnType<typeof setTimeout>;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      const d = ctx.createImageData(c.width, c.height), b = d.data;
      for (let i = 0; i < b.length; i += 4) { const v = Math.random() * 255 | 0; b[i] = b[i+1] = b[i+2] = v; b[i+3] = 255; }
      ctx.putImageData(d, 0, 0); tid = setTimeout(() => requestAnimationFrame(draw), 80);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); clearTimeout(tid); };
  }, []);

  // ── Custom cursor
  useEffect(() => {
    const dot = dotRef.current, ring = ringRef.current;
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0, rafId: number;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx-4}px,${my-4}px,0)`; };
    const loop = () => { rx += (mx-rx)*0.12; ry += (my-ry)*0.12; ring.style.transform = `translate3d(${rx-20}px,${ry-20}px,0)`; rafId = requestAnimationFrame(loop); };
    const onClick = (e: MouseEvent) => {
      const el = document.createElement("div");
      el.style.cssText = `position:fixed;border-radius:50%;border:1px solid var(--pri-gold);pointer-events:none;z-index:9990;transform:translate(-50%,-50%) scale(0);opacity:.6;animation:priRipple 1.4s cubic-bezier(.2,.8,.4,1) forwards;left:${e.clientX}px;top:${e.clientY}px;width:80px;height:80px;`;
      document.body.appendChild(el); el.addEventListener("animationend", () => el.remove());
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("click", onClick);
    loop();
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("click", onClick); cancelAnimationFrame(rafId); };
  }, []);

  // ── Hero bg canvas (flowing dot grid)
  useEffect(() => {
    const c = heroBgRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
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

  // ── Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("pri-visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".pri-reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [bonds]);

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
          .select("id, symbol, issuer_name, apy, maturity_months, price_per_token, total_issue_size, filled_percentage");

        if (metaError) console.warn("Could not fetch bond metadata:", metaError?.message ?? metaError);

        const combined: CombinedBond[] = onChainData.map((bond: any, index: number) => {
          const meta = metadata?.find((m: BondMetadata) => m.id === bond.bondId) || metadata?.[index];
          return {
            ...bond,
            name: bond.name || meta?.issuer_name || "Unknown Bond",
            symbol: meta?.symbol || bond.symbol || `BOND-${bond.bondId}`,
            issuerName: meta?.issuer_name || bond.name || `${bond.issuer.toString().slice(0, 6)}...${bond.issuer.toString().slice(-4)}`,
            description: (meta as any)?.description ?? undefined,
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
      } catch (error: any) {
        setFetchError("Failed to load bonds. Please try again.");
        toast.error("Failed to load bonds", { description: error?.message });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, refreshKey]);

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
    } catch (e: any) { toast.error(e?.message ?? "Purchase failed"); }
    finally { setIsProcessing(false); }
  };

  // ── Derived values
  const fv      = selected ? selected.faceValue / 1e9 : 0;
  const apy     = selected ? selected.couponRateBps / 100 : 0;
  const fill    = selected ? Math.min((selected.tokensSold / selected.maxSupply) * 100, 100) : 0;
  const soldOut = selected ? selected.tokensSold >= selected.maxSupply : false;

  return (
    <>
      <style>{`
        @keyframes priRipple { to { transform: translate(-50%,-50%) scale(1); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pri-root {
          --pri-bg: #0d0b08; --pri-ink: #f0e8d8; --pri-ink-dim: #7a6f60;
          --pri-gold: oklch(0.72 0.14 72); --pri-copper: oklch(0.52 0.13 38);
          --pri-moss: oklch(0.48 0.09 145); --pri-rule: rgba(240,232,216,0.12);
          min-height: 100vh; background: var(--pri-bg); color: var(--pri-ink);
          font-family: 'DM Mono', monospace; cursor: none; overflow-x: hidden;
        }
        #pri-grain { position:fixed;inset:0;pointer-events:none;z-index:9000;opacity:.035; }
        #pri-dot   { position:fixed;top:0;left:0;width:8px;height:8px;background:var(--pri-gold);border-radius:50%;pointer-events:none;z-index:9999;will-change:transform;mix-blend-mode:difference; }
        #pri-ring  { position:fixed;top:0;left:0;width:40px;height:40px;border:1px solid var(--pri-gold);border-radius:50%;pointer-events:none;z-index:9998;will-change:transform;transition:width .3s,height .3s,border-color .3s,opacity .3s;opacity:.5; }
        .pri-cursor-hover #pri-ring { width:70px;height:70px;border-color:var(--pri-copper);opacity:.9; }

        .pri-reveal { opacity:0;transform:translateY(40px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1); }
        .pri-visible { opacity:1 !important;transform:translateY(0) !important; }

        .pri-hero { height:100vh;display:grid;grid-template-columns:1fr 1fr;position:relative;overflow:hidden;border-bottom:1px solid var(--pri-rule); }
        .pri-hero-left { display:flex;flex-direction:column;justify-content:flex-end;padding:0 48px 80px;border-right:1px solid var(--pri-rule);position:relative;z-index:2; }
        .pri-hero-eyebrow { font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:var(--pri-ink-dim);margin-bottom:32px; }
        .pri-hero-title { font-family:'Bebas Neue',sans-serif;font-size:clamp(80px,11vw,160px);letter-spacing:-.02em;line-height:.88;margin-bottom:40px; }
        .pri-hero-title .gold { color:var(--pri-gold); }
        .pri-hero-rule { width:100%;height:1px;background:var(--pri-rule);margin-bottom:32px; }
        .pri-hero-desc { font-family:'Cormorant Garamond',serif;font-style:italic;font-size:20px;font-weight:300;color:var(--pri-ink-dim);line-height:1.65;max-width:380px; }
        .pri-hero-right { display:flex;flex-direction:column;justify-content:flex-end;padding:0 48px 80px;position:relative;z-index:2; }
        .pri-stats-grid { display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--pri-rule);margin-bottom:48px; }
        .pri-stat { background:var(--pri-bg);padding:36px 32px; }
        .pri-stat-num { font-family:'Bebas Neue',sans-serif;font-size:52px;color:var(--pri-ink);line-height:1;letter-spacing:-.02em; }
        .pri-stat-num .suf { font-size:.4em;color:var(--pri-gold); }
        .pri-stat-lbl { font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:var(--pri-ink-dim);margin-top:6px; }
        .pri-hero-cta { display:flex;gap:16px;flex-wrap:wrap; }

        .pri-btn { display:inline-flex;align-items:center;gap:16px;padding:18px 40px;border:1px solid var(--pri-gold);color:var(--pri-ink);text-decoration:none;font-size:11px;letter-spacing:.3em;text-transform:uppercase;position:relative;overflow:hidden;cursor:none;transition:color .3s;background:none;font-family:'DM Mono',monospace; }
        .pri-btn::before { content:'';position:absolute;inset:0;background:var(--pri-gold);transform:translateY(100%);transition:transform .4s cubic-bezier(.16,1,.3,1); }
        .pri-btn:hover { color:var(--pri-bg); }
        .pri-btn:hover::before { transform:translateY(0); }
        .pri-btn span { position:relative;z-index:1; }
        .pri-btn:disabled { opacity:.4;pointer-events:none; }
        .pri-btn-ghost { display:inline-flex;align-items:center;gap:12px;padding:18px 40px;border:1px solid var(--pri-rule);color:var(--pri-ink-dim);text-decoration:none;font-size:11px;letter-spacing:.3em;text-transform:uppercase;cursor:none;transition:all .3s;background:none;font-family:'DM Mono',monospace; }
        .pri-btn-ghost:hover { border-color:var(--pri-ink-dim);color:var(--pri-ink); }

        .pri-offerings-header { padding:100px 48px 60px;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid var(--pri-rule); }
        .pri-offerings-title { font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,7vw,88px);letter-spacing:-.01em;line-height:1; }
        .pri-offerings-meta { font-size:12px;color:var(--pri-ink-dim);line-height:1.8;text-align:right; }
        .pri-offerings-body { display:grid;grid-template-columns:1fr 400px;border-bottom:1px solid var(--pri-rule); }
        .pri-table-wrap { border-right:1px solid var(--pri-rule); }

        .pri-row { display:grid;grid-template-columns:52px 1fr 130px 110px 140px 140px;align-items:center;padding:36px 48px;border-bottom:1px solid var(--pri-rule);gap:24px;cursor:none;position:relative;overflow:hidden;transition:background .3s; }
        .pri-row::before { content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--pri-gold);transform:scaleY(0);transition:transform .4s cubic-bezier(.16,1,.3,1);transform-origin:bottom; }
        .pri-row:hover::before,.pri-row.selected::before { transform:scaleY(1); }
        .pri-row:hover,.pri-row.selected { background:oklch(0.12 0.01 72 / 0.8); }
        .pri-row.hdr { background:oklch(0.11 0.005 72);cursor:default;padding:18px 48px; }
        .pri-row.hdr:hover { background:oklch(0.11 0.005 72); }
        .pri-row.hdr:hover::before { transform:scaleY(0); }
        .pri-row-idx { font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:var(--pri-gold);opacity:.7; }
        .pri-row-name { font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.02em;color:var(--pri-ink);line-height:1;margin-bottom:4px; }
        .pri-row-sub { font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:var(--pri-ink-dim); }
        .pri-cell { font-size:13px;color:var(--pri-ink); }
        .pri-cell .lbl { font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--pri-ink-dim);margin-bottom:4px; }
        .pri-cell.hdr { font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:var(--pri-ink-dim); }
        .pri-badge { display:inline-block;padding:4px 12px;font-size:9px;letter-spacing:.2em;text-transform:uppercase;border:1px solid; }
        .pri-badge-live { border-color:var(--pri-moss);color:var(--pri-moss); }
        .pri-badge-ended { border-color:var(--pri-rule);color:var(--pri-ink-dim); }
        .pri-badge-sold { border-color:var(--pri-copper);color:var(--pri-copper); }

        .pri-buy-panel { padding:48px 40px;position:sticky;top:0;max-height:100vh;overflow-y:auto; }
        .pri-buy-lbl { font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--pri-ink-dim);margin-bottom:32px; }
        .pri-buy-name { font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.02em;color:var(--pri-gold);line-height:1;margin-bottom:8px; }
        .pri-buy-sub { font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--pri-ink-dim);margin-bottom:32px; }
        .pri-fill-head { display:flex;justify-content:space-between;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--pri-ink-dim);margin-bottom:8px; }
        .pri-fill-track { height:2px;background:var(--pri-rule);margin-bottom:28px; }
        .pri-fill-fill { height:100%;background:var(--pri-gold);transition:width .5s; }
        .pri-ibox { border:1px solid var(--pri-rule);padding:24px;margin-bottom:2px;transition:border-color .3s; }
        .pri-ibox:focus-within { border-color:var(--pri-gold); }
        .pri-ibox-lbl { display:flex;justify-content:space-between;font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:var(--pri-ink-dim);margin-bottom:12px; }
        .pri-ifield { width:100%;background:none;border:none;outline:none;font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--pri-ink);cursor:none; }
        .pri-ifield::placeholder { color:var(--pri-ink-dim); }
        .pri-ifield::-webkit-outer-spin-button,.pri-ifield::-webkit-inner-spin-button { -webkit-appearance:none; }
        .pri-itoken { font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--pri-ink-dim);margin-top:4px; }
        .pri-ireadonly { font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--pri-ink-dim); }
        .pri-bstats { border:1px solid var(--pri-rule);margin:24px 0; }
        .pri-bstat { display:flex;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--pri-rule);font-size:11px; }
        .pri-bstat:last-child { border-bottom:none; }
        .pri-bstat-k { color:var(--pri-ink-dim);letter-spacing:.1em;text-transform:uppercase;font-size:9px; }
        .pri-bstat-v { color:var(--pri-ink); }
        .pri-bstat-v.g { color:var(--pri-moss); }
        .pri-no-bond { padding:48px 40px;display:flex;align-items:center;justify-content:center;text-align:center;min-height:300px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--pri-ink-dim); }
        .pri-wallet-wrap { display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding-top:24px; }
        .pri-wallet-hint { font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--pri-ink-dim); }

        .pri-depth { height:50vh;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;border-top:1px solid var(--pri-rule);border-bottom:1px solid var(--pri-rule); }
        .pri-depth-quote { position:relative;z-index:2;text-align:center;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(20px,3vw,36px);font-weight:300;color:var(--pri-ink);opacity:.7;line-height:1.55;max-width:700px;pointer-events:none; }

        .pri-how { padding:140px 48px;border-bottom:1px solid var(--pri-rule); }
        .pri-how-header { display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:100px; }
        .pri-how-title { font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,7vw,88px);letter-spacing:-.01em;line-height:1; }
        .pri-how-note { max-width:300px;font-size:12px;color:var(--pri-ink-dim);line-height:1.8; }
        .pri-how-steps { display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:var(--pri-rule); }
        .pri-how-step { background:var(--pri-bg);padding:52px 40px;position:relative; }
        .pri-how-step-n { font-family:'Cormorant Garamond',serif;font-style:italic;font-size:80px;color:var(--pri-gold);opacity:.08;line-height:1;position:absolute;top:24px;right:32px; }
        .pri-how-step-t { font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.02em;color:var(--pri-ink);margin-bottom:20px;margin-top:8px; }
        .pri-how-step-d { font-size:12px;color:var(--pri-ink-dim);line-height:1.8; }

        .pri-footer { padding:48px;border-top:1px solid var(--pri-rule);display:flex;justify-content:space-between;align-items:center; }
        .pri-footer-logo { font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.2em; }
        .pri-footer-copy { font-size:10px;letter-spacing:.15em;color:var(--pri-ink-dim); }
        .pri-footer-links { display:flex;gap:28px;list-style:none;margin:0;padding:0; }
        .pri-footer-links a { font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--pri-ink-dim);text-decoration:none;transition:color .2s;cursor:none; }
        .pri-footer-links a:hover { color:var(--pri-ink); }
      `}</style>

      <div className="pri-root">
        <canvas id="pri-grain" ref={grainRef} />
        <div id="pri-dot" ref={dotRef} />
        <div id="pri-ring" ref={ringRef} />

        {/* Hero */}
        <section className="pri-hero">
          <canvas ref={heroBgRef} style={{ position:"absolute", inset:0, pointerEvents:"none" }} />
          <div className="pri-hero-left">
            <div className="pri-hero-eyebrow pri-reveal">§ Primary Market — Initial Offerings</div>
            <h1 className="pri-hero-title pri-reveal">FIRST<br /><span className="gold">DEPTH.</span></h1>
            <div className="pri-hero-rule" />
            <p className="pri-hero-desc pri-reveal">
              The primary market is where capital meets conviction. New instruments, first prices, verified issuers — before the world finds out.
            </p>
          </div>
          <div className="pri-hero-right">
            <div className="pri-stats-grid pri-reveal">
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
            <div className="pri-hero-cta pri-reveal">
              <a href="#offerings" className="pri-btn"><span>Browse Offerings</span></a>
              <a href="/manage/issue" className="pri-btn-ghost">Issue →</a>
            </div>
          </div>
        </section>

        {/* Offerings */}
        <section id="offerings">
          <div className="pri-offerings-header">
            <div className="pri-offerings-title pri-reveal">Open<br />Offerings.</div>
            <div className="pri-offerings-meta pri-reveal">
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
                      className={`pri-row pri-reveal${isSel ? " selected" : ""}`}
                      onClick={() => setSelected(bond)}
                      onMouseEnter={() => document.body.classList.add("pri-cursor-hover")}
                      onMouseLeave={() => document.body.classList.remove("pri-cursor-hover")}
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
          <p className="pri-depth-quote pri-reveal">
            "The first price is the truest price.<br />Before noise. Before narrative."
          </p>
        </section>

        {/* How It Works */}
        <section className="pri-how">
          <div className="pri-how-header">
            <div className="pri-how-title pri-reveal">How<br />It Works.</div>
            <p className="pri-how-note pri-reveal">Four steps from intent to instrument. The primary market is not a portal — it is a protocol.</p>
          </div>
          <div className="pri-how-steps">
            {[
              { n:"1", t:"SELECT", d:"Browse live offerings. Each bond shows face value, APY, maturity, and fill rate — all pulled directly from Solana." },
              { n:"2", t:"PAY",    d:"Enter the SOL amount. The interface computes the exact bond token quantity at face value. No slippage, no hidden fees." },
              { n:"3", t:"SETTLE", d:"Solana-native settlement — sub-second finality. Allocations are final and recorded on-chain immediately." },
              { n:"4", t:"HOLD",   d:"Your bond tokens accrue yield until maturity. Transfer them freely on the secondary market any time before then." },
            ].map(s => (
              <div key={s.n} className="pri-how-step pri-reveal">
                <div className="pri-how-step-n">{s.n}</div>
                <div className="pri-how-step-t">{s.t}</div>
                <div className="pri-how-step-d">{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
      </div>
    </>
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
