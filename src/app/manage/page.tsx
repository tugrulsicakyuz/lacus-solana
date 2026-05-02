"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Shield, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLacusProgram } from "@/hooks/useLacus";
import { useWallet } from "@solana/wallet-adapter-react";
import type { BondState } from "@/types/lacus";
import { toast } from "sonner";

interface Bond {
  id: number; issuer_name: string; symbol: string; apy: number; price_per_token: number;
  maturity_months: number; contract_address?: string; total_issue_size: number;
  bondId?: number; issuer?: string; source?: 'onchain' | 'supabase';
}

export default function ManagePage() {
  const { connected } = useWallet();
  const { fetchMyBonds, depositYield } = useLacusProgram();
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositingYield, setDepositingYield] = useState<number | null>(null);
  const [yieldAmounts, setYieldAmounts] = useState<Record<number, string>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const ringPos = useRef({ x: 0, y: 0 });
  const mousePos = useRef({ x: 0, y: 0 });


  // Grain canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const { width, height } = canvas;
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Custom cursor
  useEffect(() => {
    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    const onMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      dot.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
    };
    window.addEventListener("mousemove", onMove);

    let rafId: number;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      ringPos.current.x = lerp(ringPos.current.x, mousePos.current.x, 0.12);
      ringPos.current.y = lerp(ringPos.current.y, mousePos.current.y, 0.12);
      ring.style.transform = `translate(${ringPos.current.x - 20}px, ${ringPos.current.y - 20}px)`;
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    async function fetchBonds() {
      try {
        // Fetch from both on-chain and Supabase
        const [onChainBonds, supabaseResult] = await Promise.all([
          connected ? fetchMyBonds() : Promise.resolve([]),
          supabase.from("bonds").select("*").order("id", { ascending: false })
        ]);

        const { data: supabaseData, error } = supabaseResult;

        if (error) {
          console.error("Failed to fetch Supabase bonds:", error);
        }

        // Merge on-chain and Supabase bonds
        const mergedBonds: Bond[] = [];
        const seenBondIds = new Set<number>();

        // Add on-chain bonds first
        if (onChainBonds && onChainBonds.length > 0) {
          onChainBonds.forEach((bond: BondState) => {
            const bondId = Number(bond.bondId);
            seenBondIds.add(bondId);

            // Try to find matching Supabase metadata
            const supabaseMeta = supabaseData?.find((s: { id: number }) => s.id === bondId);

            const faceValueSOL = Number(bond.faceValue) / 1_000_000_000;
            const maxSupplyNum = Number(bond.maxSupply);
            const totalRaise = faceValueSOL * maxSupplyNum;

            // Calculate maturity in months
            const now = Math.floor(Date.now() / 1000);
            const maturitySeconds = Number(bond.maturityTimestamp) - now;
            const maturityMonths = Math.max(0, Math.round(maturitySeconds / (30 * 24 * 60 * 60)));

            mergedBonds.push({
              id: bondId,
              bondId,
              issuer: bond.issuer.toString(),
              issuer_name: supabaseMeta?.issuer_name || bond.issuer.toString().slice(0, 8) + '...',
              symbol: bond.symbol || supabaseMeta?.symbol || `BOND-${bondId}`,
              apy: bond.couponRateBps / 100,
              price_per_token: faceValueSOL,
              maturity_months: maturityMonths,
              total_issue_size: totalRaise,
              contract_address: bond.issuer.toString(),
              source: 'onchain',
            });
          });
        }

        // Add Supabase-only bonds (not found on-chain)
        if (supabaseData) {
          supabaseData.forEach((bond: any) => {
            if (!seenBondIds.has(bond.id)) {
              mergedBonds.push({
                ...bond,
                source: 'supabase',
              });
            }
          });
        }

        setBonds(mergedBonds);
      } catch (err) {
        console.error("Failed to fetch bonds:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBonds();
  }, [connected, fetchMyBonds]);

  const handleDepositYield = async (bondId: number, amount: number) => {
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setDepositingYield(bondId);
    try {
      // Convert SOL to lamports
      const amountInLamports = Math.floor(amount * 1_000_000_000);
      const tx = await depositYield(bondId, amountInLamports);

      toast.success('Yield deposited successfully!', {
        description: `Deposited ${amount} SOL`,
      });

      // Clear the input
      setYieldAmounts(prev => ({ ...prev, [bondId]: '' }));
    } catch (error: any) {
      console.error('Deposit yield failed:', error);
      toast.error('Failed to deposit yield', {
        description: error?.message || 'Unknown error',
      });
    } finally {
      setDepositingYield(null);
    }
  };

  return (
    <>
      <style>{`
        .mgmt-root {
          --mgmt-bg: #0e0508;
          --mgmt-ink: #f5e8ec;
          --mgmt-ink-dim: rgba(245,232,236,0.4);
          --mgmt-rose: #fb7185;
          --mgmt-rule: rgba(245,232,236,0.09);
          min-height: 100vh;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.14 0.12 10) 0%, #0e0508 60%);
          color: var(--mgmt-ink);
          font-family: 'DM Mono', monospace;
          cursor: none;
          overflow-x: hidden;
        }

        .mgmt-cursor-dot {
          position: fixed;
          top: 0; left: 0;
          width: 8px; height: 8px;
          background: #fb7185;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: difference;
          will-change: transform;
        }

        .mgmt-cursor-ring {
          position: fixed;
          top: 0; left: 0;
          width: 40px; height: 40px;
          border: 1px solid rgba(251,113,133,0.6);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9998;
          mix-blend-mode: difference;
          will-change: transform;
          transition: width 0.2s, height 0.2s;
        }

        .mgmt-grain {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 9000;
          opacity: 0.04;
        }

        .mgmt-hero {
          padding: 120px 48px 60px;
          border-bottom: 1px solid var(--mgmt-rule);
          max-width: 1440px;
          margin: 0 auto;
        }

        .mgmt-eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--mgmt-ink-dim);
          margin-bottom: 20px;
        }

        .mgmt-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(80px, 12vw, 160px);
          line-height: 0.9;
          letter-spacing: 0.01em;
          margin: 0 0 28px;
        }

        .mgmt-subtitle {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: var(--mgmt-ink-dim);
          letter-spacing: 0.05em;
          max-width: 480px;
        }

        .mgmt-body {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 48px 80px;
        }

        .mgmt-issue-card {
          display: block;
          margin-top: 48px;
          background: rgba(251,113,133,0.05);
          border: 1px solid rgba(251,113,133,0.2);
          padding: 28px 32px;
          text-decoration: none;
          transition: background 0.3s, border-color 0.3s;
          cursor: none;
        }

        .mgmt-issue-card:hover {
          background: rgba(251,113,133,0.1);
          border-color: rgba(251,113,133,0.5);
        }

        .mgmt-issue-card:hover .mgmt-issue-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        .mgmt-issue-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mgmt-issue-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .mgmt-issue-icon {
          width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(251,113,133,0.3);
        }

        .mgmt-issue-label {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 0.05em;
          color: var(--mgmt-ink);
        }

        .mgmt-issue-desc {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--mgmt-ink-dim);
          letter-spacing: 0.1em;
          margin-top: 4px;
        }

        .mgmt-issue-arrow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: var(--mgmt-rose);
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.3s, transform 0.3s;
        }

        .mgmt-table-header {
          padding: 60px 0 24px;
          display: flex;
          align-items: baseline;
          gap: 16px;
        }

        .mgmt-table-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 40px;
          letter-spacing: 0.03em;
          color: var(--mgmt-ink);
        }

        .mgmt-table-count {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--mgmt-ink-dim);
          letter-spacing: 0.2em;
        }

        .mgmt-table-wrap {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--mgmt-rule);
          overflow-x: auto;
        }

        .mgmt-table {
          width: 100%;
          border-collapse: collapse;
        }

        .mgmt-table thead tr {
          border-bottom: 1px solid var(--mgmt-rule);
        }

        .mgmt-table th {
          padding: 16px 24px;
          text-align: left;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--mgmt-ink-dim);
          font-weight: 400;
          white-space: nowrap;
        }

        .mgmt-table tbody tr {
          border-bottom: 1px solid var(--mgmt-rule);
          transition: background 0.2s;
        }

        .mgmt-table tbody tr:last-child {
          border-bottom: none;
        }

        .mgmt-table tbody tr:hover {
          background: rgba(251,113,133,0.03);
        }

        .mgmt-table td {
          padding: 20px 24px;
          vertical-align: middle;
        }

        .mgmt-bond-symbol {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 0.05em;
          color: var(--mgmt-ink);
          text-decoration: none;
          transition: color 0.2s;
          cursor: none;
        }

        .mgmt-bond-symbol:hover {
          color: var(--mgmt-rose);
        }

        .mgmt-cell-dim {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--mgmt-ink-dim);
          letter-spacing: 0.05em;
        }

        .mgmt-cell-ink {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--mgmt-ink);
          letter-spacing: 0.05em;
        }

        .mgmt-apy {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--mgmt-rose);
          letter-spacing: 0.05em;
        }

        .mgmt-input {
          width: 88px;
          background: rgba(14,5,8,0.8);
          border: 1px solid var(--mgmt-rule);
          padding: 6px 10px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--mgmt-ink);
          outline: none;
          transition: border-color 0.2s;
          cursor: none;
        }

        .mgmt-input::placeholder {
          color: var(--mgmt-ink-dim);
        }

        .mgmt-input:focus {
          border-color: var(--mgmt-rose);
          box-shadow: 0 0 0 1px rgba(251,113,133,0.2);
        }

        .mgmt-pay-btn {
          border: 1px solid var(--mgmt-rose);
          color: var(--mgmt-ink);
          padding: 6px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          background: none;
          cursor: none;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .mgmt-pay-btn:hover:not(:disabled) {
          background: var(--mgmt-rose);
          color: #0e0508;
        }

        .mgmt-pay-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .mgmt-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 120px 48px;
          text-align: center;
          border: 1px solid var(--mgmt-rule);
          background: rgba(255,255,255,0.01);
        }

        .mgmt-empty-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 60px;
          letter-spacing: 0.03em;
          color: var(--mgmt-ink);
          margin-bottom: 16px;
        }

        .mgmt-empty-sub {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--mgmt-ink-dim);
          letter-spacing: 0.1em;
          margin-bottom: 40px;
        }

        .mgmt-empty-cta {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--mgmt-rose);
          border: 1px solid rgba(251,113,133,0.4);
          padding: 12px 28px;
          text-decoration: none;
          transition: background 0.3s, border-color 0.3s;
          cursor: none;
        }

        .mgmt-empty-cta:hover {
          background: rgba(251,113,133,0.1);
          border-color: var(--mgmt-rose);
        }

        .mgmt-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 80px 48px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: var(--mgmt-ink-dim);
          border: 1px solid var(--mgmt-rule);
        }

        .mgmt-dash {
          color: var(--mgmt-ink-dim);
          font-family: 'DM Mono', monospace;
          font-size: 11px;
        }

        @keyframes mgmt-spin {
          to { transform: rotate(360deg); }
        }

        .mgmt-spinner {
          animation: mgmt-spin 1s linear infinite;
          color: var(--mgmt-rose);
        }
      `}</style>

      <div className="mgmt-root">

        {/* Custom cursor */}
        <div ref={cursorDotRef} className="mgmt-cursor-dot" />
        <div ref={cursorRingRef} className="mgmt-cursor-ring" />

        {/* Grain overlay */}
        <canvas ref={canvasRef} className="mgmt-grain" />

        {/* Hero */}
        <div className="mgmt-hero">
          <p className="mgmt-eyebrow">§ Issuer — Bond Management</p>
          <h1 className="mgmt-title">
            MAN<span style={{ color: 'var(--mgmt-rose)' }}>AGE.</span>
          </h1>
          <p className="mgmt-subtitle">View and manage your issued instruments on Solana.</p>
        </div>

        <div className="mgmt-body">

          {/* Issue New Bond card */}
          <Link href="/manage/issue" className="mgmt-issue-card">
            <div className="mgmt-issue-inner">
              <div className="mgmt-issue-left">
                <div className="mgmt-issue-icon">
                  <TrendingUp size={18} color="#fb7185" />
                </div>
                <div>
                  <div className="mgmt-issue-label">ISSUE NEW BOND</div>
                  <div className="mgmt-issue-desc">Deploy a tokenized instrument to Solana devnet</div>
                </div>
              </div>
              <div className="mgmt-issue-arrow">
                <span>GET STARTED</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </Link>

          {/* Table section */}
          <div className="mgmt-table-header">
            <span className="mgmt-table-title">ACTIVE INSTRUMENTS</span>
            {!loading && bonds.length > 0 && (
              <span className="mgmt-table-count">{bonds.length} TOTAL</span>
            )}
          </div>

          {loading ? (
            <div className="mgmt-loading">
              <Loader2 size={14} className="mgmt-spinner" />
              <span>LOADING INSTRUMENTS...</span>
            </div>
          ) : bonds.length === 0 ? (
            <div className="mgmt-empty">
              <Shield size={32} style={{ color: 'rgba(245,232,236,0.15)', marginBottom: 32 }} />
              <div className="mgmt-empty-title">NO INSTRUMENTS YET</div>
              <p className="mgmt-empty-sub">No bonds have been issued on Solana devnet</p>
              <Link href="/manage/issue" className="mgmt-empty-cta">Issue Your First Bond</Link>
            </div>
          ) : (
            <div className="mgmt-table-wrap">
              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>Bond</th>
                    <th>Issuer</th>
                    <th>APY</th>
                    <th>Price</th>
                    <th>Maturity</th>
                    <th>Total Size</th>
                    <th>Pay Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {bonds.map((bond) => (
                    <tr key={bond.id}>
                      <td>
                        <Link href={`/bond/${bond.symbol}`} className="mgmt-bond-symbol">
                          {bond.symbol}
                        </Link>
                      </td>
                      <td>
                        <span className="mgmt-cell-dim">{bond.issuer_name}</span>
                      </td>
                      <td>
                        <span className="mgmt-apy">{bond.apy}%</span>
                      </td>
                      <td>
                        <span className="mgmt-cell-ink">{bond.price_per_token.toFixed(4)} SOL</span>
                      </td>
                      <td>
                        <span className="mgmt-cell-dim">{bond.maturity_months} mo</span>
                      </td>
                      <td>
                        <span className="mgmt-cell-ink">{bond.total_issue_size.toFixed(4)} SOL</span>
                      </td>
                      <td>
                        {bond.source === 'onchain' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="number"
                              placeholder="SOL"
                              value={yieldAmounts[bond.bondId!] || ''}
                              onChange={(e) => setYieldAmounts(prev => ({ ...prev, [bond.bondId!]: e.target.value }))}
                              className="mgmt-input"
                            />
                            <button
                              onClick={() => handleDepositYield(bond.bondId!, parseFloat(yieldAmounts[bond.bondId!] || '0'))}
                              disabled={depositingYield === bond.bondId}
                              className="mgmt-pay-btn"
                            >
                              {depositingYield === bond.bondId
                                ? <Loader2 size={11} className="mgmt-spinner" />
                                : 'PAY'}
                            </button>
                          </div>
                        ) : (
                          <span className="mgmt-dash">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
