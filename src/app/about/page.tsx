"use client";

import Link from "next/link";
import { Building2, Users, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  return (
    <div style={{ background: "#05080f", minHeight: "100vh" }}>
      {/* Hero Section */}
      <section style={{ padding: "96px 32px 64px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "80px", flexWrap: "wrap" }}>
          
          {/* Left: text content */}
          <div style={{ flex: "1 1 420px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.5)" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b" }}>Built on Base Sepolia Testnet</span>
            </div>
            
            <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "48px", fontWeight: 700, lineHeight: "1.2", color: "#f1f5f9", marginBottom: "24px", maxWidth: "600px" }}>
              The bond market, rebuilt for everyone.
            </h1>
            
            <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#64748b", maxWidth: "520px", marginBottom: "32px" }}>
              Sparrow is a peer-to-peer bond issuance and investment platform. Any company can raise debt capital. Any investor can earn fixed yield. Every agreement is auditable on-chain.
            </p>
            
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link
                href="/launchpad"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "14px 32px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
                  color: "#002b75",
                  fontSize: "15px",
                  fontWeight: 700,
                  fontFamily: "Manrope, sans-serif",
                  textDecoration: "none",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Explore Bonds
              </Link>
              <Link
                href="/whitepaper"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "14px 32px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8",
                  fontSize: "15px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "border-color 0.2s, color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.color = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                Read Whitepaper
              </Link>
            </div>
          </div>

          {/* Right: mock bond card */}
          <div style={{ flex: "0 0 360px" }}>
            <div style={{
              background: "#0d1117",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: "28px",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Glow accent */}
              <div style={{
                position: "absolute", top: 0, right: 0,
                width: "200px", height: "200px",
                background: "radial-gradient(circle, rgba(76,125,244,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />

              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4c7df4", background: "rgba(76,125,244,0.1)", border: "1px solid rgba(76,125,244,0.2)", borderRadius: "6px", padding: "4px 10px" }}>
                  Active Bond
                </span>
                <span style={{ fontSize: "11px", color: "#475569" }}>Base Sepolia</span>
              </div>

              {/* Company */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>NovaTech AI</p>
                <p style={{ fontSize: "13px", color: "#64748b" }}>Series A Bridge Note</p>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: "0", marginBottom: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
                {[
                  { label: "APR", value: "18.5%" },
                  { label: "Term", value: "12 mo" },
                  { label: "Size", value: "$500K" },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1,
                    padding: "14px 10px",
                    textAlign: "center",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", marginBottom: "3px" }}>{s.value}</p>
                    <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Fill bar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Filled</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9" }}>68%</span>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "68%", background: "linear-gradient(90deg, #4c7df4, #7ca3ff)", borderRadius: "99px" }} />
                </div>
              </div>

              {/* Trust badges */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  "Loan agreement hashed on-chain",
                  "KYC verified issuer",
                  "USDC · instant settlement",
                ].map((text) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* The Problem Section */}
      <section style={{ marginTop: "80px", padding: "0 32px", maxWidth: "1400px", margin: "80px auto 0" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "16px" }}>THE PROBLEM</p>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "32px", fontWeight: 700, color: "#f1f5f9", marginBottom: "32px" }}>Two markets. Both broken.</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
          {/* Card 1 */}
          <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "32px" }}>
            <Building2 style={{ width: "32px", height: "32px", color: "#4c7df4", marginBottom: "20px" }} />
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>Companies can't access debt</h3>
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#64748b" }}>
              Traditional bond markets require credit history, banking relationships, and legal infrastructure most companies don't have. A SaaS startup with strong revenue still fails every box on a traditional loan application. Equity or rejection — those are the only options.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "32px" }}>
            <Users style={{ width: "32px", height: "32px", color: "#34d399", marginBottom: "20px" }} />
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>Retail investors can't access bonds</h3>
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#64748b" }}>
              Corporate bonds trade OTC between institutions, in minimum denominations that price out individuals. Retail investors get exposure through funds — opaque packages like the CDOs at the center of the 2008 crisis. No visibility into what's inside.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ marginTop: "80px", padding: "0 32px", maxWidth: "1400px", margin: "80px auto 0" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "16px" }}>HOW IT WORKS</p>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "32px", fontWeight: 700, color: "#f1f5f9", marginBottom: "48px" }}>Direct. Transparent. On-chain.</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "48px" }}>
          {/* For Companies */}
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>Issue a bond</h3>
              <p style={{ fontSize: "13px", color: "#64748b" }}>Raise debt capital on your terms</p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[
                "Apply with your business info and bond parameters",
                "Sign the loan agreement — it's hashed and stored on-chain",
                "Your bond is listed. Investors buy with USDC, funds arrive instantly."
              ].map((text, idx) => (
                <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", width: "28px", height: "28px", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(76,125,244,0.15)", color: "#4c7df4", fontSize: "14px", fontWeight: 700, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#94a3b8", paddingTop: "4px" }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* For Investors */}
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>Invest in bonds</h3>
              <p style={{ fontSize: "13px", color: "#64748b" }}>Earn fixed USDC yield directly</p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[
                "Browse bonds — read terms, financials, and loan agreements",
                "Buy bond tokens with USDC. No intermediary, no clearing delay.",
                "Claim yield on-chain anytime. Sell on the secondary market whenever you want."
              ].map((text, idx) => (
                <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", width: "28px", height: "28px", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(52,211,153,0.15)", color: "#34d399", fontSize: "14px", fontWeight: 700, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#94a3b8", paddingTop: "4px" }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why On-Chain Section */}
      <section style={{ marginTop: "80px", padding: "0 32px", maxWidth: "1400px", margin: "80px auto 0" }}>
        <div style={{ background: "#0d1117", borderRadius: "20px", padding: "48px" }}>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "32px", fontWeight: 700, color: "#f1f5f9", marginBottom: "24px" }}>No hidden structures. No gatekeepers.</h2>
          <p style={{ fontSize: "16px", lineHeight: "1.8", color: "#94a3b8", maxWidth: "700px", marginBottom: "32px" }}>
            Every loan agreement on Sparrow is digitally signed, hashed using SHA-256, and stored immutably on Base. The bond token issued to the lender is cryptographically linked to the document it backs. If the underlying agreement is ever disputed, the on-chain hash is irrefutable. There are no hidden tranches, no opaque ratings, no off-book obligations.
          </p>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {["SHA-256 document hashing", "Atomic P2P settlement", "Publicly auditable records"].map((text) => (
              <div key={text} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: "20px", padding: "8px 16px" }}>
                <CheckCircle2 style={{ width: "16px", height: "16px", color: "#34d399" }} />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#34d399" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section style={{ marginTop: "80px", padding: "0 32px", maxWidth: "1400px", margin: "80px auto 0" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "16px" }}>ROADMAP</p>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "32px", fontWeight: 700, color: "#f1f5f9", marginBottom: "40px" }}>Where we're going.</h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Phase 1 - Current */}
          <div style={{ paddingLeft: "20px", borderLeft: "2px solid #4c7df4", position: "relative" }}>
            <span style={{ position: "absolute", left: "-6px", top: "0", width: "10px", height: "10px", borderRadius: "50%", background: "#4c7df4" }} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>Phase 1 — Testnet</span>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px", borderRadius: "6px", background: "rgba(76,125,244,0.15)", color: "#4c7df4" }}>CURRENT</span>
            </div>
            <p style={{ fontSize: "14px", color: "#64748b" }}>Full protocol deployed to Base Sepolia. Proving P2P bond markets work on-chain.</p>
          </div>

          {/* Phase 2 */}
          <div style={{ paddingLeft: "20px", borderLeft: "2px solid rgba(100,116,139,0.3)", position: "relative" }}>
            <span style={{ position: "absolute", left: "-6px", top: "0", width: "10px", height: "10px", borderRadius: "50%", background: "#475569" }} />
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#475569" }}>Phase 2 — Mainnet Launch</span>
            </div>
            <p style={{ fontSize: "14px", color: "#64748b" }}>Deploy to Base mainnet. Real USDC, real bonds, real capital markets.</p>
          </div>

          {/* Phase 3 */}
          <div style={{ paddingLeft: "20px", borderLeft: "2px solid rgba(100,116,139,0.3)", position: "relative" }}>
            <span style={{ position: "absolute", left: "-6px", top: "0", width: "10px", height: "10px", borderRadius: "50%", background: "#475569" }} />
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#475569" }}>Phase 3 — Portfolio Layer</span>
            </div>
            <p style={{ fontSize: "14px", color: "#64748b" }}>Introduce bond portfolios and auto-rebalancing strategies for diversified yield.</p>
          </div>

          {/* Phase 4 */}
          <div style={{ paddingLeft: "20px", borderLeft: "2px solid rgba(100,116,139,0.3)", position: "relative" }}>
            <span style={{ position: "absolute", left: "-6px", top: "0", width: "10px", height: "10px", borderRadius: "50%", background: "#475569" }} />
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#475569" }}>Phase 4 — Institutional Expansion</span>
            </div>
            <p style={{ fontSize: "14px", color: "#64748b" }}>Multi-chain support and integrations with institutional custody providers.</p>
          </div>

          {/* Phase 5 */}
          <div style={{ paddingLeft: "20px", borderLeft: "2px solid rgba(100,116,139,0.3)", position: "relative" }}>
            <span style={{ position: "absolute", left: "-6px", top: "0", width: "10px", height: "10px", borderRadius: "50%", background: "#475569" }} />
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#475569" }}>Phase 5 — Regulatory Engagement</span>
            </div>
            <p style={{ fontSize: "14px", color: "#64748b" }}>Work with regulators to establish compliance frameworks for on-chain debt markets.</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ marginTop: "80px", marginBottom: "80px", padding: "0 32px", maxWidth: "1400px", margin: "80px auto" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, color: "#f1f5f9", marginBottom: "12px" }}>Read the full whitepaper</h2>
          <p style={{ fontSize: "15px", color: "#64748b", marginBottom: "32px" }}>Technical architecture, compliance framework, and legal approach.</p>
          <Link
            href="/whitepaper"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "14px 32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
              color: "#002b75",
              fontSize: "15px",
              fontWeight: 700,
              fontFamily: "Manrope, sans-serif",
              textDecoration: "none",
              transition: "opacity 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Open Whitepaper →
          </Link>
        </div>
      </section>
    </div>
  );
}
