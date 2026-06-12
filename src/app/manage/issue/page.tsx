'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';
import { useLacusProgram } from '@/hooks/useLacus';
import { Loader2 } from 'lucide-react';

export default function IssueBondPage() {
  const { connected } = useWallet();
  const { issueBond } = useLacusProgram();

  // Form state — all original fields preserved
  const [bondName, setBondName] = useState('');
  const [bondSymbol, setBondSymbol] = useState('');
  const [faceValueSOL, setFaceValueSOL] = useState(0.1);
  const [couponRateBps, setCouponRateBps] = useState(800);
  const [maturityDate, setMaturityDate] = useState('');
  const [maxSupply, setMaxSupply] = useState(1000);
  const [loanAgreementUrl, setLoanAgreementUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(2);

  const heroBgRef = useRef<HTMLCanvasElement>(null);

  const totalRaise = faceValueSOL * maxSupply;
  const apyDisplay = couponRateBps / 100;

  // Hero bg canvas
  useEffect(() => {
    const c = heroBgRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let rafId: number;
    const resize = () => { c.width = c.offsetWidth || window.innerWidth; c.height = c.offsetHeight || window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const draw = (t: number) => {
      const W = c.width, H = c.height;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) {
        const x = W * 0.5 + Math.cos(i / 12 * Math.PI * 2 + t * 0.0003) * W * 0.3;
        const y = H * 0.5 + Math.sin(i / 12 * Math.PI * 2 + t * 0.0004) * H * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0, 1), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,75,35,0.12)';
        ctx.fill();
        if (i > 0) {
          const px = W * 0.5 + Math.cos((i - 1) / 12 * Math.PI * 2 + t * 0.0003) * W * 0.3;
          const py = H * 0.5 + Math.sin((i - 1) / 12 * Math.PI * 2 + t * 0.0004) * H * 0.3;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y);
          ctx.strokeStyle = 'rgba(220,75,35,0.04)';
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafId); };
  }, []);

  // Scroll reveal: GlobalInteractions'taki global .reveal observer'ı yönetir

  // ── Original bond issuance logic ──────────────────────────────────────────
  const handleIssueBond = async () => {
    if (!connected) { toast.error('Connect your wallet first'); return; }
    if (!bondName.trim()) { toast.error('Please enter a bond name'); return; }
    if (!bondSymbol.trim() || bondSymbol.length > 8) { toast.error('Bond symbol must be 1-8 characters'); return; }
    if (!maturityDate) { toast.error('Please select a maturity date'); return; }

    const MIN_SUPPLY = 100, MAX_SUPPLY = 1_000_000;
    if (maxSupply < MIN_SUPPLY) { toast.error('Invalid supply', { description: `Minimum supply is ${MIN_SUPPLY.toLocaleString()} tokens` }); return; }
    if (maxSupply > MAX_SUPPLY) { toast.error('Invalid supply', { description: `Maximum supply is ${MAX_SUPPLY.toLocaleString()} tokens` }); return; }
    if (couponRateBps <= 0) { toast.error('Invalid coupon rate', { description: 'Coupon rate (APY) must be greater than 0' }); return; }
    if (faceValueSOL <= 0) { toast.error('Invalid face value', { description: 'Face value must be greater than 0 SOL' }); return; }

    const maturityTimestamp = Math.floor(new Date(maturityDate).getTime() / 1000);
    if (maturityTimestamp <= Math.floor(Date.now() / 1000)) { toast.error('Maturity date must be in the future'); return; }

    setIsLoading(true);
    try {
      const hashSource = loanAgreementUrl.trim() || 'lacus-bond';
      const msgBuffer = new TextEncoder().encode(hashSource);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer as BufferSource);
      const loanAgreementHash = new Uint8Array(hashBuffer);

      const result = await issueBond({
        name: bondName,
        symbol: bondSymbol,
        faceValue: Math.round(faceValueSOL * 1_000_000_000),
        couponRateBps,
        maturityTimestamp,
        maxSupply,
        loanAgreementHash,
      });

      toast.success('Bond issued on Solana!', {
        description: `Bond ID: ${result.bondId} | TX: ${result.tx.slice(0, 8)}...`,
        action: {
          label: 'View on Explorer',
          onClick: () => window.open('https://explorer.solana.com/tx/' + result.tx + '?cluster=devnet', '_blank'),
        },
      });

      setBondName(''); setBondSymbol(''); setFaceValueSOL(0.1);
      setCouponRateBps(800); setMaxSupply(1000); setLoanAgreementUrl(''); setMaturityDate('');
      setCurrentStep(2);
    } catch (err) {
      console.error('issueBond error:', err);
      const description = err instanceof Error ? err.message : String(err);
      toast.error('Failed to issue bond', { description });
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid var(--iss-rule)',
    padding: '16px 0',
    fontFamily: "var(--font-dm-mono)",
    fontSize: '15px',
    color: 'var(--iss-ink)',
    outline: 'none',
    transition: 'border-color .3s',
    cursor: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '9px',
    letterSpacing: '.3em',
    textTransform: 'uppercase',
    color: 'var(--iss-ink-dim)',
    marginBottom: '12px',
    display: 'block',
  };

  return (
      <div className="iss-root">

        {/* Hero */}
        <section className="iss-hero">
          <canvas ref={heroBgRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
          <div className="iss-hero-left">
            <div className="iss-hero-eyebrow reveal">§ Issuance — Originate on Lacus</div>
            <h1 className="iss-hero-title reveal">IS<span className="gold">SUE.</span></h1>
            <div className="iss-hero-rule" />
            <p className="iss-hero-desc reveal">
              Bring instruments to depth. Bonds — tokenized, immutable, deployed on Solana. Zero intermediaries.
            </p>
          </div>
          <div className="iss-hero-right">
            <div style={{ fontSize: '10px', letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--iss-ink-dim)', marginBottom: '20px' }} className="reveal">
              Select Instrument Type
            </div>
            <div className="iss-types reveal">
              <div className="iss-type active">
                <div>
                  <div className="iss-type-name">BOND</div>
                  <div className="iss-type-sub">Fixed · Coupon · On-chain</div>
                </div>
                <div className="iss-type-arrow" />
              </div>
            </div>
          </div>
        </section>

        {/* Wizard */}
        <section>
          {/* Wizard Step Nav */}
          <div className="iss-wizard-nav">
            <div className={`iss-wstep done`}>
              <div className="iss-wstep-num">✓</div>
              <div className="iss-wstep-label">Instrument Type</div>
              <div className="iss-wstep-line" />
            </div>
            <div className={`iss-wstep ${currentStep === 2 ? 'active' : currentStep > 2 ? 'done' : ''}`}>
              <div className="iss-wstep-num">{currentStep > 2 ? '✓' : '2'}</div>
              <div className="iss-wstep-label">Bond Details</div>
              <div className="iss-wstep-line" />
            </div>
            <div className={`iss-wstep ${currentStep === 3 ? 'active' : ''}`}>
              <div className="iss-wstep-num">3</div>
              <div className="iss-wstep-label">Review & Submit</div>
              <div className="iss-wstep-line" />
            </div>
          </div>

          {/* Wizard Body */}
          <div className="iss-wizard-body">
            <div className="iss-wizard-form">

              {/* Step 2 — Bond Details */}
              {currentStep === 2 && (
                <>
                  <div className="iss-panel-title">Bond<br />Details.</div>
                  <p className="iss-panel-sub">
                    Define the core parameters of your bond. These values are immutable post-issuance.
                  </p>

                  <div className="iss-form-group">
                    <label style={labelStyle}>Bond Name</label>
                    <input
                      className="iss-input"
                      style={inputStyle}
                      type="text"
                      placeholder="e.g. Acme Corp Series A"
                      value={bondName}
                      onChange={e => setBondName(e.target.value)}
                    />
                  </div>

                  <div className="iss-form-group">
                    <label style={labelStyle}>Ticker Symbol</label>
                    <input
                      className="iss-input"
                      style={inputStyle}
                      type="text"
                      placeholder="e.g. ACME-A (max 8 chars)"
                      maxLength={8}
                      value={bondSymbol}
                      onChange={e => setBondSymbol(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="iss-form-row">
                    <div className="iss-form-group">
                      <label style={labelStyle}>Total Supply (tokens)</label>
                      <input
                        className="iss-input"
                        style={inputStyle}
                        type="number"
                        placeholder="1000"
                        min={100}
                        max={1000000}
                        value={maxSupply}
                        onChange={e => setMaxSupply(parseInt(e.target.value) || 1000)}
                      />
                      <p className="iss-form-hint">Min 100 · Max 1,000,000</p>
                    </div>
                    <div className="iss-form-group">
                      <label style={labelStyle}>Face Value per Token (SOL)</label>
                      <input
                        className="iss-input"
                        style={inputStyle}
                        type="number"
                        placeholder="0.10"
                        min="0.001"
                        step="0.01"
                        value={faceValueSOL}
                        onChange={e => setFaceValueSOL(parseFloat(e.target.value) || 0.1)}
                      />
                    </div>
                  </div>

                  <div className="iss-form-row">
                    <div className="iss-form-group">
                      <label style={labelStyle}>Coupon Rate (basis points)</label>
                      <input
                        className="iss-input"
                        style={inputStyle}
                        type="number"
                        placeholder="800"
                        min={1}
                        value={couponRateBps}
                        onChange={e => setCouponRateBps(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                      />
                      <p className="iss-form-hint">{couponRateBps} bps = {apyDisplay}% APY</p>
                    </div>
                    <div className="iss-form-group">
                      <label style={labelStyle}>Maturity Date</label>
                      <input
                        className="iss-input"
                        style={inputStyle}
                        type="date"
                        value={maturityDate}
                        onChange={e => setMaturityDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="iss-form-group">
                    <label style={labelStyle}>Loan Agreement URL (optional)</label>
                    <input
                      className="iss-input"
                      style={inputStyle}
                      type="text"
                      placeholder="https://... — will be SHA-256 hashed on-chain"
                      value={loanAgreementUrl}
                      onChange={e => setLoanAgreementUrl(e.target.value)}
                    />
                    <p className="iss-form-hint">Hashed with SHA-256 and stored immutably on Solana</p>
                  </div>

                  <div className="iss-actions">
                    <button className="iss-btn-next" onClick={() => setCurrentStep(3)}>
                      <span>Next — Review</span>
                    </button>
                  </div>
                </>
              )}

              {/* Step 3 — Review & Submit */}
              {currentStep === 3 && (
                <>
                  <div className="iss-panel-title">Review &amp;<br />Submit.</div>
                  <p className="iss-panel-sub">
                    Verify all parameters. Once submitted, the bond is deployed immediately on Solana devnet — all values are immutable.
                  </p>

                  <div className="iss-checklist">
                    <div className="iss-checklist-title">Pre-flight Checklist</div>
                    <div className="iss-checklist-item">
                      <span className={bondName ? 'iss-check-ok' : 'iss-check-pend'}>{bondName ? '✓' : '○'}</span>
                      Bond name: {bondName || 'not set'}
                    </div>
                    <div className="iss-checklist-item">
                      <span className={bondSymbol ? 'iss-check-ok' : 'iss-check-pend'}>{bondSymbol ? '✓' : '○'}</span>
                      Ticker symbol: {bondSymbol || 'not set'}
                    </div>
                    <div className="iss-checklist-item">
                      <span className="iss-check-ok">✓</span>
                      Face value: {faceValueSOL} SOL per token
                    </div>
                    <div className="iss-checklist-item">
                      <span className="iss-check-ok">✓</span>
                      Coupon rate: {couponRateBps} bps ({apyDisplay}% APY)
                    </div>
                    <div className="iss-checklist-item">
                      <span className={maturityDate ? 'iss-check-ok' : 'iss-check-pend'}>{maturityDate ? '✓' : '○'}</span>
                      Maturity: {maturityDate ? new Date(maturityDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'not set'}
                    </div>
                    <div className="iss-checklist-item">
                      <span className="iss-check-ok">✓</span>
                      Supply: {maxSupply.toLocaleString()} tokens · Total raise: {totalRaise.toFixed(4)} SOL
                    </div>
                    <div className="iss-checklist-item">
                      <span className={connected ? 'iss-check-ok' : 'iss-check-pend'}>{connected ? '✓' : '○'}</span>
                      Wallet: {connected ? 'connected' : 'not connected'}
                    </div>
                  </div>

                  {!connected ? (
                    <div className="iss-wallet-wrap">
                      <div className="iss-wallet-hint">Connect wallet to deploy</div>
                      <WalletMultiButton />
                    </div>
                  ) : (
                    <div className="iss-actions">
                      <button className="iss-btn-back" onClick={() => setCurrentStep(2)}>← Back</button>
                      <button className="iss-btn-next" onClick={handleIssueBond} disabled={isLoading}>
                        <span>
                          {isLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                              Deploying on Solana...
                            </span>
                          ) : 'Deploy Bond'}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Live Preview */}
            <div className="iss-preview-wrap">
              <div className="iss-preview-title">Live Preview</div>
              <div className="iss-preview-card">
                <div className="iss-preview-name">{bondName || '—'}</div>
                <div className="iss-preview-row">
                  <div className="iss-preview-key">Ticker</div>
                  <div className={`iss-preview-val ${!bondSymbol ? 'empty' : ''}`}>{bondSymbol || 'Pending'}</div>
                </div>
                <div className="iss-preview-row">
                  <div className="iss-preview-key">Type</div>
                  <div className="iss-preview-val">Fixed-Rate Bond</div>
                </div>
                <div className="iss-preview-row">
                  <div className="iss-preview-key">Supply</div>
                  <div className={`iss-preview-val ${!maxSupply ? 'empty' : ''}`}>{maxSupply ? maxSupply.toLocaleString() : 'Pending'}</div>
                </div>
                <div className="iss-preview-row">
                  <div className="iss-preview-key">Face Value</div>
                  <div className="iss-preview-val">{faceValueSOL} SOL</div>
                </div>
                <div className="iss-preview-row">
                  <div className="iss-preview-key">APY</div>
                  <div className="iss-preview-val">{apyDisplay}%</div>
                </div>
                <div className="iss-preview-row">
                  <div className="iss-preview-key">Maturity</div>
                  <div className={`iss-preview-val ${!maturityDate ? 'empty' : ''}`}>
                    {maturityDate ? new Date(maturityDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Pending'}
                  </div>
                </div>
                <div className="iss-preview-row">
                  <div className="iss-preview-key">Total Raise</div>
                  <div className="iss-preview-val">{totalRaise.toFixed(4)} SOL</div>
                </div>
                <div className="iss-preview-row">
                  <div className="iss-preview-key">Chain</div>
                  <div className="iss-preview-val">Solana Devnet</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="iss-requirements">
          <div className="reveal">
            <div className="iss-req-title">Issuer<br />Requirements.</div>
            <div className="iss-req-list">
              <div className="iss-req-item">
                <div className="iss-req-check ok">✓</div>
                <div>
                  <div className="iss-req-name">Solana Wallet</div>
                  <div className="iss-req-desc">Any Solana-compatible wallet (Phantom, Backpack, Solflare). Devnet SOL required for deployment fees.</div>
                </div>
              </div>
              <div className="iss-req-item">
                <div className="iss-req-check ok">✓</div>
                <div>
                  <div className="iss-req-name">Bond Parameters</div>
                  <div className="iss-req-desc">Name, symbol, face value, coupon rate, maturity date and supply. All values are immutable post-deployment.</div>
                </div>
              </div>
              <div className="iss-req-item">
                <div className="iss-req-check pend">○</div>
                <div>
                  <div className="iss-req-name">Loan Agreement (optional)</div>
                  <div className="iss-req-desc">A URL or document reference. Hashed with SHA-256 and anchored immutably on-chain as proof of terms.</div>
                </div>
              </div>
              <div className="iss-req-item">
                <div className="iss-req-check pend">○</div>
                <div>
                  <div className="iss-req-name">Minimum Supply: 100 tokens</div>
                  <div className="iss-req-desc">Protocol enforces a floor of 100 and ceiling of 1,000,000 tokens per issuance.</div>
                </div>
              </div>
            </div>
          </div>
          <div className="reveal">
            <div className="iss-req-stats">
              <div className="iss-req-stat">
                <div className="iss-req-stat-num">∞<span className="suf"></span></div>
                <div className="iss-req-stat-lbl">Issuances Possible</div>
              </div>
              <div className="iss-req-stat">
                <div className="iss-req-stat-num">0<span className="suf">%</span></div>
                <div className="iss-req-stat-lbl">Protocol Fee (Devnet)</div>
              </div>
              <div className="iss-req-stat">
                <div className="iss-req-stat-num">&lt;1<span className="suf">s</span></div>
                <div className="iss-req-stat-lbl">Deployment Time</div>
              </div>
              <div className="iss-req-stat">
                <div className="iss-req-stat-num">SHA<span className="suf">-256</span></div>
                <div className="iss-req-stat-lbl">Agreement Hashing</div>
              </div>
            </div>
          </div>
        </section>

      </div>
  );
}
