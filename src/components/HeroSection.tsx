"use client";

import Link from "next/link";
import YieldBathymetryCard from "./YieldBathymetryCard";
import { useAnimatedCounters } from "@/lib/useClientInteractions";

export default function HeroSection() {
  useAnimatedCounters();

  return (
    <section className="relative">

      {/* ── FIXED SPINE LINE — runs the full viewport height ── */}
      <div
        className="fixed inset-y-0 left-1/2 pointer-events-none spine-fade"
        style={{
          zIndex: 1,
          width: "1px",
          transform: "translateX(-50%)",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(125,211,252,0.45) 12%, rgba(125,211,252,0.70) 32%, rgba(167,139,250,0.70) 62%, rgba(167,139,250,0.40) 84%, transparent 100%)",
        }}
      />

      {/* ── FLOW DOTS — three dots sliding down the spine ── */}
      {[
        { delay: "0s",    color: "var(--aqua-soft)",  glow: "125,211,252" },
        { delay: "-1.1s", color: "var(--lilac)",       glow: "196,181,253" },
        { delay: "-2.2s", color: "var(--aqua-bright)", glow: "165,243,252" },
      ].map((dot, i) => (
        <div
          key={i}
          className="fixed pointer-events-none spine-dot spine-fade"
          style={{
            zIndex: 1,
            left: "calc(50% - 4px)",
            top: 0,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: dot.color,
            boxShadow: `0 0 10px rgba(${dot.glow},0.9)`,
            animationDelay: dot.delay,
          }}
        />
      ))}

      {/* ── CENTRAL SPINE NODE ── */}
      <div
        className="fixed left-1/2 pointer-events-none spine-fade"
        style={{
          zIndex: 2,
          top: "50vh",
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* outer ring */}
        <div
          style={{
            position: "absolute",
            inset: "-10px",
            borderRadius: "50%",
            border: "1px solid rgba(125,211,252,0.15)",
          }}
        />
        {/* mid ring */}
        <div
          style={{
            position: "absolute",
            inset: "-4px",
            borderRadius: "50%",
            border: "1px solid rgba(125,211,252,0.25)",
          }}
        />
        {/* core */}
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            border: "1.5px solid rgba(125,211,252,0.6)",
            background: "var(--abyss)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 0 18px rgba(125,211,252,0.25), 0 0 44px rgba(125,211,252,0.08)",
          }}
        >
          <div
            className="ping-ring"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "1px solid rgba(125,211,252,0.35)",
            }}
          />
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--aqua-soft)",
              boxShadow: "0 0 8px var(--aqua-soft)",
            }}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SPLIT HERO — 3-col grid: left | spine-gap | right
      ════════════════════════════════════════════════════ */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 80px 1fr",
          minHeight: "calc(100vh - 72px)",
          alignItems: "start",
          position: "relative",
          zIndex: 3,
        }}
      >

        {/* ── LEFT COLUMN — Issuers ── */}
        <div
          style={{
            padding: "100px 80px 80px 60px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            textAlign: "right",
          }}
        >
          {/* Eyebrow */}
          <div
            className="eyebrow eyebrow-rule mb-10 reveal"
            style={{ color: "var(--aqua-bright)" }}
          >
            For Companies &amp; Startups
          </div>

          {/* Heading */}
          <h1
            className="font-display text-[var(--ink)] leading-[0.96] tracking-tight reveal reveal-d1"
            style={{ fontSize: "clamp(2.6rem, 3.8vw, 4.4rem)" }}
          >
            Raise capital.
            <br />
            <span className="italic grad-ink-interactive cursor-pointer">
              Without asking permission.
            </span>
          </h1>

          {/* Body */}
          <p
            className="mt-8 text-[1rem] leading-[1.7] text-[var(--ink2)] reveal reveal-d2"
            style={{ maxWidth: "36ch" }}
          >
            Banks turn you down. Bond markets demand months of paperwork and a
            team of lawyers. Lacus lets any company issue a bond on-chain, in
            minutes, on terms you define.
          </p>

          {/* Tags */}
          <div
            className="mt-6 flex flex-wrap gap-2 justify-end reveal reveal-d2"
          >
            {["Bond Issuance", "Structured Credit", "KYC Verified"].map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.60rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "4px 12px",
                  borderRadius: "100px",
                  border: "1px solid rgba(125,211,252,0.2)",
                  background: "rgba(125,211,252,0.05)",
                  color: "var(--aqua-bright)",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 reveal reveal-d3">
            <Link
              href="/apply"
              className="btn-primary btn-magnetic px-7 py-4 text-[0.92rem] flex items-center gap-3"
            >
              Issue a Bond
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7h8m0 0L7 3m4 4L7 11"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {/* Metrics */}
          <div
            className="mt-16 grid grid-cols-3 gap-8 w-full reveal reveal-d4"
            style={{ borderTop: "1px solid var(--rule)", paddingTop: "32px" }}
          >
            <div className="metric-wrap">
              <div className="eyebrow-dim mb-2">Value Locked</div>
              <div className="font-display tab text-[2rem] leading-none">
                <span className="metric-val text-[var(--ink)]">
                  $
                  <span
                    className="counter"
                    data-target="482.1"
                    data-decimals="1"
                  >
                    482.1
                  </span>
                </span>
                <span className="text-[var(--ink3)] text-[1.2rem]">M</span>
              </div>
            </div>
            <div className="metric-wrap">
              <div className="eyebrow-dim mb-2">Issuers</div>
              <div className="font-display tab text-[2rem] leading-none">
                <span className="metric-val text-[var(--ink)]">
                  <span
                    className="counter"
                    data-target="128"
                    data-decimals="0"
                  >
                    128
                  </span>
                </span>
              </div>
            </div>
            <div className="metric-wrap">
              <div className="eyebrow-dim mb-2">Settlement</div>
              <div className="font-display tab text-[2rem] leading-none">
                <span className="metric-val text-[var(--ink)]">
                  <span
                    className="counter"
                    data-target="400"
                    data-decimals="0"
                  >
                    400
                  </span>
                </span>
                <span className="text-[var(--ink3)] text-[1.2rem]">ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER — just spacing; spine + node are fixed-position ── */}
        <div />

        {/* ── RIGHT COLUMN — Investors + YieldBathymetryCard ── */}
        <div
          style={{
            padding: "100px 60px 80px 80px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Eyebrow */}
          <div
            className="eyebrow eyebrow-rule mb-10 reveal"
            style={{ color: "var(--lilac)" }}
          >
            For Investors
          </div>

          {/* Heading */}
          <h2
            className="font-display text-[var(--ink)] leading-[0.96] tracking-tight reveal reveal-d1"
            style={{ fontSize: "clamp(2.6rem, 3.8vw, 4.4rem)" }}
          >
            The bond market was never
            <br />
            <span className="italic grad-ink-interactive cursor-pointer">
              built for you.
            </span>
          </h2>

          {/* Body */}
          <p
            className="mt-8 text-[1rem] leading-[1.7] text-[var(--ink2)] reveal reveal-d2"
            style={{ maxWidth: "36ch" }}
          >
            Until now. Mix high-yield startup bonds with lower-risk instruments.
            Build a portfolio you can actually see inside: every position, every
            cashflow, auditable on-chain.
          </p>

          {/* Tags */}
          <div className="mt-6 flex flex-wrap gap-2 reveal reveal-d2">
            {["Custom Portfolios", "P2P Secondary", "Instant Settlement"].map(
              (t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.60rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    padding: "4px 12px",
                    borderRadius: "100px",
                    border: "1px solid rgba(196,181,253,0.2)",
                    background: "rgba(196,181,253,0.05)",
                    color: "var(--lilac)",
                  }}
                >
                  {t}
                </span>
              )
            )}
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-4 reveal reveal-d3">
            <Link
              href="/launchpad"
              className="btn-primary btn-magnetic px-7 py-4 text-[0.92rem] flex items-center gap-3"
            >
              Launch the App
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7h8m0 0L7 3m4 4L7 11"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link href="/whitepaper" className="btn-ghost px-7 py-4 text-[0.92rem]">
              Read the Whitepaper
            </Link>
          </div>

          {/* Yield Bathymetry Card */}
          <div className="mt-14 hidden lg:block reveal reveal-d4">
            <YieldBathymetryCard />
          </div>
        </div>
      </div>
    </section>
  );
}
