"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Lock,
  FileText,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState({ bondCount: 0, totalTvl: 0, investorCount: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data: bonds } = await supabase
        .from("bonds")
        .select("total_issue_size, filled_percentage");
      const bondCount = (bonds ?? []).length;
      const totalTvl = (bonds ?? []).reduce(
        (sum, b) => sum + b.total_issue_size * (b.filled_percentage / 100),
        0
      );
      const { data: holdings } = await supabase
        .from("user_holdings")
        .select("wallet_address");
      const investorCount = new Set(
        (holdings ?? []).map((h: { wallet_address: string }) => h.wallet_address)
      ).size;
      setStats({ bondCount, totalTvl, investorCount });
      setStatsLoading(false);
    }
    fetchStats();
  }, []);

  const fmtTvl = (v: number) => {
    if (v === 0) return "—";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <>
      {/* ─── Hero Section ─── */}
      <section style={{ position: "relative", paddingTop: "176px", paddingBottom: "128px", overflow: "hidden", background: "#10131b" }}>
        {/* Hero gradient */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% -20%, rgba(94, 139, 255, 0.15) 0%, rgba(16, 19, 27, 0) 60%)" }} />
        
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 32px", position: "relative", zIndex: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "64px", alignItems: "center" }}>
            {/* Left: Content */}
            <div>
              {/* Badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 12px", borderRadius: "9999px", background: "rgba(49,53,61,0.3)", border: "1px solid rgba(67,70,84,0.2)", marginBottom: "32px" }}>
                <span style={{ display: "flex", width: "8px", height: "8px", borderRadius: "50%", background: "#45dfa4" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Solana Devnet</span>
              </div>
              
              {/* Headline */}
              <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "56px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#e0e2ed", marginBottom: "24px" }}>
                Transparent credit markets for issuers and investors
              </h1>
              
              {/* Subheadline */}
              <p style={{ fontSize: "18px", lineHeight: "1.6", color: "#c3c6d6", maxWidth: "540px", marginBottom: "40px" }}>
                Lacus helps companies issue on-chain debt, lets investors build fixed-income portfolios, and opens the door to auditable structured credit on Solana.
              </p>
              
              {/* CTAs */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                <Link
                  href="/launchpad"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "16px 40px",
                    background: "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
                    color: "#001849",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    fontFamily: "Manrope, sans-serif",
                    boxShadow: "0 8px 24px rgba(179,197,255,0.2)",
                    textDecoration: "none",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(179,197,255,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(179,197,255,0.2)"; }}
                >
                  Explore Bonds
                  <ArrowRight style={{ width: "16px", height: "16px" }} />
                </Link>
                <Link
                  href="/apply"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "16px 40px",
                    background: "rgba(54,57,66,0.1)",
                    border: "1px solid rgba(67,70,84,0.3)",
                    color: "#e0e2ed",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    fontFamily: "Manrope, sans-serif",
                    textDecoration: "none",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(54,57,66,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(54,57,66,0.1)"; }}
                >
                  Issue a Bond
                </Link>
              </div>
            </div>
            
            {/* Right: Visual Card */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: "-16px", background: "rgba(179,197,255,0.05)", filter: "blur(48px)", borderRadius: "50%" }} />
              <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Mock Bond Card */}
                <div style={{ background: "rgba(24,28,35,0.6)", backdropFilter: "blur(20px)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(67,70,84,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#0a0e16", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(67,70,84,0.2)" }}>
                        <ShieldCheck style={{ width: "20px", height: "20px", color: "#b3c5ff" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Manrope, sans-serif", color: "#e0e2ed" }}>Lacus Credit Demo</div>
                        <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#c3c6d6", fontWeight: 600 }}>Fixed Rate · 12 Mo</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#45dfa4" }}>10% APY</div>
                      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#c3c6d6" }}>Fixed USDC</div>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "#0a0e16", borderRadius: "9999px", overflow: "hidden", marginBottom: "16px" }}>
                    <div style={{ width: "67%", height: "100%", background: "#b3c5ff" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#c3c6d6", marginBottom: "12px" }}>
                    <span>Raised: $150 USDC</span>
                    <span>Target: $500 USDC</span>
                  </div>
                  <div style={{ textAlign: "center", fontSize: "9px", color: "rgba(195,198,214,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Demo Data</div>
                </div>
                
                {/* Small Feature Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ background: "#0a0e16", padding: "20px", borderRadius: "12px", border: "1px solid rgba(67,70,84,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <ShieldCheck style={{ width: "16px", height: "16px", color: "#b3c5ff" }} />
                      <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6", fontWeight: 600 }}>P2P Secondary</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#e0e2ed" }}>Escrow Protected</div>
                  </div>
                  <div style={{ background: "#0a0e16", padding: "20px", borderRadius: "12px", border: "1px solid rgba(67,70,84,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#45dfa4" }} />
                      <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6", fontWeight: 600 }}>Solana Devnet</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#e0e2ed" }}>Testnet Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live Stats Bar ─── */}
      <section style={{ background: "#181c23", borderTop: "1px solid rgba(67,70,84,0.1)", borderBottom: "1px solid rgba(67,70,84,0.1)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "40px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#c3c6d6", marginBottom: "12px" }}>Active Bonds</span>
              {statsLoading ? (
                <div style={{ width: "60px", height: "36px", background: "rgba(195,198,214,0.1)", borderRadius: "8px", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              ) : (
                <div style={{ fontFamily: "Manrope, sans-serif", fontSize: "36px", fontWeight: 800, color: "#e0e2ed" }}>{stats.bondCount > 0 ? stats.bondCount : "—"}</div>
              )}
              <p style={{ fontSize: "12px", color: "rgba(195,198,214,0.6)", marginTop: "8px" }}>Live Bond Offerings</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingLeft: "48px", borderLeft: "1px solid rgba(67,70,84,0.2)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#c3c6d6", marginBottom: "12px" }}>Total Volume</span>
              {statsLoading ? (
                <div style={{ width: "120px", height: "36px", background: "rgba(195,198,214,0.1)", borderRadius: "8px", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              ) : (
                <div style={{ fontFamily: "Manrope, sans-serif", fontSize: "36px", fontWeight: 800, color: "#e0e2ed" }}>{fmtTvl(stats.totalTvl)}</div>
              )}
              <p style={{ fontSize: "12px", color: "#45dfa4", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", marginTop: "8px" }}>
                <Sparkles style={{ width: "12px", height: "12px" }} />
                Verified on Chain
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingLeft: "48px", borderLeft: "1px solid rgba(67,70,84,0.2)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#c3c6d6", marginBottom: "12px" }}>Investors</span>
              {statsLoading ? (
                <div style={{ width: "80px", height: "36px", background: "rgba(195,198,214,0.1)", borderRadius: "8px", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              ) : (
                <div style={{ fontFamily: "Manrope, sans-serif", fontSize: "36px", fontWeight: 800, color: "#e0e2ed" }}>{stats.investorCount > 0 ? stats.investorCount : "—"}</div>
              )}
              <p style={{ fontSize: "12px", color: "rgba(195,198,214,0.6)", marginTop: "8px" }}>Global Participation</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bento Grid Features ─── */}
      <section style={{ padding: "128px 32px", background: "#10131b" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ marginBottom: "64px" }}>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "32px", fontWeight: 700, marginBottom: "16px", letterSpacing: "-0.01em", color: "#e0e2ed" }}>How Lacus Works</h2>
            <p style={{ fontSize: "16px", color: "#c3c6d6", maxWidth: "640px" }}>Issue tokenized debt, construct fixed-income portfolios, and move toward transparent structured credit on an open settlement layer.</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px", minHeight: "600px" }}>
            {/* Large feature */}
            <div 
              style={{ 
                gridColumn: "span 8",
                background: "#1c2027",
                borderRadius: "16px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#262a32"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1c2027"; }}
            >
              <div style={{ position: "relative", zIndex: 10 }}>
                <ShieldCheck style={{ width: "36px", height: "36px", color: "#b3c5ff", marginBottom: "24px" }} />
                <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, marginBottom: "16px", color: "#e0e2ed" }}>Tokenized Credit Issuance</h3>
                <p style={{ fontSize: "14px", color: "#c3c6d6", maxWidth: "420px", lineHeight: "1.6" }}>Founders, operators, and asset originators can issue on-chain debt with their own terms, documentation, maturity, and pricing logic.</p>
              </div>
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "66%", height: "66%", opacity: 0.2, pointerEvents: "none" }}>
                <div style={{ width: "100%", height: "100%", background: "radial-gradient(circle, rgba(179,197,255,0.3) 0%, transparent 70%)", borderRadius: "50% 0 0 0" }} />
              </div>
            </div>
            
            {/* Small feature */}
            <div 
              style={{ 
                gridColumn: "span 4",
                background: "#1c2027",
                borderRadius: "16px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#262a32"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1c2027"; }}
            >
              <div>
                <Zap style={{ width: "36px", height: "36px", color: "#45dfa4", marginBottom: "24px" }} />
                <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: "#e0e2ed" }}>Portfolio Construction</h3>
                <p style={{ fontSize: "13px", color: "#c3c6d6", lineHeight: "1.5" }}>Investors can blend higher-yield startup credit with lower-risk instruments instead of being forced into opaque pooled products.</p>
              </div>
            </div>
            
            {/* Medium feature */}
            <div 
              style={{ 
                gridColumn: "span 4",
                background: "#1c2027",
                borderRadius: "16px",
                padding: "32px",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#262a32"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1c2027"; }}
            >
              <FileText style={{ width: "36px", height: "36px", color: "#dae1ff", marginBottom: "24px" }} />
              <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: "#e0e2ed" }}>P2P Secondary Market</h3>
              <p style={{ fontSize: "13px", color: "#c3c6d6", lineHeight: "1.5" }}>Bond holders can list tokens for sale at any time. Buyers settle atomically through escrow — no counterparty risk.</p>
            </div>
            
            {/* Wide feature */}
            <div 
              style={{ 
                gridColumn: "span 8",
                background: "#1c2027",
                borderRadius: "16px",
                padding: "32px",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#262a32"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1c2027"; }}
            >
              <Lock style={{ width: "36px", height: "36px", color: "#b3c5ff", marginBottom: "24px" }} />
              <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: "#e0e2ed" }}>Transparent Structured Credit</h3>
              <p style={{ fontSize: "13px", color: "#c3c6d6", lineHeight: "1.5" }}>Lacus is designed to make loan packages, bond baskets, and future credit products legible instead of black boxes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA Section ─── */}
      <section style={{ padding: "128px 32px", background: "#0a0e16" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ background: "#1c2027", borderRadius: "32px", padding: "80px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: "linear-gradient(to left, rgba(179,197,255,0.05), transparent)" }} />
            <div style={{ position: "relative", zIndex: 10, maxWidth: "640px" }}>
              <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "48px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "32px", lineHeight: 1.1, color: "#e0e2ed" }}>
                Ready to build transparent credit?
              </h2>
              <p style={{ fontSize: "18px", lineHeight: "1.6", color: "#c3c6d6", marginBottom: "48px" }}>
                Launch debt products, build portfolios, and prepare for Solana-native settlement.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                <Link
                  href="/launchpad"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "20px 40px",
                    background: "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
                    color: "#001849",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    fontFamily: "Manrope, sans-serif",
                    boxShadow: "0 12px 36px rgba(179,197,255,0.3)",
                    textDecoration: "none",
                    transition: "transform 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  Explore Markets
                  <ArrowRight style={{ width: "16px", height: "16px" }} />
                </Link>
                <Link
                  href="/apply"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "20px 40px",
                    background: "rgba(49,53,61,0.5)",
                    border: "1px solid rgba(67,70,84,0.3)",
                    color: "#e0e2ed",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    fontFamily: "Manrope, sans-serif",
                    textDecoration: "none",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(49,53,61,0.8)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(49,53,61,0.5)"; }}
                >
                  Issue with Lacus
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
