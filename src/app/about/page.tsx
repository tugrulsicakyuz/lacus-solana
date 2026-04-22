"use client";

import Link from "next/link";
import { Building2, Users, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "@/lib/useClientInteractions";

export default function AboutPage() {
  useScrollReveal();
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="max-w-[1280px] mx-auto px-8 pt-24 pb-16 reveal">
        <div className="flex items-center gap-20 flex-wrap">
          
          {/* Left: text content */}
          <div className="flex-1 min-w-[420px]">
            <div className="eyebrow eyebrow-rule mb-10">
              Built for Solana
            </div>
            
            <h1 className="font-display text-[var(--ink)] text-[3rem] leading-[1.2] mb-6 max-w-[600px]">
              Credit markets, rebuilt without black boxes.
            </h1>
            
            <p className="text-lg leading-[1.7] text-[var(--ink2)] max-w-[520px] mb-8">
              Lacus is transparent credit infrastructure for on-chain capital markets. Companies can issue debt, investors can build fixed-income portfolios, and every agreement can be audited end to end.
            </p>
            
            <div className="flex gap-4 flex-wrap">
              <Link href="/launchpad" className="btn-primary px-8 py-4">
                Explore Bonds
              </Link>
              <Link href="/whitepaper" className="btn-ghost px-8 py-4">
                Read Whitepaper
              </Link>
            </div>
          </div>

          {/* Right: mock bond card */}
          <div className="flex-shrink-0 w-[360px]">
            <div className="card-luminous rounded-2xl p-7 relative overflow-hidden">
              {/* Glow accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--lilac-deep)] opacity-10 blur-3xl pointer-events-none" />

              {/* Card header */}
              <div className="flex justify-between items-center mb-5 relative">
                <span className="eyebrow px-3 py-1 rounded-lg bg-[var(--lilac)] bg-opacity-10 border border-[var(--lilac)] border-opacity-20">
                  Active Bond
                </span>
                <span className="text-[11px] text-[var(--ink4)]">Solana Devnet</span>
              </div>

              {/* Company */}
              <div className="mb-5 relative">
                <p className="text-xl font-bold text-[var(--ink)] mb-1">NovaTech AI</p>
                <p className="text-sm text-[var(--ink3)]">Series A Bridge Note</p>
              </div>

              {/* Stats row */}
              <div className="flex gap-0 mb-5 bg-[var(--rule-soft)] rounded-xl border border-[var(--rule)] overflow-hidden relative">
                {[
                  { label: "APR", value: "18.5%" },
                  { label: "Term", value: "12 mo" },
                  { label: "Size", value: "$500K" },
                ].map((s, i) => (
                  <div key={s.label} className={`flex-1 p-4 text-center ${i < 2 ? "border-r border-[var(--rule)]" : ""}`}>
                    <p className="text-base font-bold text-[var(--ink)] font-mono mb-1">{s.value}</p>
                    <p className="eyebrow-dim">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Fill bar */}
              <div className="mb-5 relative">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-[var(--ink3)]">Filled</span>
                  <span className="text-xs font-semibold text-[var(--ink)] font-mono tab">68%</span>
                </div>
                <div className="h-1.5 bg-[var(--shore)] rounded-full overflow-hidden">
                  <div className="h-full w-[68%] bg-gradient-to-r from-[var(--aqua-soft)] to-[var(--lilac)] rounded-full" />
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex flex-col gap-2 relative">
                {[
                  "Loan agreement hashed on-chain",
                  "KYC verified issuer",
                  "Protocol never takes custody",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[var(--aqua)] bg-opacity-15 flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="var(--aqua)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-xs text-[var(--ink3)]">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* The Problem Section */}
      <section className="max-w-[1280px] mx-auto px-8 mt-20 reveal">
        <p className="eyebrow-dim mb-4">THE PROBLEM</p>
        <h2 className="font-display text-[2rem] text-[var(--ink)] mb-8">Two markets. Both broken.</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="card-luminous rounded-2xl p-8">
            <Building2 className="w-8 h-8 text-[var(--lilac)] mb-5" />
            <h3 className="text-xl font-bold text-[var(--ink)] mb-4">Companies can't access debt</h3>
            <p className="text-sm leading-[1.7] text-[var(--ink2)]">
              Traditional debt markets are built for incumbents. Startups, SMEs, and newer operators still struggle to access straightforward financing even when the business itself is healthy. For many of them, the options collapse to dilution, delay, or rejection.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card-luminous rounded-2xl p-8">
            <Users className="w-8 h-8 text-[var(--aqua)] mb-5" />
            <h3 className="text-xl font-bold text-[var(--ink)] mb-4">Retail investors can't access bonds</h3>
            <p className="text-sm leading-[1.7] text-[var(--ink2)]">
              Most fixed-income products are still gated behind institutions or wrapped into opaque vehicles. Retail investors rarely get direct access, and when credit is packaged, they often cannot inspect what is actually inside the structure.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-[1280px] mx-auto px-8 mt-20 reveal">
        <p className="eyebrow-dim mb-4">HOW IT WORKS</p>
        <h2 className="font-display text-[2rem] text-[var(--ink)] mb-12">Direct. Transparent. On-chain.</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* For Companies */}
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[var(--ink)] mb-2">Issue a bond</h3>
              <p className="text-sm text-[var(--ink3)]">Raise debt capital on your own terms</p>
            </div>
            
            <div className="flex flex-col gap-5">
              {[
                "Apply with your business info, credit terms, and required documents",
                "Sign a bilateral loan agreement that is hashed for on-chain verification",
                "Your issuance goes live and investors can subscribe without traditional middlemen."
              ].map((text, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex w-7 h-7 items-center justify-center rounded-full bg-[var(--lilac)] bg-opacity-15 text-[var(--lilac)] text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm leading-[1.7] text-[var(--ink2)] pt-1">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* For Investors */}
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[var(--ink)] mb-2">Invest in bonds</h3>
              <p className="text-sm text-[var(--ink3)]">Build transparent fixed-income exposure</p>
            </div>
            
            <div className="flex flex-col gap-5">
              {[
                "Browse issuances, inspect loan terms, and review uploaded financials",
                "Build your own mix of startup credit, lower-risk paper, and future structured products",
                "Exit through peer-to-peer secondary liquidity instead of waiting for legacy settlement cycles."
              ].map((text, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex w-7 h-7 items-center justify-center rounded-full bg-[var(--aqua)] bg-opacity-15 text-[var(--aqua)] text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm leading-[1.7] text-[var(--ink2)] pt-1">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why On-Chain Section */}
      <section className="max-w-[1280px] mx-auto px-8 mt-20 reveal">
        <div className="card-luminous rounded-2xl p-12">
          <h2 className="font-display text-[2rem] text-[var(--ink)] mb-6">No hidden structures. No black-box credit.</h2>
          <p className="text-base leading-[1.8] text-[var(--ink2)] max-w-[700px] mb-8">
            Every credit agreement on Lacus is designed to be inspectable. Documents are hashed, settlement is on-chain, and the protocol is built so originators can package bonds, loans, BNPL receivables, or other paper without hiding the underlying assets from investors. The goal is simple: if credit gets bundled, the market should still be able to see what it owns.
          </p>
          
          <div className="flex gap-3 flex-wrap">
            {["SHA-256 document hashing", "Atomic P2P settlement", "Non-custodial protocol design"].map((text) => (
              <div key={text} className="inline-flex items-center gap-2 bg-[var(--aqua)] bg-opacity-8 border border-[var(--aqua)] border-opacity-22 rounded-full px-4 py-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--aqua)]" />
                <span className="text-sm font-medium text-[var(--aqua)]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="max-w-[1280px] mx-auto px-8 mt-20 reveal">
        <p className="eyebrow-dim mb-4">ROADMAP</p>
        <h2 className="font-display text-[2rem] text-[var(--ink)] mb-10">Where we're going.</h2>
        
        <div className="flex flex-col gap-8">
          {/* Phase 1 - Current */}
          <div className="pl-5 border-l-2 border-[var(--lilac)] relative">
            <span className="absolute left-[-6px] top-0 w-2.5 h-2.5 rounded-full bg-[var(--lilac)]" />
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-[var(--ink)]">Phase 1 — Prototype</span>
              <span className="eyebrow px-3 py-1 rounded-lg bg-[var(--lilac)] bg-opacity-15 text-[var(--lilac)]">CURRENT</span>
            </div>
            <p className="text-sm text-[var(--ink3)]">Core issuance, buying, yield, and secondary flows are proven in prototype form while the next architecture moves to Solana Devnet.</p>
          </div>

          {/* Phase 2 */}
          <div className="pl-5 border-l-2 border-[var(--rule)] relative">
            <span className="absolute left-[-6px] top-0 w-2.5 h-2.5 rounded-full bg-[var(--ink4)]" />
            <div className="mb-2">
              <span className="text-lg font-bold text-[var(--ink4)]">Phase 2 — Solana Devnet Launch</span>
            </div>
            <p className="text-sm text-[var(--ink3)]">Ship the Solana-native program architecture, wallet layer, and indexing model for the next version of Lacus.</p>
          </div>

          {/* Phase 3 */}
          <div className="pl-5 border-l-2 border-[var(--rule)] relative">
            <span className="absolute left-[-6px] top-0 w-2.5 h-2.5 rounded-full bg-[var(--ink4)]" />
            <div className="mb-2">
              <span className="text-lg font-bold text-[var(--ink4)]">Phase 3 — Portfolio Layer</span>
            </div>
            <p className="text-sm text-[var(--ink3)]">Let investors build diversified fixed-income portfolios across startup debt, safer paper, and future packaged credit strategies.</p>
          </div>

          {/* Phase 4 */}
          <div className="pl-5 border-l-2 border-[var(--rule)] relative">
            <span className="absolute left-[-6px] top-0 w-2.5 h-2.5 rounded-full bg-[var(--ink4)]" />
            <div className="mb-2">
              <span className="text-lg font-bold text-[var(--ink4)]">Phase 4 — Credit Packaging</span>
            </div>
            <p className="text-sm text-[var(--ink3)]">Package bonds, receivables, BNPL flows, mortgages, and other debt instruments into auditable structures instead of opaque products.</p>
          </div>

          {/* Phase 5 */}
          <div className="pl-5 border-l-2 border-[var(--rule)] relative">
            <span className="absolute left-[-6px] top-0 w-2.5 h-2.5 rounded-full bg-[var(--ink4)]" />
            <div className="mb-2">
              <span className="text-lg font-bold text-[var(--ink4)]">Phase 5 — Equity & IPO Rails</span>
            </div>
            <p className="text-sm text-[var(--ink3)]">Extend the infrastructure toward tokenized equity and eventually internet-native IPO flows built on the same transparent market rails.</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-[1280px] mx-auto px-8 mt-20 mb-20 reveal">
        <div className="text-center">
          <h2 className="font-display text-2xl text-[var(--ink)] mb-3">Read the full whitepaper</h2>
          <p className="text-base text-[var(--ink3)] mb-8">Technical architecture, compliance framework, and legal approach.</p>
          <Link href="/whitepaper" className="btn-primary px-8 py-4 inline-flex items-center gap-2">
            Open Whitepaper
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8m0 0L7 3m4 4L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
