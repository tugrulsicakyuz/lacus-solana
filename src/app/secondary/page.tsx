"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const features = [
  { n: "001", title: "PEER-TO-PEER", sub: "Direct Trading", desc: "List your bond tokens at your price. No intermediary, no custody, no counterparty risk." },
  { n: "002", title: "INSTANT SETTLEMENT", sub: "T+0", desc: "Settlement between two wallets, one transaction. No clearing house, no T+2 delay." },
  { n: "003", title: "TRANSPARENT", sub: "Fully On-Chain", desc: "Every bid, every ask, every fill — on-chain and auditable. Unlike a CDO, nothing is hidden." },
  { n: "004", title: "VERIFIED", sub: "Lacus Instruments Only", desc: "Terms, maturity, coupon and issuer verified on-chain. No unvetted instruments enter the book." },
  { n: "005", title: "NON-CUSTODIAL", sub: "Your Keys, Your Tokens", desc: "No bridge, no wrapped asset. SPL tokens trade directly from your wallet throughout." },
  { n: "006", title: "CONTINUOUS", sub: "Always Open", desc: "No trading hours. No gates. A permanent, always-on market for structured on-chain credit." },
];

const phases = [
  { n: "01", label: "PRIMARY MARKET", status: "live", desc: "Bond issuance and direct purchase from issuers. SOL in, yield-bearing tokens out." },
  { n: "02", label: "PORTFOLIO & YIELD", status: "live", desc: "Holdings dashboard, coupon claims, maturity redemption, principal deposits." },
  { n: "03", label: "SECONDARY MARKET", status: "building", desc: "P2P listings, order matching, atomic settlement between holders." },
  { n: "04", label: "STRUCTURED PRODUCTS", status: "planned", desc: "Transparent portfolio construction — mix high-yield and safe instruments. The CDO, rebuilt with full visibility." },
];

export default function SecondaryMarket() {
  const headerCanvasRef = useRef<HTMLCanvasElement>(null);

  // Header canvas: drifting blue lines
  useEffect(() => {
    const canvas = headerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

  // Scroll reveal: GlobalInteractions'taki global .reveal observer'ı yönetir

  return (
      <div className="sec-root">

        {/* HEADER */}
        <section className="sec-header">
          <canvas ref={headerCanvasRef} className="sec-header-canvas" />
          <div className="sec-eyebrow reveal">§ Secondary Market — P2P Trading</div>
          <h1 className="sec-title reveal">
            SECOND<span className="blue">ARY</span>
          </h1>
          <div className="sec-header-right reveal">
            <p>
              Your position is yours to hold or trade.<br />
              Loan agreements transfer peer-to-peer —<br />
              no central exchange, no intermediary, no lockup.
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
              Issue, buy, trade, and build portfolios. Four phases — one open credit infrastructure.
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
            While secondary trading is being built, the primary market is live. Browse verified issuers, pick your yield, and buy directly — no intermediary.
          </p>
          <Link href="/primary" className="sec-btn reveal">
            <span>Go to Primary Market</span>
            <div className="sec-btn-arrow" />
          </Link>
        </section>

      </div>
  );
}
