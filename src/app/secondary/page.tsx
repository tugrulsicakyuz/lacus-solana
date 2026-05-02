"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const features = [
  { n: "001", title: "PEER-TO-PEER", sub: "Direct Trading", desc: "List your bond tokens at your price. No intermediary, no custody, no counterparty risk." },
  { n: "002", title: "ATOMIC SWAP", sub: "Instant Settlement", desc: "Sub-second finality on Solana. Trade settles directly between wallets in a single transaction." },
  { n: "003", title: "ORDER BOOK", sub: "On-Chain Depth", desc: "Transparent bids and asks, fully auditable. Every order visible, non-custodial by design." },
  { n: "004", title: "VERIFIED", sub: "Lacus Instruments Only", desc: "Terms, maturity, coupon and issuer verified on-chain. No unvetted instruments enter the book." },
  { n: "005", title: "NON-CUSTODIAL", sub: "Your Keys, Your Tokens", desc: "No bridge, no wrapped asset. SPL tokens trade directly from your wallet throughout." },
  { n: "006", title: "CONTINUOUS", sub: "Always Open", desc: "No trading hours. No gates. A permanent, always-on market for structured on-chain credit." },
];

const phases = [
  { n: "01", label: "PRIMARY MARKET", status: "live", desc: "Bond issuance and direct purchase from issuers. SOL in, yield-bearing tokens out." },
  { n: "02", label: "PORTFOLIO & YIELD", status: "live", desc: "Holdings dashboard, coupon claims, maturity redemption, principal deposits." },
  { n: "03", label: "SECONDARY MARKET", status: "building", desc: "P2P listings, order matching, atomic settlement between holders." },
  { n: "04", label: "STRUCTURED PRODUCTS", status: "planned", desc: "Tranched credit, yield aggregation, index instruments and pool vaults." },
];

