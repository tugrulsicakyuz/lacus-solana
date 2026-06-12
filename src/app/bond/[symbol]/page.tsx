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
import { useWallet } from "@solana/wallet-adapter-react";
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
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58() ?? null;

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

  if (loading) {
    return (
      <div className="bd-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, color: "#22d3ee", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (notFound || !bond) {
    return (
      <>
        <div className="bd-root" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 96 }}>
          <p style={{ fontFamily: "var(--font-bebas)", fontSize: 32, letterSpacing: "0.12em", color: "#f0e8d8" }}>Bond Not Found</p>
          <p style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(240,232,216,0.4)" }}>No bond found with symbol &ldquo;{symbol}&rdquo;</p>
          <Link href="/launchpad" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, padding: "10px 24px", border: "1px solid rgba(34,211,238,0.6)", color: "#22d3ee", textDecoration: "none", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back to Markets
          </Link>
        </div>
      </>
    );
  }

  const totalSupply = bond.price_per_token > 0 ? bond.total_issue_size / bond.price_per_token : 0;
  const soldTokens = totalSupply * (bond.filled_percentage / 100);
  const remainingTokens = totalSupply - soldTokens;
  const fillPct = Math.min(bond.filled_percentage, 100);

  return (
    <>

      <div className="bd-root">
        <div className="bd-container">

          {/* Back */}
          <Link href="/launchpad" className="bd-back">
            <ArrowLeft style={{ width: 12, height: 12 }} />
            Back to Markets
          </Link>

          {/* Header */}
          <div className="bd-header-row">
            <div>
              <p className="bd-eyebrow">Bond Detail</p>
              <div className="bd-rule" />
              <h1 className="bd-symbol">
                {bond.symbol}
                {bond.filled_percentage >= 100 && <span className="bd-sold-out">Sold Out</span>}
              </h1>
              <p className="bd-issuer">{bond.issuer_name}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="bd-apy-val">{bond.apy}%</div>
              <div className="bd-apy-label">Annual Percentage Yield</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bd-actions" style={{ marginBottom: 40 }}>
            <Link href={`/primary?bond=${bond.symbol}`} className="bd-btn-primary">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign style={{ width: 14, height: 14 }} />
                Buy Bonds
              </span>
            </Link>
            <Link href={`/secondary?bond=${bond.symbol}`} className="bd-btn-ghost">
              <BarChart3 style={{ width: 14, height: 14 }} />
              Secondary Market
            </Link>
            {bond.contract_address && (
              <a
                href={`https://explorer.solana.com/address/${bond.contract_address}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="bd-btn-ghost"
              >
                <ExternalLink style={{ width: 12, height: 12 }} />
                View Contract
              </a>
            )}
          </div>

          {/* Key Metrics */}
          <div className="bd-metrics-grid">
            {[
              { icon: DollarSign, label: "Price per Token", value: fmtCurrency(bond.price_per_token) },
              { icon: Calendar, label: "Maturity", value: maturityLabel(bond.maturity_months) },
              { icon: TrendingUp, label: "Total Issue", value: fmtCurrencyCompact(bond.total_issue_size) },
            ].map((s) => (
              <div key={s.label} className="bd-card">
                <div className="bd-card-label">
                  <s.icon style={{ width: 12, height: 12 }} />
                  {s.label}
                </div>
                <div className="bd-card-value">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Bond Details */}
          <div className="bd-card" style={{ marginBottom: 16, padding: 28 }}>
            <p className="bd-section-title">Bond Details</p>
            {[
              { label: "Issuer", value: bond.issuer_name },
              { label: "Symbol", value: bond.symbol },
              { label: "Total Supply", value: `${totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens` },
              { label: "Total Value", value: fmtCurrencyCompact(bond.total_issue_size) },
              { label: "Remaining Supply", value: `${remainingTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens` },
              { label: "Network", value: "Solana Devnet" },
            ].map((row) => (
              <div key={row.label} className="bd-row">
                <span className="bd-row-label">{row.label}</span>
                <span className="bd-row-value">{row.value}</span>
              </div>
            ))}

            {/* Fill progress */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(240,232,216,0.35)" }}>Fill Rate</span>
                <span style={{ fontFamily: "var(--font-bebas)", fontSize: 22, letterSpacing: "0.06em", color: "#22d3ee" }}>{bond.filled_percentage}%</span>
              </div>
              <div className="bd-fill-bar-track">
                <div className="bd-fill-bar-fill" style={{ width: `${fillPct}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 10, color: "rgba(240,232,216,0.3)" }}>{soldTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} sold</span>
                <span style={{ fontSize: 10, color: "rgba(240,232,216,0.3)" }}>{totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} total</span>
              </div>
            </div>
          </div>

          {/* Market Data + Contract */}
          <div className="bd-two-col">
            <div className="bd-card" style={{ padding: 28 }}>
              <p className="bd-section-title">Market Data</p>
              {[
                { icon: BarChart3, label: "24h Volume", value: marketData.volume24h > 0 ? fmtCurrencyCompact(marketData.volume24h) : "—" },
                { icon: Droplets, label: "Total Liquidity", value: marketData.totalLiquidity > 0 ? fmtCurrencyCompact(marketData.totalLiquidity) : "—" },
                { icon: Wallet, label: "Investors", value: marketData.holderCount > 0 ? `${marketData.holderCount} addresses` : "—" },
              ].map((row) => (
                <div key={row.label} className="bd-row">
                  <span className="bd-row-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <row.icon style={{ width: 11, height: 11 }} />
                    {row.label}
                  </span>
                  <span className="bd-row-value">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="bd-card" style={{ padding: 28 }}>
              <p className="bd-section-title">Contract Address</p>
              {bond.contract_address ? (
                <a
                  href={`https://explorer.solana.com/address/${bond.contract_address}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bd-contract-link"
                >
                  {bond.contract_address}
                </a>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 11, color: "rgba(251,113,133,0.8)", letterSpacing: "0.1em" }}>
                  <Info style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
                  Contract address not yet assigned. This bond is pending deployment.
                </div>
              )}
            </div>
          </div>

          {/* User Holdings */}
          {address && userHolding && userHolding.balance > 0 && (
            <div className="bd-holding-card">
              <p className="bd-holding-title">Your Position</p>
              <div className="bd-holding-grid">
                <div>
                  <div className="bd-card-label">Balance</div>
                  <div className="bd-holding-val">{userHolding.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}</div>
                  <div style={{ fontSize: 10, color: "rgba(240,232,216,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 4 }}>{bond.symbol}</div>
                </div>
                <div>
                  <div className="bd-card-label">Value</div>
                  <div className="bd-holding-val" style={{ color: "#f0e8d8" }}>{fmtCurrency(userHolding.balance * bond.price_per_token)}</div>
                </div>
                <div>
                  <div className="bd-card-label">Accrued Yield</div>
                  <div className="bd-holding-val">{fmtCurrency(userHolding.unclaimed_yield ?? 0)}</div>
                </div>
              </div>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(34,211,238,0.1)" }}>
                <Link href="/dashboard" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#22d3ee", textDecoration: "none" }}>
                  View in Portfolio →
                </Link>
              </div>
            </div>
          )}

          {/* No wallet */}
          {!address && (
            <div className="bd-no-wallet">
              <Wallet style={{ width: 14, height: 14, flexShrink: 0 }} />
              Connect your wallet to view your position in this bond.
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <p className="bd-section-title" style={{ marginBottom: 0 }}>Issuer Documents</p>
              <div className="bd-card" style={{ padding: "0 24px" }}>
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={getDocumentUrl(doc.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bd-doc-row"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg style={{ width: 16, height: 16, color: "#22d3ee" }} viewBox="0 0 16 16" fill="none">
                          <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="bd-doc-name">{DOC_LABELS[doc.document_type] ?? doc.document_type}</div>
                        <div className="bd-doc-sub">{doc.file_name}</div>
                      </div>
                    </div>
                    <ExternalLink style={{ width: 12, height: 12, color: "rgba(240,232,216,0.3)", flexShrink: 0 }} />
                  </a>
                ))}
              </div>
              <p className="bd-disclaimer">
                These documents were submitted by the issuer. Lacus does not verify the accuracy or authenticity of any uploaded document. Investors are solely responsible for conducting their own due diligence.
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function BondDetailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#030d10" }} />}>
      <BondDetailContent />
    </Suspense>
  );
}
