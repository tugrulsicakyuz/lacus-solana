'use client';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useLacusProgram } from '@/hooks/useLacus';
import { useEffect, useState, useRef } from 'react';
import type { BondState } from '@/types/lacus';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  const { program, fetchPortfolioBonds, fetchMyBonds, claimYield, redeemBond, depositYield } = useLacusProgram();
  const [holdings, setHoldings] = useState<{ bond: BondState; balance: number; lastYieldSnapshot: number }[]>([]);
  const [issuedBonds, setIssuedBonds] = useState<BondState[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingClaim, setProcessingClaim] = useState<number | null>(null);
  const [processingRedeem, setProcessingRedeem] = useState<number | null>(null);
  const [processingDeposit, setProcessingDeposit] = useState<number | null>(null);
  const [yieldAmounts, setYieldAmounts] = useState<Record<number, string>>({});

  const grainRef = useRef<HTMLCanvasElement>(null);
  const dotRef   = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);

  // ── Grain canvas
  useEffect(() => {
    const c = grainRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let tid: ReturnType<typeof setTimeout>;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      const d = ctx.createImageData(c.width, c.height), b = d.data;
      for (let i = 0; i < b.length; i += 4) { const v = Math.random() * 255 | 0; b[i] = b[i+1] = b[i+2] = v; b[i+3] = 255; }
      ctx.putImageData(d, 0, 0); tid = setTimeout(() => requestAnimationFrame(draw), 80);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); clearTimeout(tid); };
  }, []);

  // ── Custom cursor lerp
  useEffect(() => {
    const dot = dotRef.current, ring = ringRef.current;
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0, rafId: number;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx - 4}px,${my - 4}px,0)`;
    };
    const loop = () => {
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
      ring.style.transform = `translate3d(${rx - 20}px,${ry - 20}px,0)`;
      rafId = requestAnimationFrame(loop);
    };
    document.addEventListener('mousemove', onMove);
    loop();
    return () => { document.removeEventListener('mousemove', onMove); cancelAnimationFrame(rafId); };
  }, []);

  // ── Data fetching
  const fetchData = async () => {
    if (!program || !connected || !publicKey) {
      setHoldings([]);
      setIssuedBonds([]);
      return;
    }
    setLoading(true);
    try {
      const [portfolioData, issuedData] = await Promise.all([
        fetchPortfolioBonds(),
        fetchMyBonds(),
      ]);
      setHoldings(portfolioData);
      setIssuedBonds(issuedData);
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (program && connected && publicKey) {
      fetchData();
    } else {
      setHoldings([]);
      setIssuedBonds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, connected, publicKey]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatSOL = (lamports: number) => (lamports / 1e9).toFixed(4);

  const handleClaimYield = async (bondId: number) => {
    setProcessingClaim(bondId);
    try {
      await claimYield(bondId);
      toast.success('Yield claimed!');
      await fetchData();
    } catch (error: any) {
      toast.error('Failed to claim yield', { description: error?.message || 'Unknown error' });
    } finally {
      setProcessingClaim(null);
    }
  };

  const handleRedeemBond = async (bondId: number) => {
    setProcessingRedeem(bondId);
    try {
      await redeemBond(bondId);
      toast.success('Bond redeemed! Principal returned.');
      await fetchData();
    } catch (error: any) {
      toast.error('Failed to redeem bond', { description: error?.message || 'Unknown error' });
    } finally {
      setProcessingRedeem(null);
    }
  };

  const handleDepositYield = async (bondId: number) => {
    const amount = parseFloat(yieldAmounts[bondId] || '0');
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setProcessingDeposit(bondId);
    try {
      const amountInLamports = Math.floor(amount * 1_000_000_000);
      await depositYield(bondId, amountInLamports);
      toast.success('Yield deposited successfully!', { description: `Deposited ${amount} SOL` });
      setYieldAmounts(prev => ({ ...prev, [bondId]: '' }));
      await fetchData();
    } catch (error: any) {
      toast.error('Failed to deposit yield', { description: error?.message || 'Unknown error' });
    } finally {
      setProcessingDeposit(null);
    }
  };

  // ── Not connected state
  if (!connected) {
    return (
      <div className="dash-root">
        <style>{`
          .dash-root {
            --dash-bg: #080610;
            --dash-ink: #ede8ff;
            --dash-ink-dim: rgba(237,232,255,0.4);
            --dash-violet: #a78bfa;
            --dash-rule: rgba(237,232,255,0.09);
            min-height: 100vh;
            background: radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.16 0.12 280) 0%, #080610 60%);
            color: var(--dash-ink);
            font-family: 'DM Mono', monospace;
            cursor: none;
            overflow-x: hidden;
          }
          #dash-dot {
            position: fixed; top: 0; left: 0; width: 8px; height: 8px; border-radius: 50%;
            background: var(--dash-violet); pointer-events: none; z-index: 9999;
            will-change: transform; mix-blend-mode: difference;
          }
          #dash-ring {
            position: fixed; top: 0; left: 0; width: 40px; height: 40px; border-radius: 50%;
            border: 1px solid var(--dash-violet); pointer-events: none; z-index: 9998;
            will-change: transform; opacity: 0.5;
          }
          .dash-grain {
            position: fixed; inset: 0; z-index: 9000; opacity: 0.04; pointer-events: none;
          }
          .dash-nc-center {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            min-height: 100vh; text-align: center; padding: 40px;
          }
          .dash-nc-eyebrow {
            font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.25em;
            text-transform: uppercase; color: var(--dash-ink-dim); margin-bottom: 24px;
          }
          .dash-nc-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: clamp(72px, 12vw, 140px);
            line-height: 0.92; letter-spacing: 0.02em; margin-bottom: 24px;
          }
          .dash-nc-sub {
            font-size: 13px; color: var(--dash-ink-dim); margin-bottom: 40px; max-width: 320px;
          }
          .dash-violet-btn {
            display: inline-flex; align-items: center; justify-content: center;
            border: 1px solid var(--dash-violet); color: var(--dash-violet);
            background: transparent; padding: 12px 32px; font-family: 'DM Mono', monospace;
            font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
            cursor: none; transition: background 0.2s, color 0.2s; text-decoration: none;
          }
          .dash-violet-btn:hover { background: var(--dash-violet); color: #080610; }
        `}</style>
        <canvas ref={grainRef} className="dash-grain" />
        <div ref={dotRef} id="dash-dot" />
        <div ref={ringRef} id="dash-ring" />
        <div className="dash-nc-center">
          <p className="dash-nc-eyebrow">§ Solana — Portfolio Layer</p>
          <h1 className="dash-nc-title">
            PORT<span style={{ color: 'var(--dash-violet)' }}>FOLIO</span>
          </h1>
          <p className="dash-nc-sub">Connect your Solana wallet to view your bond holdings and issued instruments.</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  // ── Connected state
  return (
    <div className="dash-root">
      <style>{`
        .dash-root {
          --dash-bg: #080610;
          --dash-ink: #ede8ff;
          --dash-ink-dim: rgba(237,232,255,0.4);
          --dash-violet: #a78bfa;
          --dash-rule: rgba(237,232,255,0.09);
          min-height: 100vh;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.16 0.12 280) 0%, #080610 60%);
          color: var(--dash-ink);
          font-family: 'DM Mono', monospace;
          cursor: none;
          overflow-x: hidden;
        }
        #dash-dot {
          position: fixed; top: 0; left: 0; width: 8px; height: 8px; border-radius: 50%;
          background: var(--dash-violet); pointer-events: none; z-index: 9999;
          will-change: transform; mix-blend-mode: difference;
        }
        #dash-ring {
          position: fixed; top: 0; left: 0; width: 40px; height: 40px; border-radius: 50%;
          border: 1px solid var(--dash-violet); pointer-events: none; z-index: 9998;
          will-change: transform; opacity: 0.5;
        }
        .dash-grain {
          position: fixed; inset: 0; z-index: 9000; opacity: 0.04; pointer-events: none;
        }

        /* Hero */
        .dash-hero {
          padding: 120px 48px 80px;
          border-bottom: 1px solid var(--dash-rule);
          max-width: 1200px; margin: 0 auto;
        }
        .dash-eyebrow {
          font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.25em;
          text-transform: uppercase; color: var(--dash-ink-dim); margin-bottom: 20px;
        }
        .dash-hero-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(80px, 12vw, 160px);
          line-height: 0.9; letter-spacing: 0.02em; margin-bottom: 20px;
        }
        .dash-wallet-addr {
          font-size: 11px; letter-spacing: 0.15em; color: var(--dash-ink-dim);
        }

        /* Body */
        .dash-body { max-width: 1200px; margin: 0 auto; padding: 64px 48px; }

        /* Section labels */
        .dash-section-label {
          font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.04em;
          color: var(--dash-ink); margin-bottom: 32px;
          border-bottom: 1px solid var(--dash-rule); padding-bottom: 16px;
        }

        /* Grid */
        .dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }

        /* Card */
        .dash-card {
          background: rgba(167,139,250,0.04); border: 1px solid var(--dash-rule);
          padding: 32px; transition: border-color 0.25s;
        }
        .dash-card:hover { border-color: rgba(167,139,250,0.35); }

        /* Card bond name */
        .dash-card-name {
          font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 0.04em;
          color: var(--dash-ink); margin-bottom: 4px;
        }
        .dash-card-symbol {
          font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--dash-ink-dim); margin-bottom: 24px;
        }
        .dash-card-issuer-badge {
          display: inline-block; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase;
          border: 1px solid rgba(167,139,250,0.4); color: var(--dash-violet);
          padding: 3px 10px; margin-bottom: 16px;
        }

        /* Stats */
        .dash-stat-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; border-bottom: 1px solid var(--dash-rule);
        }
        .dash-stat-row:last-child { border-bottom: none; }
        .dash-stat-label {
          font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--dash-ink-dim);
        }
        .dash-stat-value { font-size: 13px; color: var(--dash-ink); font-family: 'DM Mono', monospace; }
        .dash-stat-value-violet { font-size: 13px; color: var(--dash-violet); font-family: 'DM Mono', monospace; font-weight: 500; }

        /* Progress bar */
        .dash-progress-track {
          height: 2px; background: rgba(237,232,255,0.08); margin-top: 8px; overflow: hidden;
        }
        .dash-progress-fill { height: 100%; background: var(--dash-violet); transition: width 0.4s; }
        .dash-progress-label {
          font-size: 9px; color: var(--dash-ink-dim); letter-spacing: 0.12em; margin-top: 6px;
        }

        /* Divider */
        .dash-card-divider { border: none; border-top: 1px solid var(--dash-rule); margin: 24px 0; }

        /* Buttons */
        .dash-btn-violet {
          display: flex; align-items: center; justify-content: center; width: 100%;
          border: 1px solid var(--dash-violet); color: var(--dash-violet); background: transparent;
          padding: 10px 20px; font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.15em; text-transform: uppercase; cursor: none;
          transition: background 0.2s, color 0.2s; margin-bottom: 8px;
        }
        .dash-btn-violet:hover:not(:disabled) { background: var(--dash-violet); color: #080610; }
        .dash-btn-violet:disabled { opacity: 0.35; cursor: not-allowed; }

        .dash-btn-ghost {
          display: flex; align-items: center; justify-content: center; width: 100%;
          border: 1px solid var(--dash-rule); color: var(--dash-ink-dim); background: transparent;
          padding: 10px 20px; font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.15em; text-transform: uppercase; cursor: none;
          transition: border-color 0.2s, color 0.2s; margin-bottom: 8px;
        }
        .dash-btn-ghost:hover:not(:disabled) { border-color: var(--dash-violet); color: var(--dash-ink); }
        .dash-btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }

        /* Deposit row */
        .dash-deposit-row { display: flex; gap: 8px; }
        .dash-input {
          flex: 1; background: rgba(237,232,255,0.04); border: 1px solid var(--dash-rule);
          color: var(--dash-ink); font-family: 'DM Mono', monospace; font-size: 12px;
          padding: 10px 14px; outline: none; transition: border-color 0.2s;
        }
        .dash-input::placeholder { color: var(--dash-ink-dim); }
        .dash-input:focus { border-color: var(--dash-violet); }
        .dash-btn-violet-sm {
          border: 1px solid var(--dash-violet); color: var(--dash-violet); background: transparent;
          padding: 10px 16px; font-family: 'DM Mono', monospace; font-size: 10px;
          letter-spacing: 0.15em; text-transform: uppercase; cursor: none; white-space: nowrap;
          transition: background 0.2s, color 0.2s; display: flex; align-items: center; gap: 6px;
        }
        .dash-btn-violet-sm:hover:not(:disabled) { background: var(--dash-violet); color: #080610; }
        .dash-btn-violet-sm:disabled { opacity: 0.35; cursor: not-allowed; }

        /* Notice */
        .dash-notice-warn {
          font-size: 10px; letter-spacing: 0.1em; color: rgba(251,191,36,0.7);
          border: 1px solid rgba(251,191,36,0.15); padding: 10px 14px; text-align: center;
          margin-bottom: 8px;
        }

        /* Empty state */
        .dash-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 40px; text-align: center; border: 1px solid var(--dash-rule);
        }
        .dash-empty-dash {
          font-family: 'Bebas Neue', sans-serif; font-size: 80px; color: var(--dash-rule);
          line-height: 1; margin-bottom: 16px;
        }
        .dash-empty-label {
          font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--dash-ink-dim); margin-bottom: 32px;
        }
        .dash-empty-cta {
          border: 1px solid var(--dash-violet); color: var(--dash-violet); background: transparent;
          padding: 12px 32px; font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.2em; text-transform: uppercase; cursor: none;
          transition: background 0.2s, color 0.2s; text-decoration: none; display: inline-block;
        }
        .dash-empty-cta:hover { background: var(--dash-violet); color: #080610; }

        /* Loading */
        .dash-loading {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 80px 40px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--dash-ink-dim);
        }

        /* Section gap */
        .dash-section { margin-bottom: 80px; }

        /* Not-connected state */
        .dash-nc-center {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 100vh; text-align: center; padding: 40px;
        }
        .dash-nc-eyebrow {
          font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.25em;
          text-transform: uppercase; color: var(--dash-ink-dim); margin-bottom: 24px;
        }
        .dash-nc-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(72px, 12vw, 140px);
          line-height: 0.92; letter-spacing: 0.02em; margin-bottom: 24px;
        }
        .dash-nc-sub {
          font-size: 13px; color: var(--dash-ink-dim); margin-bottom: 40px; max-width: 320px;
        }
        .dash-violet-btn {
          display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--dash-violet); color: var(--dash-violet);
          background: transparent; padding: 12px 32px; font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          cursor: none; transition: background 0.2s, color 0.2s; text-decoration: none;
        }
        .dash-violet-btn:hover { background: var(--dash-violet); color: #080610; }

        @media (max-width: 768px) {
          .dash-hero { padding: 100px 24px 60px; }
          .dash-body { padding: 48px 24px; }
          .dash-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <canvas ref={grainRef} className="dash-grain" />
      <div ref={dotRef} id="dash-dot" />
      <div ref={ringRef} id="dash-ring" />

      {/* Hero */}
      <header className="dash-hero">
        <p className="dash-eyebrow">§ Solana — Portfolio Layer</p>
        <h1 className="dash-hero-title">
          PORT<span style={{ color: 'var(--dash-violet)' }}>FOLIO</span>
        </h1>
        <p className="dash-wallet-addr">
          {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
        </p>
      </header>

      {/* Body */}
      <main className="dash-body">
        {loading ? (
          <div className="dash-loading">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--dash-violet)' }} />
            Fetching instruments...
          </div>
        ) : (
          <>
            {/* Bond Holdings */}
            <section className="dash-section">
              <h2 className="dash-section-label">Bond Holdings</h2>

              {holdings.length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-dash">—</div>
                  <p className="dash-empty-label">No bond holdings yet</p>
                  <Link href="/launchpad" className="dash-empty-cta">Browse Bonds</Link>
                </div>
              ) : (
                <div className="dash-grid">
                  {holdings.map(({ bond, balance, lastYieldSnapshot }, index) => {
                    const faceValueSOL  = Number(bond.faceValue) / 1e9;
                    const totalValueSOL = faceValueSOL * balance;
                    const couponRate    = (bond.couponRateBps / 100).toFixed(2);
                    const isIssuer      = bond.issuer.toString() === publicKey?.toString();
                    const bondId        = Number(bond.bondId);
                    const now           = Math.floor(Date.now() / 1000);
                    const isMatured     = bond.isMatured || Number(bond.maturityTimestamp) <= now;
                    const totalYieldDeposited = Number(bond.totalYieldDeposited);
                    const hasClaimableYield   = totalYieldDeposited > lastYieldSnapshot;
                    const hasPrincipal        = bond.principalDeposited;

                    return (
                      <div key={index} className="dash-card">
                        {isIssuer && <div className="dash-card-issuer-badge">Issuer</div>}
                        <div className="dash-card-name">{bond.name}</div>
                        <div className="dash-card-symbol">{bond.symbol}</div>

                        <div style={{ marginBottom: '24px' }}>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Balance</span>
                            <span className="dash-stat-value">{balance.toLocaleString()} tokens</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Face Value</span>
                            <span className="dash-stat-value">{formatSOL(Number(bond.faceValue))} SOL</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Total Value</span>
                            <span className="dash-stat-value-violet">{totalValueSOL.toFixed(4)} SOL</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Coupon Rate</span>
                            <span className="dash-stat-value">{couponRate}%</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Maturity</span>
                            <span className="dash-stat-value">{formatDate(Number(bond.maturityTimestamp))}</span>
                          </div>
                        </div>

                        <hr className="dash-card-divider" />

                        <button
                          onClick={() => handleClaimYield(bondId)}
                          disabled={processingClaim === bondId || !hasClaimableYield}
                          title={
                            !hasClaimableYield
                              ? totalYieldDeposited === 0
                                ? 'No yield has been deposited yet'
                                : 'No new yield since your last claim'
                              : undefined
                          }
                          className="dash-btn-violet"
                        >
                          {processingClaim === bondId ? (
                            <><Loader2 size={12} className="animate-spin" style={{ marginRight: 8 }} />Claiming...</>
                          ) : hasClaimableYield ? (
                            'Claim Yield'
                          ) : totalYieldDeposited === 0 ? (
                            'No Yield Yet'
                          ) : (
                            'Yield Up to Date'
                          )}
                        </button>

                        {isMatured && hasPrincipal && (
                          <button
                            onClick={() => handleRedeemBond(bondId)}
                            disabled={processingRedeem === bondId}
                            className="dash-btn-ghost"
                          >
                            {processingRedeem === bondId ? (
                              <><Loader2 size={12} className="animate-spin" style={{ marginRight: 8 }} />Redeeming...</>
                            ) : (
                              'Redeem Bond'
                            )}
                          </button>
                        )}

                        {isMatured && !hasPrincipal && (
                          <div className="dash-notice-warn">
                            Awaiting principal deposit from issuer
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Bonds Issued */}
            {issuedBonds.length > 0 && (
              <section className="dash-section">
                <h2 className="dash-section-label">Bonds Issued</h2>
                <div className="dash-grid">
                  {issuedBonds.map((bond, index) => {
                    const soldPercentage =
                      Number(bond.maxSupply) > 0
                        ? (Number(bond.tokensSold) / Number(bond.maxSupply)) * 100
                        : 0;
                    const bondId = Number(bond.bondId);

                    return (
                      <div key={index} className="dash-card">
                        <div className="dash-card-name">{bond.name}</div>
                        <div className="dash-card-symbol">{bond.symbol}</div>

                        <div style={{ marginBottom: '24px' }}>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Tokens Sold</span>
                            <span className="dash-stat-value">
                              {Number(bond.tokensSold).toLocaleString()} / {Number(bond.maxSupply).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ padding: '8px 0' }}>
                            <div className="dash-progress-track">
                              <div
                                className="dash-progress-fill"
                                style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                              />
                            </div>
                            <p className="dash-progress-label">{soldPercentage.toFixed(1)}% sold</p>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Face Value</span>
                            <span className="dash-stat-value">{formatSOL(Number(bond.faceValue))} SOL</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Coupon Rate</span>
                            <span className="dash-stat-value">{(bond.couponRateBps / 100).toFixed(2)}%</span>
                          </div>
                        </div>

                        <hr className="dash-card-divider" />

                        <p className="dash-stat-label" style={{ marginBottom: 10 }}>Deposit Yield Payment</p>
                        <div className="dash-deposit-row">
                          <input
                            type="number"
                            placeholder="SOL amount"
                            value={yieldAmounts[bondId] || ''}
                            onChange={(e) =>
                              setYieldAmounts(prev => ({ ...prev, [bondId]: e.target.value }))
                            }
                            className="dash-input"
                          />
                          <button
                            onClick={() => handleDepositYield(bondId)}
                            disabled={processingDeposit === bondId}
                            className="dash-btn-violet-sm"
                          >
                            {processingDeposit === bondId ? (
                              <><Loader2 size={12} className="animate-spin" />Paying...</>
                            ) : (
                              'Pay Yield'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
