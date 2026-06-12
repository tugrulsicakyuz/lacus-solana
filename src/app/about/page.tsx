"use client";

import Link from "next/link";

export default function AboutPage() {
  // Scroll reveal: GlobalInteractions'taki global .reveal observer'ı yönetir
  return (
    <div className="about-root">

      {/* ── Hero ── */}
      <section className="ab-hero reveal">
        <div className="ab-hero-inner">

          {/* Left text */}
          <div className="ab-hero-left">
            <p className="ab-eyebrow">§ Protocol — Mission &amp; Vision</p>
            <h1 className="ab-title">
              CREDIT<br />
              MAR<span>KETS.</span>
            </h1>
            <p className="ab-desc">
              Lacus is transparent credit infrastructure for on-chain capital markets. Companies can issue debt, investors can build fixed-income portfolios, and every agreement is a bilateral loan — auditable, transferable, on-chain.
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
      <section className="about-section reveal">
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
              Traditional debt markets are built for incumbents. Startups and SMEs struggle to access straightforward financing even when the business is healthy. The bank laughs. The VC wants equity. Lacus offers a third option.
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
              Most fixed-income products are still gated behind institutions or wrapped into opaque vehicles. Retail investors rarely get direct access. When credit gets packaged, they can't see what's inside — 2008 proved what that costs.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="about-section reveal">
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
      <section className="about-section reveal">
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
      <section className="about-section reveal">
        <p className="ab-sec-eyebrow">§ 04 — Roadmap</p>
        <h2 className="ab-sec-title">WHERE WE&rsquo;RE<br /><span>GOING.</span></h2>
        <div className="ab-roadmap">
          {[
            {
              name: "Phase 1 — Devnet Launch",
              tag: null,
              active: false,
              desc: "Core issuance, buying, yield, and portfolio flows live on Solana Devnet. Primary market open.",
            },
            {
              name: "Phase 2 — Secondary Market",
              tag: "CURRENT",
              active: true,
              desc: "P2P trading layer — list, match, and settle bond positions without a central exchange.",
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
      <section className="ab-footer-cta reveal">
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
