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

  const grainRef = useRef<HTMLCanvasElement>(null);
  const heroBgRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const totalRaise = faceValueSOL * maxSupply;
  const apyDisplay = couponRateBps / 100;

  // Grain canvas
  useEffect(() => {
    const c = grainRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const draw = () => {
      const w = c.width, h = c.height;
      const d = ctx.createImageData(w, h);
      const b = d.data;
      for (let i = 0; i < b.length; i += 4) {
        const v = Math.random() * 255 | 0;
        b[i] = b[i + 1] = b[i + 2] = v;
        b[i + 3] = 255;
      }
      ctx.putImageData(d, 0, 0);
      raf = window.setTimeout(() => requestAnimationFrame(draw), 80);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); clearTimeout(raf); };
  }, []);

  // Custom cursor
  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    let rafId: number;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx - 4}px,${my - 4}px,0)`;
    };
    const loop = () => {
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
      ring.style.transform = `translate3d(${rx - 20}px,${ry - 20}px,0)`;
      rafId = requestAnimationFrame(loop);
    };
    const onClick = (e: MouseEvent) => {
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;border-radius:50%;border:1px solid var(--iss-gold);pointer-events:none;z-index:9990;transform:translate(-50%,-50%) scale(0);opacity:.6;animation:issRipple 1.4s cubic-bezier(.2,.8,.4,1) forwards;left:${e.clientX}px;top:${e.clientY}px;width:80px;height:80px;`;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    };
    const addHover = () => document.body.classList.add('iss-cursor-hover');
    const rmHover = () => document.body.classList.remove('iss-cursor-hover');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('click', onClick);
    document.querySelectorAll('a,button').forEach(el => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', rmHover);
    });
    loop();
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('click', onClick);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Hero bg canvas
  useEffect(() => {
    const c = heroBgRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
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

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('.iss-reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('iss-visible'); });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

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
    } catch (err: any) {
      console.error('issueBond error:', err);
      const description = err?.message || err?.logs?.join(' | ') || err?.toString?.() || 'Unknown error';
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
    fontFamily: "'DM Mono', monospace",
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
    <>
      <style>{`
        @keyframes issRipple { to { transform: translate(-50%,-50%) scale(1); opacity: 0; } }

        .iss-root {
          --iss-bg: #0b0307;
          --iss-ink: #f0e2ea;
          --iss-ink-dim: #7a4460;
          --iss-gold: oklch(0.67 0.24 28);
          --iss-copper: oklch(0.47 0.22 14);
          --iss-moss: oklch(0.80 0.04 340);
          --iss-rule: rgba(240,226,234,0.09);
          min-height: 100vh;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.14 0.12 28) 0%, #0b0307 55%);
          color: var(--iss-ink);
          font-family: 'DM Mono', monospace;
          cursor: none;
          overflow-x: hidden;
        }

        #iss-grain { position: fixed; inset: 0; pointer-events: none; z-index: 9000; opacity: .055; }
        #iss-dot { position: fixed; top: 0; left: 0; width: 8px; height: 8px; background: var(--iss-gold); border-radius: 50%; pointer-events: none; z-index: 9999; will-change: transform; mix-blend-mode: difference; }
        #iss-ring { position: fixed; top: 0; left: 0; width: 40px; height: 40px; border: 1px solid var(--iss-gold); border-radius: 50%; pointer-events: none; z-index: 9998; will-change: transform; transition: width .3s, height .3s, border-color .3s, opacity .3s; opacity: .5; }
        .iss-cursor-hover #iss-ring { width: 70px; height: 70px; border-color: var(--iss-copper); opacity: .9; }

        .iss-reveal { opacity: 0; transform: translateY(40px); transition: opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1); }
        .iss-visible { opacity: 1; transform: translateY(0); }

        .iss-hero { height: 100vh; display: grid; grid-template-columns: 1fr 1fr; position: relative; overflow: hidden; border-bottom: 1px solid var(--iss-rule); }
        .iss-hero-left { display: flex; flex-direction: column; justify-content: flex-end; padding: 0 48px 80px; border-right: 1px solid var(--iss-rule); position: relative; z-index: 2; }
        .iss-hero-eyebrow { font-size: 10px; letter-spacing: .4em; text-transform: uppercase; color: var(--iss-ink-dim); margin-bottom: 28px; }
        .iss-hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(80px, 13vw, 190px); letter-spacing: -.02em; line-height: .88; margin-bottom: 40px; }
        .iss-hero-title .gold { color: var(--iss-gold); }
        .iss-hero-rule { width: 100%; height: 1px; background: var(--iss-rule); margin-bottom: 32px; }
        .iss-hero-desc { font-family: 'Spectral', serif; font-style: italic; font-size: 20px; font-weight: 300; color: var(--iss-ink-dim); line-height: 1.65; max-width: 380px; }

        .iss-hero-right { display: flex; flex-direction: column; justify-content: center; padding: 100px 48px 80px; position: relative; z-index: 2; gap: 48px; }
        .iss-types { display: flex; flex-direction: column; gap: 2px; background: var(--iss-rule); }
        .iss-type { background: var(--iss-bg); padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; transition: background .3s; border-left: 2px solid transparent; }
        .iss-type.active { background: oklch(0.13 0.10 28 / 0.8); border-left-color: var(--iss-gold); cursor: none; }
        .iss-type.active .iss-type-name { color: var(--iss-gold); }
        .iss-type.disabled { opacity: .45; cursor: not-allowed; }
        .iss-type-name { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: .02em; color: var(--iss-ink); transition: color .3s; }
        .iss-type-sub { font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: var(--iss-ink-dim); }
        .iss-type-badge { font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--iss-ink-dim); border: 1px solid var(--iss-rule); padding: 4px 10px; }
        .iss-type-arrow { width: 20px; height: 1px; background: var(--iss-rule); position: relative; transition: all .3s; }
        .iss-type-arrow::after { content: ''; position: absolute; right: 0; top: -3px; width: 5px; height: 5px; border-right: 1px solid var(--iss-rule); border-top: 1px solid var(--iss-rule); transform: rotate(45deg); }
        .iss-type.active .iss-type-arrow { background: var(--iss-gold); }
        .iss-type.active .iss-type-arrow::after { border-color: var(--iss-gold); }

        .iss-wizard-nav { display: flex; border-bottom: 1px solid var(--iss-rule); position: sticky; top: 0; background: var(--iss-bg); z-index: 50; }
        .iss-wstep { flex: 1; padding: 24px 48px; display: flex; align-items: center; gap: 20px; border-right: 1px solid var(--iss-rule); position: relative; cursor: none; }
        .iss-wstep:last-child { border-right: none; }
        .iss-wstep-num { width: 28px; height: 28px; border: 1px solid var(--iss-rule); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; letter-spacing: .1em; color: var(--iss-ink-dim); flex-shrink: 0; transition: all .3s; }
        .iss-wstep.done .iss-wstep-num { background: var(--iss-moss); border-color: var(--iss-moss); color: var(--iss-bg); }
        .iss-wstep.active .iss-wstep-num { border-color: var(--iss-gold); color: var(--iss-gold); }
        .iss-wstep-label { font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: var(--iss-ink-dim); }
        .iss-wstep.active .iss-wstep-label { color: var(--iss-ink); }
        .iss-wstep-line { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: var(--iss-gold); transform: scaleX(0); transition: transform .5s cubic-bezier(.16,1,.3,1); transform-origin: left; }
        .iss-wstep.active .iss-wstep-line, .iss-wstep.done .iss-wstep-line { transform: scaleX(1); }

        .iss-wizard-body { display: grid; grid-template-columns: 1fr 380px; }
        .iss-wizard-form { padding: 80px 48px; border-right: 1px solid var(--iss-rule); }
        .iss-panel-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 6vw, 72px); letter-spacing: -.01em; line-height: 1; margin-bottom: 12px; }
        .iss-panel-sub { font-family: 'Spectral', serif; font-style: italic; font-size: 18px; font-weight: 300; color: var(--iss-ink-dim); line-height: 1.6; margin-bottom: 60px; }

        .iss-form-group { margin-bottom: 40px; }
        .iss-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .iss-form-hint { font-size: 10px; letter-spacing: .1em; color: var(--iss-ink-dim); margin-top: 8px; line-height: 1.5; }
        .iss-input:focus { border-bottom-color: var(--iss-gold) !important; }
        .iss-input::placeholder { color: var(--iss-ink-dim); font-size: 13px; }
        .iss-input::-webkit-calendar-picker-indicator { filter: invert(1) opacity(.3); }

        .iss-actions { display: flex; gap: 16px; margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--iss-rule); }
        .iss-btn-next { display: inline-flex; align-items: center; gap: 16px; padding: 18px 48px; border: 1px solid var(--iss-gold); color: var(--iss-ink); font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; background: none; cursor: none; position: relative; overflow: hidden; transition: color .3s; }
        .iss-btn-next::before { content: ''; position: absolute; inset: 0; background: var(--iss-gold); transform: translateY(100%); transition: transform .4s cubic-bezier(.16,1,.3,1); }
        .iss-btn-next:hover { color: var(--iss-bg); }
        .iss-btn-next:hover::before { transform: translateY(0); }
        .iss-btn-next span { position: relative; z-index: 1; }
        .iss-btn-next:disabled { opacity: .4; pointer-events: none; }
        .iss-btn-back { display: inline-flex; align-items: center; gap: 12px; padding: 18px 32px; border: 1px solid var(--iss-rule); color: var(--iss-ink-dim); font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; background: none; cursor: none; transition: all .3s; }
        .iss-btn-back:hover { border-color: var(--iss-ink-dim); color: var(--iss-ink); }

        .iss-preview-wrap { padding: 80px 40px; position: sticky; top: 77px; }
        .iss-preview-title { font-size: 9px; letter-spacing: .3em; text-transform: uppercase; color: var(--iss-ink-dim); margin-bottom: 32px; }
        .iss-preview-card { border: 1px solid var(--iss-rule); padding: 36px; display: flex; flex-direction: column; gap: 20px; }
        .iss-preview-name { font-family: 'Bebas Neue', sans-serif; font-size: 40px; letter-spacing: .02em; color: var(--iss-gold); line-height: 1; }
        .iss-preview-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--iss-rule); }
        .iss-preview-row:last-child { border-bottom: none; }
        .iss-preview-key { font-size: 9px; letter-spacing: .25em; text-transform: uppercase; color: var(--iss-ink-dim); }
        .iss-preview-val { font-size: 12px; color: var(--iss-ink); }
        .iss-preview-val.empty { color: var(--iss-ink-dim); font-style: italic; }

        .iss-checklist { padding: 40px; border: 1px solid var(--iss-rule); background: oklch(.11 .005 72); margin-bottom: 40px; }
        .iss-checklist-title { font-size: 9px; letter-spacing: .3em; text-transform: uppercase; color: var(--iss-moss); margin-bottom: 20px; }
        .iss-checklist-item { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--iss-ink-dim); margin-bottom: 12px; }
        .iss-check-ok { color: var(--iss-moss); }
        .iss-check-pend { color: var(--iss-gold); }

        .iss-requirements { padding: 120px 48px; border-bottom: 1px solid var(--iss-rule); display: grid; grid-template-columns: 1fr 1fr; gap: 80px; }
        .iss-req-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(56px, 7vw, 88px); letter-spacing: -.01em; line-height: 1; margin-bottom: 48px; }
        .iss-req-list { display: flex; flex-direction: column; }
        .iss-req-item { padding: 32px 0; border-bottom: 1px solid var(--iss-rule); display: grid; grid-template-columns: 28px 1fr; gap: 24px; align-items: start; }
        .iss-req-check { width: 20px; height: 20px; border: 1px solid var(--iss-rule); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; font-size: 10px; }
        .iss-req-check.ok { border-color: var(--iss-moss); color: var(--iss-moss); }
        .iss-req-check.pend { color: var(--iss-ink-dim); }
        .iss-req-name { font-size: 13px; color: var(--iss-ink); margin-bottom: 4px; }
        .iss-req-desc { font-size: 11px; color: var(--iss-ink-dim); line-height: 1.6; }
        .iss-req-stats { display: flex; flex-direction: column; gap: 2px; background: var(--iss-rule); padding-top: 80px; }
        .iss-req-stat { background: var(--iss-bg); padding: 36px 32px; display: flex; flex-direction: column; gap: 8px; }
        .iss-req-stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 52px; letter-spacing: -.02em; line-height: 1; color: var(--iss-ink); }
        .iss-req-stat-num .suf { font-size: .4em; color: var(--iss-gold); }
        .iss-req-stat-lbl { font-size: 9px; letter-spacing: .25em; text-transform: uppercase; color: var(--iss-ink-dim); }

        .iss-footer { padding: 48px; border-top: 1px solid var(--iss-rule); display: flex; justify-content: space-between; align-items: center; }
        .iss-footer-logo { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: .2em; }
        .iss-footer-copy { font-size: 10px; letter-spacing: .15em; color: var(--iss-ink-dim); }
        .iss-footer-links { display: flex; gap: 28px; list-style: none; margin: 0; padding: 0; }
        .iss-footer-links a { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--iss-ink-dim); text-decoration: none; transition: color .2s; }
        .iss-footer-links a:hover { color: var(--iss-ink); }

        .iss-wallet-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 32px 0; border-top: 1px solid var(--iss-rule); margin-top: 40px; }
        .iss-wallet-hint { font-size: 11px; letter-spacing: .15em; text-transform: uppercase; color: var(--iss-ink-dim); }
      `}</style>

      <div className="iss-root">
        <canvas id="iss-grain" ref={grainRef} />
        <div id="iss-dot" ref={dotRef} />
        <div id="iss-ring" ref={ringRef} />

        {/* Hero */}
        <section className="iss-hero">
          <canvas ref={heroBgRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
          <div className="iss-hero-left">
            <div className="iss-hero-eyebrow iss-reveal">§ Issuance — Originate on Lacus</div>
            <h1 className="iss-hero-title iss-reveal">IS<span className="gold">SUE.</span></h1>
            <div className="iss-hero-rule" />
            <p className="iss-hero-desc iss-reveal">
              Bring instruments to depth. Bonds — tokenized, immutable, deployed on Solana. Zero intermediaries.
            </p>
          </div>
          <div className="iss-hero-right">
            <div style={{ fontSize: '10px', letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--iss-ink-dim)', marginBottom: '20px' }} className="iss-reveal">
              Select Instrument Type
            </div>
            <div className="iss-types iss-reveal">
              <div className="iss-type active">
                <div>
                  <div className="iss-type-name">BOND</div>
                  <div className="iss-type-sub">Fixed · Coupon · On-chain</div>
                </div>
                <div className="iss-type-arrow" />
              </div>
              <div className="iss-type disabled" title="Coming Soon">
                <div>
                  <div className="iss-type-name">EQUITY</div>
                  <div className="iss-type-sub">Preferred · Common · Warrant</div>
                </div>
                <div className="iss-type-badge">Coming Soon</div>
              </div>
              <div className="iss-type disabled" title="Coming Soon">
                <div>
                  <div className="iss-type-name">STRUCTURED</div>
                  <div className="iss-type-sub">Notes · Certificates · Pools</div>
                </div>
                <div className="iss-type-badge">Coming Soon</div>
              </div>
              <div className="iss-type disabled" title="Coming Soon">
                <div>
                  <div className="iss-type-name">GOVERNANCE</div>
                  <div className="iss-type-sub">Utility · DAO · veToken</div>
                </div>
                <div className="iss-type-badge">Coming Soon</div>
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
          <div className="iss-reveal">
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
          <div className="iss-reveal">
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

        {/* Footer */}
        <footer className="iss-footer">
          <div className="iss-footer-logo">LACUS</div>
          <div className="iss-footer-copy">© 2026 Lacus Foundation — Issuance</div>
          <ul className="iss-footer-links">
            <li><a href="/primary">Primary</a></li>
            <li><a href="/launchpad">Launchpad</a></li>
            <li><a href="/manage">Manage</a></li>
          </ul>
        </footer>

      </div>
    </>
  );
}
