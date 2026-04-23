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

  /* ── Loading ── */
  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--lilac)] animate-spin" />
      </section>
    );
  }

  /* ── Not found ── */
  if (notFound || !bond) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center gap-4 pt-24">
        <p className="font-display text-[var(--ink)] text-2xl">Bond Not Found</p>
        <p className="text-sm text-[var(--ink3)]">No bond found with symbol &ldquo;{symbol}&rdquo;.</p>
        <Link href="/launchpad" className="btn-primary flex items-center gap-2 mt-4 px-6 py-3">
          <ArrowLeft className="w-4 h-4" />
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
      <section className="pt-24 pb-12">
        <div className="max-w-[1280px] mx-auto px-8">
          <Link
            href="/launchpad"
            className="inline-flex items-center gap-1.5 mb-6 text-[13px] text-[var(--ink3)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Launchpad
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-4 flex-wrap mb-3">
                <h1 className="font-display text-[var(--ink)] text-[3rem] leading-none tracking-tight">
                  {bond.symbol}
                </h1>
                {bond.filled_percentage >= 100 && (
                  <span className="px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink3)] text-[11px] font-mono uppercase tracking-widest">
                    Sold Out
                  </span>
                )}
              </div>
              <p className="text-base text-[var(--ink3)] mt-1">{bond.issuer_name}</p>
              
              {/* APY Hero Metric */}
              <div className="mt-6 inline-flex items-baseline gap-2">
                <div className="font-display text-[var(--aqua-bright)] text-[3.5rem] leading-none">
                  {bond.apy}%
                </div>
                <div className="text-sm text-[var(--ink3)] uppercase tracking-widest">APY</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Link
                href={`/primary?bond=${bond.symbol}`}
                className="btn-primary flex items-center gap-2 px-8 py-3.5"
              >
                <DollarSign className="w-4 h-4" />
                Buy Bonds
              </Link>
              <Link
                href={`/secondary?bond=${bond.symbol}`}
                className="btn-ghost flex items-center gap-2 px-8 py-3.5"
              >
                <BarChart3 className="w-4 h-4" />
                Secondary
              </Link>
              {bond.contract_address && (
                <a
                  href={`https://explorer.solana.com/address/${bond.contract_address}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost flex items-center gap-2 px-6 py-3.5 text-[13px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Contract
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="pb-20">
        <div className="max-w-[1280px] mx-auto px-8">

          {/* ── Key Metrics Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[
              { icon: DollarSign, label: "Price per Token", value: fmtCurrency(bond.price_per_token) },
              { icon: Calendar, label: "Maturity", value: maturityLabel(bond.maturity_months) },
              { icon: TrendingUp, label: "Total Issue", value: fmtCurrencyCompact(bond.total_issue_size) },
            ].map((s) => (
              <div
                key={s.label}
                className="card-luminous rounded-xl p-6"
              >
                <div className="flex items-center gap-1.5 mb-3 eyebrow-dim">
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </div>
                <p className="text-2xl font-semibold text-[var(--ink)] font-mono">{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── Bond Details Section ── */}
          <div className="card-luminous rounded-2xl p-8 mb-6">
            <h2 className="text-base font-semibold text-[var(--ink)] mb-8 eyebrow">Bond Details</h2>

            <div>
              {[
                { label: "Issuer", value: bond.issuer_name },
                { label: "Symbol", value: bond.symbol },
                { label: "Total Supply", value: `${totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens` },
                { label: "Total Value", value: fmtCurrencyCompact(bond.total_issue_size) },
                { label: "Remaining Supply", value: `${remainingTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens` },
                { label: "Network", value: "Solana Devnet" },
              ].map((row, idx, arr) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-5 border-b border-[var(--rule)] last:border-b-0 hover:bg-[var(--rule-soft)] transition-colors rounded px-2 -mx-2"
                >
                  <span className="text-[13px] text-[var(--ink3)]">{row.label}</span>
                  <span className="text-sm font-medium text-[var(--ink)] font-mono">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Fill progress */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <span className="eyebrow-dim">Fill Rate</span>
                <span className="font-mono text-base font-semibold text-[var(--ink)]">{bond.filled_percentage}%</span>
              </div>
              <div className="w-full h-2 bg-[var(--shore)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${fillPct >= 80 ? 'bg-[var(--aqua)]' : 'bg-gradient-to-r from-[var(--aqua-soft)] to-[var(--lilac)]'}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-[var(--ink4)] font-mono">{soldTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} sold</span>
                <span className="text-[11px] text-[var(--ink4)] font-mono">{totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} total</span>
              </div>
            </div>
          </div>

          {/* ── Market Data Section ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card-luminous rounded-2xl p-6">
              <h3 className="eyebrow-dim mb-4">Market Data</h3>
              <div>
                {[
                  { icon: BarChart3, label: "24h Volume", value: marketData.volume24h > 0 ? fmtCurrencyCompact(marketData.volume24h) : "—" },
                  { icon: Droplets, label: "Total Liquidity", value: marketData.totalLiquidity > 0 ? fmtCurrencyCompact(marketData.totalLiquidity) : "—" },
                  { icon: Wallet, label: "Investors", value: marketData.holderCount > 0 ? `${marketData.holderCount} addresses` : "—" },
                ].map((row, idx) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-3 border-b border-[var(--rule)] last:border-b-0"
                  >
                    <span className="flex items-center gap-1.5 text-[13px] text-[var(--ink3)]">
                      <row.icon className="w-3.5 h-3.5" />
                      {row.label}
                    </span>
                    <span className="text-sm font-semibold text-[var(--ink)] font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contract address */}
            {bond.contract_address ? (
              <div className="card-luminous rounded-2xl p-6">
                <p className="eyebrow-dim mb-3">Contract Address</p>
                <a
                  href={`https://explorer.solana.com/address/${bond.contract_address}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[var(--lilac)] hover:text-[var(--lilac-bright)] break-all transition-colors"
                >
                  {bond.contract_address}
                </a>
              </div>
            ) : (
              <div className="card-luminous rounded-2xl p-6 border border-[var(--coral)]/20 bg-[var(--coral)]/5">
                <p className="flex items-center gap-2 text-[12px] text-[var(--coral)]">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  Contract address not yet assigned. This bond is pending deployment.
                </p>
              </div>
            )}
          </div>

          {/* ── User Holdings ── */}
          {address && userHolding && userHolding.balance > 0 && (
            <div className="card-luminous rounded-2xl p-8 mb-6 border border-[var(--lilac)]/15">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--ink)] mb-6">
                <Wallet className="w-5 h-5 text-[var(--lilac)]" />
                Your Position
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="eyebrow-dim mb-2">Balance</p>
                  <p className="text-2xl font-semibold text-[var(--lilac)] font-mono">
                    {userHolding.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })} {bond.symbol}
                  </p>
                </div>
                <div>
                  <p className="eyebrow-dim mb-2">Value</p>
                  <p className="text-2xl font-semibold text-[var(--ink)] font-mono">
                    {fmtCurrency(userHolding.balance * bond.price_per_token)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow-dim mb-2">Accrued Yield</p>
                  <p className="text-2xl font-semibold text-[var(--aqua-bright)] font-mono">
                    {fmtCurrency(userHolding.unclaimed_yield ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className="text-sm text-[var(--lilac)] hover:text-[var(--lilac-bright)] transition-colors link-grad"
                >
                  View in Portfolio →
                </Link>
              </div>
            </div>
          )}

          {/* ── No wallet notice ── */}
          {!address && (
            <div className="card-luminous rounded-xl p-6 flex items-center gap-4 mb-6">
              <Wallet className="w-5 h-5 text-[var(--ink4)] flex-shrink-0" />
              <p className="text-sm text-[var(--ink3)]">
                Connect your wallet to view your position in this bond.
              </p>
            </div>
          )}

        </div>
      </section>

      {documents.length > 0 && (
        <section className="pb-20">
          <div className="max-w-[1280px] mx-auto px-8">
            <h2 className="eyebrow mb-6">
              Issuer Documents
            </h2>
            <div className="card-luminous rounded-2xl overflow-hidden">
              {documents.map((doc, i) => (
                <a
                  key={doc.id}
                  href={getDocumentUrl(doc.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-6 py-5 border-b border-[var(--rule)] last:border-b-0 hover:bg-[var(--surface)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-[var(--lilac)]/10">
                      <svg className="w-5 h-5 text-[var(--lilac)]" viewBox="0 0 16 16" fill="none">
                        <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)] mb-1">
                        {DOC_LABELS[doc.document_type] ?? doc.document_type}
                      </p>
                      <p className="text-xs text-[var(--ink3)]">{doc.file_name}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0 text-[var(--ink4)]" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-[var(--ink4)] leading-relaxed">
              These documents were submitted by the issuer. Lacus does not verify the accuracy or authenticity of any uploaded document. Investors are solely responsible for conducting their own due diligence.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

export default function BondDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <BondDetailContent />
    </Suspense>
  );
}
