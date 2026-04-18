"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  ShieldCheck,
  BarChart3,
  Droplets,
  ArrowLeft,
  Loader2,
  Info,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";

/* ── Types ── */
interface Bond {
  id: number;
  issuer_name: string;
  symbol: string;
  apy: number;
  maturity_months: number;
  total_issue_size: number;
  price_per_token: number;
  filled_percentage: number;
  contract_address?: string;
}

interface BondDocument {
  id: number;
  document_type: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

const DOC_LABELS: Record<string, string> = {
  income_statement:          "Income Statement",
  balance_sheet:             "Balance Sheet",
  bank_statement:            "Bank Statement",
  articles_of_incorporation: "Articles of Incorporation",
  ein_document:              "EIN Document",
  fund_usage_plan:           "Fund Usage Plan",
};

/* ── Helpers ── */
function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function fmtCurrencyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtCurrency(n);
}

function maturityLabel(months: number): string {
  if (months < 12) return `${months}Mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years}Y` : `${years}Y ${rem}Mo`;
}

/* ── Page ── */
function BondDetailContent() {
  const params = useParams();
  const symbol = (params?.symbol as string ?? "").toUpperCase();
  const { address } = useAccount();

  const [bond, setBond] = useState<Bond | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [marketData, setMarketData] = useState({ volume24h: 0, totalLiquidity: 0, holderCount: 0 });
  const [userHolding, setUserHolding] = useState<{ balance: number; unclaimed_yield: number } | null>(null);
  const [documents, setDocuments] = useState<BondDocument[]>([]);

  /* fetch bond */
  useEffect(() => {
    if (!symbol) return;
    async function fetchBond() {
      const { data, error } = await supabase
        .from("bonds")
        .select("*")
        .eq("symbol", symbol)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setBond(data as Bond);
      }
      setLoading(false);
    }
    fetchBond();
  }, [symbol]);

  /* fetch market data */
  useEffect(() => {
    if (!bond) return;
    async function fetchMarket() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: txs } = await supabase
        .from("transactions")
        .select("usdc_amount")
        .eq("bond_symbol", bond!.symbol)
        .gte("created_at", since);
      const volume = (txs ?? []).reduce((s, t) => s + (t.usdc_amount || 0), 0);

      const { data: holdings } = await supabase
        .from("user_holdings")
        .select("balance")
        .eq("bond_symbol", bond!.symbol);
      const totalTokens = (holdings ?? []).reduce((s, h) => s + (h.balance || 0), 0);
      const liquidity = totalTokens * (bond!.price_per_token || 0);
      const holderCount = (holdings ?? []).filter((h) => h.balance > 0).length;

      setMarketData({ volume24h: volume, totalLiquidity: liquidity, holderCount });
    }
    fetchMarket();
  }, [bond]);

  /* fetch user holding */
  useEffect(() => {
    if (!bond || !address) return;
    async function fetchHolding() {
      const { data } = await supabase
        .from("user_holdings")
        .select("balance, unclaimed_yield")
        .eq("wallet_address", address!.toLowerCase())
        .eq("bond_symbol", bond!.symbol)
        .maybeSingle();
      setUserHolding(data ?? null);
    }
    fetchHolding();
  }, [bond, address]);

  /* fetch documents */
  useEffect(() => {
    if (!bond) return;
    async function fetchDocs() {
      const { data } = await supabase
        .from("borrower_documents")
        .select("*")
        .eq("bond_symbol", bond!.symbol)
        .order("document_type");
      if (data) setDocuments(data as BondDocument[]);
    }
    fetchDocs();
  }, [bond]);

  const getDocumentUrl = (path: string) => {
    const { data } = supabase.storage.from("borrower-documents").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <section style={{ background: "#10131b", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: "32px", height: "32px", color: "#4c7df4", animation: "spin 1s linear infinite" }} />
      </section>
    );
  }

  /* ── Not found ── */
  if (notFound || !bond) {
    return (
      <section style={{ background: "#10131b", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", paddingTop: "96px" }}>
        <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, color: "#e0e2ed" }}>Bond Not Found</p>
        <p style={{ color: "#c3c6d6", fontSize: "14px" }}>No bond found with symbol &ldquo;{symbol}&rdquo;.</p>
        <Link
          href="/launchpad"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "16px",
            padding: "12px 24px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
            color: "#001849",
            fontSize: "14px",
            fontWeight: 700,
            fontFamily: "Manrope, sans-serif",
            textDecoration: "none",
            transition: "opacity 0.2s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <ArrowLeft style={{ width: "16px", height: "16px" }} />
          Back to Launchpad
        </Link>
      </section>
    );
  }

  const totalSupply = bond.price_per_token > 0 ? bond.total_issue_size / bond.price_per_token : 0;
  const soldTokens = totalSupply * (bond.filled_percentage / 100);
  const remainingTokens = totalSupply - soldTokens;
  const fillPct = Math.min(bond.filled_percentage, 100);

  return (
    <>
      {/* ── Hero Header ── */}
      <section style={{ background: "#10131b", paddingTop: "104px", paddingBottom: "48px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 32px" }}>
          <Link
            href="/launchpad"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "#8d909f",
              textDecoration: "none",
              transition: "color 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#c3c6d6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#8d909f"; }}
          >
            <ArrowLeft style={{ width: "14px", height: "14px" }} />
            Back to Launchpad
          </Link>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "32px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
                <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "48px", fontWeight: 800, letterSpacing: "-0.02em", color: "#e0e2ed", lineHeight: 1 }}>
                  {bond.symbol}
                </h1>
                {bond.filled_percentage >= 100 && (
                  <span
                    style={{
                      padding: "6px 16px",
                      borderRadius: "9999px",
                      background: "rgba(195,198,214,0.1)",
                      color: "#8d909f",
                      border: "1px solid rgba(141,144,159,0.2)",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase"
                    }}
                  >
                    Sold Out
                  </span>
                )}
              </div>
              <p style={{ fontSize: "16px", color: "#8d909f" }}>{bond.issuer_name}</p>
              
              {/* APY Hero Metric */}
              <div style={{ marginTop: "24px", display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
                <div style={{ fontFamily: "Manrope, sans-serif", fontSize: "56px", fontWeight: 800, letterSpacing: "-0.02em", color: "#45dfa4" }}>
                  {bond.apy}%
                </div>
                <div style={{ fontSize: "14px", color: "#8d909f", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>APY</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link
                href={`/primary?bond=${bond.symbol}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 32px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
                  color: "#002b75",
                  fontSize: "14px",
                  fontWeight: 700,
                  fontFamily: "Manrope, sans-serif",
                  textDecoration: "none",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <DollarSign style={{ width: "16px", height: "16px" }} />
                Buy Bonds
              </Link>
              <Link
                href={`/secondary?bond=${bond.symbol}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 32px",
                  borderRadius: "8px",
                  background: "#31353d",
                  color: "#b3c5ff",
                  fontSize: "14px",
                  fontWeight: 700,
                  fontFamily: "Manrope, sans-serif",
                  textDecoration: "none",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#262a32"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#31353d"; }}
              >
                <BarChart3 style={{ width: "16px", height: "16px" }} />
                Secondary
              </Link>
              {bond.contract_address && (
                <a
                  href={`https://sepolia.basescan.org/address/${bond.contract_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 24px",
                    borderRadius: "8px",
                    border: "1px solid rgba(67,70,84,0.3)",
                    background: "transparent",
                    color: "#8d909f",
                    fontSize: "13px",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "color 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#c3c6d6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#8d909f"; }}
                >
                  <ExternalLink style={{ width: "14px", height: "14px" }} />
                  Contract
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section style={{ background: "#10131b", paddingTop: "48px", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 32px" }}>

          {/* ── Key Metrics Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "48px" }}>
            {[
              { icon: DollarSign, label: "Price per Token", value: fmtCurrency(bond.price_per_token), color: "#e0e2ed" },
              { icon: Calendar, label: "Maturity", value: maturityLabel(bond.maturity_months), color: "#e0e2ed" },
              { icon: TrendingUp, label: "Total Issue", value: fmtCurrencyCompact(bond.total_issue_size), color: "#e0e2ed" },
            ].map((s) => (
              <div
                key={s.label}
                style={{ background: "#181c23", padding: "24px", borderRadius: "8px", border: "1px solid rgba(67,70,84,0.1)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#8d909f", fontWeight: 600 }}>
                  <s.icon style={{ width: "14px", height: "14px" }} />
                  {s.label}
                </div>
                <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── Bond Details Section ── */}
          <div style={{ background: "#181c23", borderRadius: "12px", padding: "32px", marginBottom: "32px" }}>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#e0e2ed", marginBottom: "32px" }}>Bond Details</h2>

            <div>
              {[
                { label: "Issuer", value: bond.issuer_name },
                { label: "Symbol", value: bond.symbol },
                { label: "Total Supply", value: `${totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens` },
                { label: "Total Value", value: fmtCurrencyCompact(bond.total_issue_size) },
                { label: "Remaining Supply", value: `${remainingTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens` },
                { label: "Network", value: "Base Sepolia" },
              ].map((row, idx, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 0",
                    borderBottom: idx < arr.length - 1 ? "1px solid rgba(67,70,84,0.1)" : "none",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(195,198,214,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#8d909f" }}>{row.label}</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#e0e2ed" }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Fill progress */}
            <div style={{ marginTop: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#8d909f", fontWeight: 600 }}>Fill Rate</span>
                <span style={{ fontFamily: "Manrope, sans-serif", fontSize: "16px", fontWeight: 700, color: "#e0e2ed" }}>{bond.filled_percentage}%</span>
              </div>
              <div style={{ width: "100%", height: "8px", borderRadius: "9999px", overflow: "hidden", background: "#0a0e16" }}>
                <div
                  style={{
                    width: `${fillPct}%`,
                    height: "100%",
                    borderRadius: "9999px",
                    background: fillPct >= 80 ? "#45dfa4" : "#b3c5ff",
                    transition: "width 0.5s ease"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px", color: "#8d909f" }}>
                <span>{soldTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} sold</span>
                <span>{totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} total</span>
              </div>
            </div>
          </div>

          {/* ── Market Data Section ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            <div style={{ background: "#181c23", borderRadius: "12px", padding: "24px" }}>
              <h3 style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#8d909f", fontWeight: 600, marginBottom: "16px" }}>Market Data</h3>
              <div>
                {[
                  { icon: BarChart3, label: "24h Volume", value: marketData.volume24h > 0 ? fmtCurrencyCompact(marketData.volume24h) : "—" },
                  { icon: Droplets, label: "Total Liquidity", value: marketData.totalLiquidity > 0 ? fmtCurrencyCompact(marketData.totalLiquidity) : "—" },
                  { icon: Wallet, label: "Investors", value: marketData.holderCount > 0 ? `${marketData.holderCount} addresses` : "—" },
                ].map((row, idx) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: idx < 2 ? "1px solid rgba(67,70,84,0.1)" : "none"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#8d909f" }}>
                      <row.icon style={{ width: "14px", height: "14px" }} />
                      {row.label}
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#e0e2ed" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contract address */}
            {bond.contract_address ? (
              <div style={{ background: "#181c23", borderRadius: "12px", padding: "24px" }}>
                <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#8d909f", fontWeight: 600, marginBottom: "12px" }}>Contract Address</p>
                <a
                  href={`https://sepolia.basescan.org/address/${bond.contract_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#b3c5ff",
                    wordBreak: "break-all",
                    textDecoration: "none",
                    transition: "color 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#5e8bff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#b3c5ff"; }}
                >
                  {bond.contract_address}
                </a>
              </div>
            ) : (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "12px", padding: "24px" }}>
                <p style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#fbbf24" }}>
                  <Info style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                  Contract address not yet assigned. This bond is pending deployment.
                </p>
              </div>
            )}
          </div>

          {/* ── User Holdings ── */}
          {address && userHolding && userHolding.balance > 0 && (
            <div style={{ background: "#181c23", border: "1px solid rgba(76,125,244,0.15)", borderRadius: "12px", padding: "32px" }}>
              <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#e0e2ed", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Wallet style={{ width: "20px", height: "20px", color: "#b3c5ff" }} />
                Your Position
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px" }}>
                <div>
                  <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#8d909f", fontWeight: 600, marginBottom: "8px" }}>Balance</p>
                  <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, color: "#b3c5ff" }}>
                    {userHolding.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })} {bond.symbol}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#8d909f", fontWeight: 600, marginBottom: "8px" }}>Value</p>
                  <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, color: "#e0e2ed" }}>
                    {fmtCurrency(userHolding.balance * bond.price_per_token)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#8d909f", fontWeight: 600, marginBottom: "8px" }}>Accrued Yield</p>
                  <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, color: "#45dfa4" }}>
                    {fmtCurrency(userHolding.unclaimed_yield ?? 0)}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "24px" }}>
                <Link
                  href="/dashboard"
                  style={{
                    fontSize: "12px",
                    color: "#b3c5ff",
                    textDecoration: "underline",
                    transition: "color 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#5e8bff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#b3c5ff"; }}
                >
                  View in Portfolio →
                </Link>
              </div>
            </div>
          )}

          {/* ── No wallet notice ── */}
          {!address && (
            <div style={{ background: "#181c23", borderRadius: "12px", padding: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
              <Wallet style={{ width: "24px", height: "24px", flexShrink: 0, color: "#8d909f", opacity: 0.5 }} />
              <p style={{ fontSize: "14px", color: "#8d909f" }}>
                Connect your wallet to view your position in this bond.
              </p>
            </div>
          )}

        </div>
      </section>

      {documents.length > 0 && (
        <section style={{ background: "#10131b", paddingTop: "48px", paddingBottom: "80px" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 32px" }}>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#e0e2ed", marginBottom: "24px" }}>
              Issuer Documents
            </h2>
            <div style={{ background: "#181c23", borderRadius: "12px", overflow: "hidden" }}>
              {documents.map((doc, i) => (
                <a
                  key={doc.id}
                  href={getDocumentUrl(doc.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 24px",
                    borderBottom: i < documents.length - 1 ? "1px solid rgba(67,70,84,0.1)" : "none",
                    textDecoration: "none",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(195,198,214,0.02)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ display: "flex", width: "40px", height: "40px", alignItems: "center", justifyContent: "center", borderRadius: "8px", background: "rgba(179,197,255,0.1)" }}>
                      <svg style={{ width: "20px", height: "20px", color: "#b3c5ff" }} viewBox="0 0 16 16" fill="none">
                        <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#e0e2ed", marginBottom: "4px" }}>
                        {DOC_LABELS[doc.document_type] ?? doc.document_type}
                      </p>
                      <p style={{ fontSize: "12px", color: "#8d909f" }}>{doc.file_name}</p>
                    </div>
                  </div>
                  <svg style={{ width: "18px", height: "18px", flexShrink: 0, color: "#8d909f" }} viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              ))}
            </div>
            <p style={{ marginTop: "16px", fontSize: "11px", color: "#8d909f", lineHeight: "1.6" }}>
              These documents were submitted by the issuer. Sparrow Protocol does not verify the accuracy or authenticity of any uploaded document. Investors are solely responsible for conducting their own due diligence.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

export default function BondDetailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#05080f" }} />}>
      <BondDetailContent />
    </Suspense>
  );
}