export default function SecondaryMarket() {
  const grainRef = useRef<HTMLCanvasElement>(null);
  const headerCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  // Grain canvas
  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    function render() {
      if (!canvas || !ctx) return;
      const w = canvas.width, h = canvas.height;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      frame++;
      if (frame % 3 === 0) requestAnimationFrame(render);
      else setTimeout(() => requestAnimationFrame(render), 60);
    }
    render();
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Header canvas: drifting blue lines
  useEffect(() => {
    const canvas = headerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = 0, H = 0, animId = 0;
    function resize() {
      if (!canvas) return;
      setTimeout(() => {
        const r = canvas.getBoundingClientRect();
        W = canvas.width = r.width || 800;
        H = canvas.height = r.height || 500;
      }, 50);
    }
    resize();
    window.addEventListener("resize", resize);
    const lines: any[] = [];
    for (let i = 0; i < 20; i++)
      lines.push({ x: Math.random() * 1.2 - 0.1, y: Math.random(), vx: (Math.random() - 0.5) * 0.0002, vy: (Math.random() - 0.5) * 0.0001, opacity: Math.random() * 0.12 + 0.02 });
    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      lines.forEach(l => {
        l.x += l.vx; l.y += l.vy;
        if (l.x < -0.1) l.x = 1.1;
        if (l.x > 1.1) l.x = -0.1;
        if (l.y < -0.1) l.y = 1.1;
        if (l.y > 1.1) l.y = -0.1;
        ctx.beginPath();
        ctx.moveTo(l.x * W - W, l.y * H);
        ctx.lineTo(l.x * W + W * 2, l.y * H + Math.sin(t * 0.0003 + l.x * 4) * 30);
        ctx.strokeStyle = `rgba(96,165,250,${l.opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
      animId = requestAnimationFrame(draw);
    }
    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  // Cursor
  useEffect(() => {
    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx - 4}px,${my - 4}px,0)`; };
    document.addEventListener("mousemove", onMove);
    function lerp() { if (!ring) return; rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12; ring.style.transform = `translate3d(${rx - 20}px,${ry - 20}px,0)`; requestAnimationFrame(lerp); }
    requestAnimationFrame(lerp);
    const onHover = () => document.body.classList.add("cursor-hover");
    const onLeave = () => document.body.classList.remove("cursor-hover");
    document.querySelectorAll("a, button").forEach(el => { el.addEventListener("mouseenter", onHover); el.addEventListener("mouseleave", onLeave); });
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  // Scroll reveal
  useEffect(() => {
    setRevealed(true);
    const timer = setTimeout(() => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
      document.querySelectorAll(".sec-root .reveal").forEach(el => obs.observe(el));
      return () => obs.disconnect();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style jsx global>{`
        .sec-root {
          --bg: #0d0b08;
          --ink: #f0e8d8;
          --ink-dim: #7a6f60;
          --blue: #60a5fa;
          --blue-dim: rgba(96,165,250,0.18);
          --blue-glow: rgba(96,165,250,0.08);
          --rule: rgba(240,232,216,0.10);
          background: var(--bg);
          color: var(--ink);
          min-height: 100vh;
        }
        .sec-root * { box-sizing: border-box; }

        #sec-grain { position: fixed; inset: 0; pointer-events: none; z-index: 9000; opacity: 0.032; }
        #sec-cursor-dot { position: fixed; top: 0; left: 0; width: 8px; height: 8px; background: var(--blue); border-radius: 50%; pointer-events: none; z-index: 9999; will-change: transform; mix-blend-mode: difference; }
        #sec-cursor-ring { position: fixed; top: 0; left: 0; width: 40px; height: 40px; border: 1px solid var(--blue); border-radius: 50%; pointer-events: none; z-index: 9998; will-change: transform; transition: width 0.3s, height 0.3s, opacity 0.3s; opacity: 0.4; }
        .sec-root.cursor-hover #sec-cursor-ring, body.cursor-hover #sec-cursor-ring { width: 70px; height: 70px; opacity: 0.8; }

        .sec-root .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1); }
        .sec-root .reveal.visible { opacity: 1; transform: translateY(0); }

        /* HEADER */
        .sec-header { padding: 180px 48px 100px; border-bottom: 1px solid var(--rule); position: relative; overflow: hidden; }
        .sec-header-canvas { position: absolute; inset: 0; pointer-events: none; }
        .sec-eyebrow { font-size: 10px; letter-spacing: 0.4em; text-transform: uppercase; color: var(--ink-dim); margin-bottom: 32px; position: relative; z-index: 2; }
        .sec-title { font-family: "Bebas Neue", sans-serif; font-size: clamp(80px, 14vw, 200px); letter-spacing: -0.02em; line-height: 0.9; position: relative; z-index: 2; }
        .sec-title .blue { color: var(--blue); }
        .sec-header-right { position: absolute; right: 48px; bottom: 100px; z-index: 2; text-align: right; }
        .sec-header-right p { font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 18px; font-weight: 300; color: var(--ink-dim); line-height: 1.6; max-width: 340px; }
        .sec-status-pill { display: inline-flex; align-items: center; gap: 10px; border: 1px solid var(--blue-dim); padding: 9px 22px; font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--blue); margin-top: 48px; position: relative; z-index: 2; }
        .sec-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); animation: sec-pulse 2s ease-in-out infinite; }
        @keyframes sec-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

        /* STATUS BAR */
        .sec-bar { padding: 24px 48px; border-bottom: 1px solid var(--rule); display: flex; align-items: center; gap: 4px; }
        .sec-bar-label { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink-dim); margin-right: 20px; font-family: "DM Mono", monospace; }
        .sec-bar-item { padding: 7px 18px; border: 1px solid var(--rule); font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-dim); }
        .sec-bar-item.active { border-color: var(--blue-dim); color: var(--blue); background: var(--blue-glow); }
        .sec-bar-spacer { flex: 1; }
        .sec-bar-phase { font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--ink-dim); }
        .sec-bar-phase span { color: var(--blue); }

        /* FEATURES GRID */
        .sec-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: var(--rule); border-bottom: 1px solid var(--rule); }
        .sec-feature { background: var(--bg); padding: 52px 44px; display: flex; flex-direction: column; gap: 0; position: relative; overflow: hidden; transition: background 0.4s; }
        .sec-feature::after { content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--blue), transparent); transform: scaleX(0); transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        .sec-feature:hover::after { transform: scaleX(1); }
        .sec-feature:hover { background: oklch(0.12 0.02 240 / 1); }
        .sec-feature-n { font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 13px; color: var(--ink-dim); margin-bottom: 20px; }
        .sec-feature-title { font-family: "Bebas Neue", sans-serif; font-size: clamp(32px, 3vw, 48px); letter-spacing: 0.02em; line-height: 1; color: var(--ink); margin-bottom: 6px; transition: color 0.3s; }
        .sec-feature:hover .sec-feature-title { color: var(--blue); }
        .sec-feature-sub { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-dim); margin-bottom: 28px; font-family: "DM Mono", monospace; }
        .sec-feature-desc { font-size: 13px; color: var(--ink-dim); line-height: 1.75; }

        /* TIMELINE */
        .sec-timeline { padding: 120px 48px; border-bottom: 1px solid var(--rule); }
        .sec-timeline-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 80px; }
        .sec-timeline-title { font-family: "Bebas Neue", sans-serif; font-size: clamp(48px, 6vw, 80px); letter-spacing: -0.01em; line-height: 1; }
        .sec-timeline-desc { max-width: 280px; font-size: 13px; color: var(--ink-dim); line-height: 1.8; }
        .sec-timeline-track { padding-left: 48px; border-left: 1px solid var(--rule); }
        .sec-phase { padding: 40px 0 40px 48px; border-bottom: 1px solid var(--rule); display: grid; grid-template-columns: 180px 1fr 120px; gap: 48px; align-items: center; position: relative; transition: background 0.3s; }
        .sec-phase:last-child { border-bottom: none; }
        .sec-phase:hover { background: oklch(0.12 0.01 240 / 0.5); }
        .sec-phase-dot { position: absolute; left: -25px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; border: 1px solid var(--rule); background: var(--bg); }
        .sec-phase-dot.live { background: #86efac; border-color: #86efac; box-shadow: 0 0 10px rgba(134,239,172,0.5); }
        .sec-phase-dot.building { background: var(--blue); border-color: var(--blue); box-shadow: 0 0 10px rgba(96,165,250,0.5); animation: sec-pulse 2s ease-in-out infinite; }
        .sec-phase-n { font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--ink-dim); font-family: "DM Mono", monospace; }
        .sec-phase-name { font-family: "Bebas Neue", sans-serif; font-size: 36px; color: var(--ink); }
        .sec-phase-name.active { color: var(--blue); }
        .sec-phase-desc { font-size: 12px; color: var(--ink-dim); line-height: 1.7; }
        .sec-phase-status { font-family: "DM Mono", monospace; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; text-align: right; }
        .sec-phase-status.live { color: #86efac; }
        .sec-phase-status.building { color: var(--blue); }
        .sec-phase-status.planned { color: var(--ink-dim); opacity: 0.5; }
        .sec-phase.planned-phase { opacity: 0.45; }

        /* CTA */
        .sec-cta { padding: 120px 48px; border-bottom: 1px solid var(--rule); display: flex; flex-direction: column; align-items: flex-start; gap: 48px; }
        .sec-cta-title { font-family: "Bebas Neue", sans-serif; font-size: clamp(48px, 6vw, 80px); line-height: 0.95; }
        .sec-cta-body { font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 20px; font-weight: 300; color: var(--ink-dim); max-width: 420px; line-height: 1.7; }
        .sec-btn { display: inline-flex; align-items: center; gap: 16px; padding: 20px 48px; border: 1px solid var(--blue-dim); color: var(--ink); text-decoration: none; font-family: "DM Mono", monospace; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; position: relative; overflow: hidden; cursor: pointer; will-change: transform; transition: color 0.3s; }
        .sec-btn::before { content: ""; position: absolute; inset: 0; background: var(--blue); transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
        .sec-btn:hover { color: var(--bg); }
        .sec-btn:hover::before { transform: translateY(0); }
        .sec-btn span { position: relative; z-index: 1; }
        .sec-btn-arrow { position: relative; z-index: 1; width: 16px; height: 1px; background: currentColor; transition: width 0.3s; flex-shrink: 0; }
        .sec-btn-arrow::after { content: ""; position: absolute; right: 0; top: -3px; width: 6px; height: 6px; border-right: 1px solid currentColor; border-top: 1px solid currentColor; transform: rotate(45deg); }
        .sec-btn:hover .sec-btn-arrow { width: 28px; }

        /* FOOTER */
        .sec-footer { padding: 48px; border-top: 1px solid var(--rule); display: flex; justify-content: space-between; align-items: center; }
        .sec-footer-logo { font-family: "Bebas Neue", sans-serif; font-size: 18px; letter-spacing: 0.2em; }
        .sec-footer-copy { font-size: 10px; letter-spacing: 0.15em; color: var(--ink-dim); }
        .sec-footer-links { display: flex; gap: 28px; list-style: none; }
        .sec-footer-links a { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-dim); text-decoration: none; transition: color 0.2s; font-family: "DM Mono", monospace; }
        .sec-footer-links a:hover { color: var(--ink); }

        @media (max-width: 768px) {
          .sec-header { padding: 140px 24px 80px; }
          .sec-header-right { display: none; }
          .sec-features { grid-template-columns: 1fr; }
          .sec-phase { grid-template-columns: 80px 1fr; }
          .sec-phase-status { display: none; }
          .sec-bar, .sec-timeline, .sec-cta, .sec-footer { padding-left: 24px; padding-right: 24px; }
          .sec-timeline-header { flex-direction: column; gap: 24px; }
        }
      `}</style>

      <div className="sec-root">
        <canvas ref={grainRef} id="sec-grain" />
        <div ref={cursorDotRef} id="sec-cursor-dot" />
        <div ref={cursorRingRef} id="sec-cursor-ring" />

        {/* HEADER */}
        <section className="sec-header">
          <canvas ref={headerCanvasRef} className="sec-header-canvas" />
          <div className="sec-eyebrow reveal">§ Protocol — Secondary Layer</div>
          <h1 className="sec-title reveal">
            SECOND<span className="blue">ARY</span>
          </h1>
          <div className="sec-header-right reveal">
            <p>
              A deep, continuous market<br />
              for on-chain credit instruments.<br />
              Peer-to-peer. Non-custodial. Always open.
            </p>
          </div>
          <div className="sec-status-pill reveal">
            <div className="sec-status-dot" />
            In Development
          </div>
        </section>

        {/* STATUS BAR */}
        <div className="sec-bar">
          <span className="sec-bar-label">Status</span>
          <div className="sec-bar-item">Primary — Live</div>
          <div className="sec-bar-item active">Secondary — Building</div>
          <div className="sec-bar-item">Structured — Planned</div>
          <div className="sec-bar-spacer" />
          <div className="sec-bar-phase">Phase <span>03</span> / 04</div>
        </div>

        {/* FEATURES GRID */}
        <div className="sec-features">
          {features.map((f, i) => (
            <div key={f.n} className="sec-feature reveal" style={{ transitionDelay: `${i * 0.06}s` }}>
              <div className="sec-feature-n">{f.n} /</div>
              <div className="sec-feature-title">{f.title}</div>
              <div className="sec-feature-sub">{f.sub}</div>
              <div className="sec-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* TIMELINE */}
        <section className="sec-timeline">
          <div className="sec-timeline-header">
            <div className="sec-timeline-title reveal">PROTOCOL<br />ROADMAP</div>
            <p className="sec-timeline-desc reveal">
              Four phases from origination to full liquidity. The secondary market is the third layer of the Lacus credit stack.
            </p>
          </div>
          <div className="sec-timeline-track">
            {phases.map((p) => (
              <div
                key={p.n}
                className={`sec-phase reveal ${p.status === "planned" ? "planned-phase" : ""}`}
              >
                <div className={`sec-phase-dot ${p.status}`} />
                <div className="sec-phase-n">{p.n}</div>
                <div>
                  <div className={`sec-phase-name ${p.status === "building" ? "active" : ""}`}>{p.label}</div>
                  <div className="sec-phase-desc">{p.desc}</div>
                </div>
                <div className={`sec-phase-status ${p.status}`}>
                  {p.status === "live" ? "● Live" : p.status === "building" ? "◌ Building" : "— Planned"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="sec-cta">
          <div className="sec-cta-title reveal">
            EARN YIELD<br />NOW.
          </div>
          <p className="sec-cta-body reveal">
            While the secondary market is being built, the primary market is live. Buy bonds directly from issuers — SOL in, yield-bearing tokens out.
          </p>
          <Link href="/primary" className="sec-btn reveal">
            <span>Go to Primary Market</span>
            <div className="sec-btn-arrow" />
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="sec-footer">
          <div className="sec-footer-logo">LACUS</div>
          <div className="sec-footer-copy">© 2026 Lacus Foundation — Secondary Market</div>
          <ul className="sec-footer-links">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/launchpad">Launchpad</Link></li>
            <li><Link href="/primary">Primary</Link></li>
          </ul>
        </footer>
      </div>
    </>
  );
}
