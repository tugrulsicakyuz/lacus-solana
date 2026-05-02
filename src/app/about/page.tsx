"use client";

import Link from "next/link";
import { useRef, useEffect } from "react";

export default function AboutPage() {
  const grainRef = useRef<HTMLCanvasElement>(null);
  const dotRef   = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);

  // ── Grain canvas
  useEffect(() => {
    const c = grainRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const paint = () => {
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
      const img = ctx.createImageData(c.width, c.height);
      const d   = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      animId = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Custom cursor
  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove);
    const tick = () => {
      dot.style.transform  = `translate3d(${mx - 4}px,${my - 4}px,0)`;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate3d(${rx - 20}px,${ry - 20}px,0)`;
      requestAnimationFrame(tick);
    };
    tick();
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // ── Intersection Observer reveal
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".ar");
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity    = "1";
            (e.target as HTMLElement).style.transform  = "translateY(0)";
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="about-root">
      <style>{`
        .about-root {
          --about-bg:      #060d08;
          --about-ink:     #e2f0e8;
          --about-ink-dim: rgba(226,240,232,0.4);
          --about-green:   #4ade80;
          --about-rule:    rgba(226,240,232,0.09);

          min-height: 100vh;
          background: radial-gradient(
            ellipse 80% 60% at 50% 0%,
            oklch(0.14 0.10 145) 0%,
            #060d08 60%
          );
          color: var(--about-ink);
          font-family: 'DM Mono', monospace;
          cursor: none;
          overflow-x: hidden;
        }

        /* cursor */
        .ab-dot {
          position: fixed;
          top: 0; left: 0;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--about-green);
          pointer-events: none;
          z-index: 9999;
          will-change: transform;
          mix-blend-mode: difference;
        }
        .ab-ring {
          position: fixed;
          top: 0; left: 0;
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid var(--about-green);
          pointer-events: none;
          z-index: 9998;
          will-change: transform;
          mix-blend-mode: difference;
          transition: opacity 0.2s;
        }

        /* grain overlay */
        .ab-grain {
          position: fixed;
          inset: 0;
          z-index: 9000;
          opacity: 0.035;
          pointer-events: none;
        }

        /* reveal animation base */
        .ar {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }

        /* hero */
        .ab-hero {
          padding: 140px 48px 100px;
          border-bottom: 1px solid var(--about-rule);
          max-width: 1280px;
          margin: 0 auto;
        }
        .ab-hero-inner {
          display: flex;
          align-items: center;
          gap: 80px;
          flex-wrap: wrap;
        }
        .ab-hero-left {
          flex: 1;
          min-width: 360px;
        }
        .ab-eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.4em;
          color: var(--about-ink-dim);
          text-transform: uppercase;
          margin-bottom: 28px;
        }
        .ab-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(80px, 10vw, 140px);
          line-height: 0.92;
          letter-spacing: 0.01em;
          margin-bottom: 32px;
        }
        .ab-title span { color: var(--about-green); }
        .ab-desc {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-weight: 300;
          font-size: 20px;
          line-height: 1.7;
          color: var(--about-ink-dim);
          max-width: 520px;
          margin-bottom: 40px;
        }
        .ab-cta-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .ab-btn-fill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: var(--about-green);
          color: #060d08;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          border: 1px solid var(--about-green);
          text-decoration: none;
          transition: background 0.2s, color 0.2s;
        }
        .ab-btn-fill:hover {
          background: transparent;
          color: var(--about-green);
        }
        .ab-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: transparent;
          color: var(--about-green);
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          border: 1px solid var(--about-green);
          text-decoration: none;
          transition: background 0.2s, color 0.2s;
        }
        .ab-btn-ghost:hover {
          background: var(--about-green);
          color: #060d08;
        }

        /* mock bond card */
        .ab-card {
          flex-shrink: 0;
          width: 340px;
          background: rgba(74,222,128,0.04);
          border: 1px solid var(--about-rule);
          padding: 28px;
          position: relative;
          overflow: hidden;
        }
        .ab-card::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .ab-card-badge {
          display: inline-block;
          font-size: 9px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--about-green);
          border: 1px solid rgba(74,222,128,0.3);
          padding: 4px 10px;
          margin-bottom: 20px;
        }
        .ab-card-network {
          font-size: 9px;
          letter-spacing: 0.2em;
          color: var(--about-ink-dim);
          float: right;
          margin-top: 4px;
        }
        .ab-card-company {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 0.04em;
          color: var(--about-ink);
          margin-bottom: 2px;
          clear: both;
        }
        .ab-card-sub {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: var(--about-ink-dim);
          margin-bottom: 20px;
        }
        .ab-card-stats {
          display: flex;
          border: 1px solid var(--about-rule);
          margin-bottom: 20px;
          overflow: hidden;
        }
        .ab-card-stat {
          flex: 1;
          padding: 14px 8px;
          text-align: center;
          border-right: 1px solid var(--about-rule);
        }
        .ab-card-stat:last-child { border-right: none; }
        .ab-card-stat-val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          color: var(--about-green);
          display: block;
          line-height: 1;
          margin-bottom: 4px;
        }
        .ab-card-stat-lbl {
          font-size: 8px;
          letter-spacing: 0.3em;
          color: var(--about-ink-dim);
        }
        .ab-fill-label {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          letter-spacing: 0.2em;
          color: var(--about-ink-dim);
          margin-bottom: 6px;
        }
        .ab-fill-label span:last-child { color: var(--about-green); }
        .ab-fill-track {
          height: 2px;
          background: rgba(226,240,232,0.08);
          margin-bottom: 20px;
          overflow: hidden;
        }
        .ab-fill-bar {
          height: 100%;
          width: 68%;
          background: var(--about-green);
          opacity: 0.7;
        }
        .ab-trust {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ab-trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--about-ink-dim);
        }
        .ab-trust-check {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: rgba(74,222,128,0.12);
          border: 1px solid rgba(74,222,128,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* sections */
        .about-section {
          padding: 80px 48px;
          border-bottom: 1px solid var(--about-rule);
          max-width: 1280px;
          margin: 0 auto;
        }
        .ab-sec-eyebrow {
          font-size: 9px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--about-ink-dim);
          margin-bottom: 16px;
        }
        .ab-sec-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(56px, 7vw, 72px);
          line-height: 0.95;
          letter-spacing: 0.01em;
          margin-bottom: 48px;
        }
        .ab-sec-title span { color: var(--about-green); }

        /* problem cards */
        .ab-problem-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 700px) {
          .ab-problem-grid { grid-template-columns: 1fr; }
          .ab-hero-inner { flex-direction: column; }
          .ab-card { width: 100%; }
          .ab-hero { padding: 100px 24px 60px; }
          .about-section { padding: 60px 24px; }
          .ab-hiw-grid { grid-template-columns: 1fr !important; }
        }
        .ab-prob-card {
          background: rgba(74,222,128,0.03);
          border: 1px solid var(--about-rule);
          padding: 40px 32px;
          transition: border-color 0.2s;
        }
        .ab-prob-card:hover { border-color: rgba(74,222,128,0.2); }
        .ab-prob-icon {
          width: 36px; height: 36px;
          border: 1px solid rgba(74,222,128,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          color: var(--about-green);
        }
        .ab-prob-h {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 0.03em;
          color: var(--about-ink);
          margin-bottom: 16px;
        }
        .ab-prob-p {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          line-height: 1.75;
          color: var(--about-ink-dim);
          font-weight: 300;
        }

        /* how it works */
        .ab-hiw-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
        }
        .ab-hiw-col-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 0.04em;
          color: var(--about-ink);
          margin-bottom: 4px;
        }
        .ab-hiw-col-sub {
          font-size: 10px;
          letter-spacing: 0.25em;
          color: var(--about-ink-dim);
          margin-bottom: 32px;
          text-transform: uppercase;
        }
        .ab-step {
          display: flex;
          gap: 18px;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .ab-step-num {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(74,222,128,0.12);
          border: 1px solid rgba(74,222,128,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          color: var(--about-green);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .ab-step-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          line-height: 1.7;
          color: var(--about-ink-dim);
          font-weight: 300;
        }

        /* why on-chain */
        .ab-onchain-box {
          background: rgba(74,222,128,0.03);
          border: 1px solid var(--about-rule);
          padding: 64px 56px;
        }
        .ab-onchain-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(40px, 5vw, 60px);
          line-height: 1;
          letter-spacing: 0.01em;
          color: var(--about-ink);
          margin-bottom: 24px;
          max-width: 680px;
        }
        .ab-onchain-p {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          line-height: 1.8;
          color: var(--about-ink-dim);
          max-width: 680px;
          margin-bottom: 36px;
          font-weight: 300;
        }
        .ab-badges {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ab-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(74,222,128,0.28);
          padding: 8px 18px;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--about-green);
          background: rgba(74,222,128,0.05);
        }
        .ab-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--about-green);
          opacity: 0.6;
          flex-shrink: 0;
        }

        /* roadmap */
        .ab-roadmap {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .ab-phase {
          display: flex;
          gap: 28px;
          padding-bottom: 40px;
          position: relative;
        }
        .ab-phase-line {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .ab-phase-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }
        .ab-phase-dot.active  { background: var(--about-green); box-shadow: 0 0 10px rgba(74,222,128,0.5); }
        .ab-phase-dot.future  { background: rgba(226,240,232,0.15); border: 1px solid var(--about-rule); }
        .ab-phase-connector {
          width: 1px;
          flex: 1;
          margin-top: 6px;
        }
        .ab-phase-connector.active  { background: var(--about-green); opacity: 0.4; }
        .ab-phase-connector.future  { background: var(--about-rule); }
        .ab-phase:last-child .ab-phase-connector { display: none; }
        .ab-phase-body { flex: 1; }
        .ab-phase-head {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 8px;
        }
        .ab-phase-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px;
          letter-spacing: 0.04em;
        }
        .ab-phase-name.active { color: var(--about-ink); }
        .ab-phase-name.future { color: rgba(226,240,232,0.3); }
        .ab-phase-tag {
          font-size: 8px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--about-green);
          border: 1px solid rgba(74,222,128,0.3);
          padding: 2px 8px;
        }
        .ab-phase-desc {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          line-height: 1.7;
          font-weight: 300;
          color: var(--about-ink-dim);
          max-width: 600px;
        }

        /* footer cta */
        .ab-footer-cta {
          padding: 100px 48px;
          text-align: center;
          max-width: 1280px;
          margin: 0 auto;
        }
        .ab-footer-cta-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(56px, 8vw, 96px);
          line-height: 0.95;
          letter-spacing: 0.01em;
          color: var(--about-ink);
          margin-bottom: 16px;
        }
        .ab-footer-cta-sub {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 18px;
          color: var(--about-ink-dim);
          margin-bottom: 40px;
          font-weight: 300;
        }
      `}</style>

      {/* Grain overlay */}
      <canvas ref={grainRef} className="ab-grain" />

      {/* Custom cursor */}
      <div ref={dotRef}  className="ab-dot"  />
      <div ref={ringRef} className="ab-ring" />

      {/* ── Hero ── */}
      <section className="ab-hero ar">
        <div className="ab-hero-inner">

          {/* Left text */}
          <div className="ab-hero-left">
            <p className="ab-eyebrow">§ Protocol — Mission &amp; Vision</p>
            <h1 className="ab-title">
              CREDIT<br />
              MAR<span>KETS.</span>
            </h1>
            <p className="ab-desc">
              Lacus is transparent credit infrastructure for on-chain capital markets. Companies can issue debt, investors can build fixed-income portfolios, and every agreement can be audited end to end.
            </p>
            <div className="ab-cta-row">
              <Link href="/launchpad" className="ab-btn-fill">
                Explore Bonds
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8m0 0L7 3m4 4L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link href="/whitepaper" className="ab-btn-ghost">
                Read Whitepaper
              </Link>
            </div>
          </div>

          {/* Mock bond card */}
          <div className="ab-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span className="ab-card-badge">Active Bond</span>
              <span className="ab-card-network">Solana Devnet</span>
            </div>
            <p className="ab-card-company">NovaTech AI</p>
            <p className="ab-card-sub">Series A Bridge Note</p>
            <div className="ab-card-stats">
              {[{ label: "APR", value: "18.5%" }, { label: "Term", value: "12 mo" }, { label: "Size", value: "$500K" }].map((s) => (
                <div key={s.label} className="ab-card-stat">
                  <span className="ab-card-stat-val">{s.value}</span>
                  <span className="ab-card-stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="ab-fill-label">
              <span>Filled</span>
              <span>68%</span>
            </div>
            <div className="ab-fill-track">
              <div className="ab-fill-bar" />
            </div>
            <div className="ab-trust">
              {["Loan agreement hashed on-chain", "KYC verified issuer", "Protocol never takes custody"].map((txt) => (
                <div key={txt} className="ab-trust-item">
                  <span className="ab-trust-check">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {txt}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="about-section ar">
        <p className="ab-sec-eyebrow">§ 01 — The Problem</p>
        <h2 className="ab-sec-title">TWO MARKETS.<br /><span>BOTH BROKEN.</span></h2>
        <div className="ab-problem-grid">
          <div className="ab-prob-card">
            <div className="ab-prob-icon">
              {/* Building icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <path d="M9 22V12h6v10M9 7h1m4 0h1M9 12h1m4 0h1" />
              </svg>
            </div>
            <h3 className="ab-prob-h">Companies can't access debt</h3>
            <p className="ab-prob-p">
              Traditional debt markets are built for incumbents. Startups, SMEs, and newer operators still struggle to access straightforward financing even when the business itself is healthy. For many of them, the options collapse to dilution, delay, or rejection.
            </p>
          </div>
          <div className="ab-prob-card">
            <div className="ab-prob-icon">
              {/* Users icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="3" />
                <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
                <circle cx="18" cy="7" r="2" />
                <path d="M22 21v-1.5a3 3 0 00-2-2.83" />
              </svg>
            </div>
            <h3 className="ab-prob-h">Retail investors can't access bonds</h3>
            <p className="ab-prob-p">
              Most fixed-income products are still gated behind institutions or wrapped into opaque vehicles. Retail investors rarely get direct access, and when credit is packaged, they often cannot inspect what is actually inside the structure.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="about-section ar">
        <p className="ab-sec-eyebrow">§ 02 — How It Works</p>
        <h2 className="ab-sec-title">DIRECT.<br /><span>TRANSPARENT.</span></h2>
        <div className="ab-hiw-grid">
          <div>
            <p className="ab-hiw-col-title">Issue a bond</p>
            <p className="ab-hiw-col-sub">Raise debt capital on your own terms</p>
            {[
              "Apply with your business info, credit terms, and required documents",
              "Sign a bilateral loan agreement that is hashed for on-chain verification",
              "Your issuance goes live and investors can subscribe without traditional middlemen.",
            ].map((txt, i) => (
              <div key={i} className="ab-step">
                <span className="ab-step-num">{i + 1}</span>
                <p className="ab-step-text">{txt}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="ab-hiw-col-title">Invest in bonds</p>
            <p className="ab-hiw-col-sub">Build transparent fixed-income exposure</p>
            {[
              "Browse issuances, inspect loan terms, and review uploaded financials",
              "Build your own mix of startup credit, lower-risk paper, and future structured products",
              "Exit through peer-to-peer secondary liquidity instead of waiting for legacy settlement cycles.",
            ].map((txt, i) => (
              <div key={i} className="ab-step">
                <span className="ab-step-num">{i + 1}</span>
                <p className="ab-step-text">{txt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why On-Chain ── */}
      <section className="about-section ar">
        <p className="ab-sec-eyebrow">§ 03 — Why On-Chain</p>
        <div className="ab-onchain-box">
          <h2 className="ab-onchain-title">No hidden structures. No black-box credit.</h2>
          <p className="ab-onchain-p">
            Every credit agreement on Lacus is designed to be inspectable. Documents are hashed, settlement is on-chain, and the protocol is built so originators can package bonds, loans, BNPL receivables, or other paper without hiding the underlying assets from investors. The goal is simple: if credit gets bundled, the market should still be able to see what it owns.
          </p>
          <div className="ab-badges">
            {["SHA-256 hashing", "Atomic P2P settlement", "Non-custodial"].map((txt) => (
              <span key={txt} className="ab-badge">
                <span className="ab-badge-dot" />
                {txt}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className="about-section ar">
        <p className="ab-sec-eyebrow">§ 04 — Roadmap</p>
        <h2 className="ab-sec-title">WHERE WE&rsquo;RE<br /><span>GOING.</span></h2>
        <div className="ab-roadmap">
          {[
            {
              name: "Phase 1 — Prototype",
              tag: "CURRENT",
              active: true,
              desc: "Core issuance, buying, yield, and secondary flows are proven in prototype form while the next architecture moves to Solana Devnet.",
            },
            {
              name: "Phase 2 — Solana Devnet Launch",
              tag: null,
              active: false,
              desc: "Ship the Solana-native program architecture, wallet layer, and indexing model for the next version of Lacus.",
            },
            {
              name: "Phase 3 — Portfolio Layer",
              tag: null,
              active: false,
              desc: "Let investors build diversified fixed-income portfolios across startup debt, safer paper, and future packaged credit strategies.",
            },
            {
              name: "Phase 4 — Credit Packaging",
              tag: null,
              active: false,
              desc: "Package bonds, receivables, BNPL flows, mortgages, and other debt instruments into auditable structures instead of opaque products.",
            },
            {
              name: "Phase 5 — Equity & IPO Rails",
              tag: null,
              active: false,
              desc: "Extend the infrastructure toward tokenized equity and eventually internet-native IPO flows built on the same transparent market rails.",
            },
          ].map((phase) => (
            <div key={phase.name} className="ab-phase">
              <div className="ab-phase-line">
                <span className={`ab-phase-dot ${phase.active ? "active" : "future"}`} />
                <span className={`ab-phase-connector ${phase.active ? "active" : "future"}`} />
              </div>
              <div className="ab-phase-body">
                <div className="ab-phase-head">
                  <span className={`ab-phase-name ${phase.active ? "active" : "future"}`}>
                    {phase.name}
                  </span>
                  {phase.tag && <span className="ab-phase-tag">{phase.tag}</span>}
                </div>
                <p className="ab-phase-desc">{phase.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="ab-footer-cta ar">
        <h2 className="ab-footer-cta-title">READ THE<br />WHITEPAPER.</h2>
        <p className="ab-footer-cta-sub">Technical architecture, compliance framework, and legal approach.</p>
        <Link href="/whitepaper" className="ab-btn-fill">
          Open Whitepaper
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8m0 0L7 3m4 4L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
