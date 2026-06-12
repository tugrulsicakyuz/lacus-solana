"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
      <div className="lx-loading" style={{ minHeight: "50vh" }}>
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (notFound || !bond) {
    return (
      <div className="lx-wrap">
        <div className="lx-pagehead">
          <div className="lx-kicker">Bond detail</div>
          <h1>Bond Not Found</h1>
          <p className="lx-lede">No bond found with symbol &ldquo;{symbol}&rdquo;</p>
        </div>
        <div style={{ marginTop: 28, paddingBottom: 96 }}>
          <Link href="/primary" className="lx-btn lx-btn-ghost">Back to Markets</Link>
        </div>
      </div>
    );
  }

  const totalSupply = bond.price_per_token > 0 ? bond.total_issue_size / bond.price_per_token : 0;
  const soldTokens = totalSupply * (bond.filled_percentage / 100);
  const remainingTokens = totalSupply - soldTokens;
  const fillPct = Math.min(bond.filled_percentage, 100);
  const isSoldOut = bond.filled_percentage >= 100;

  return (
    <div className="lx-wrap">
      <div className="lx-crumb"><Link href="/primary">MARKETS</Link> / {bond.symbol}</div>
      <div className="lx-pagehead" style={{ paddingTop: 32 }}>
        <div className="lx-kicker">
          Bond detail · {isSoldOut
            ? <span style={{ color: "var(--ink-2)" }}>SOLD OUT</span>
            : <span>● OPEN</span>}
        </div>
        <h1>{bond.symbol}, {bond.issuer_name}</h1>
      </div>

      {/* Price strip */}
      <div className="bd-pricestrip">
        <div><div className="k">Price per unit</div><div className="v num">{fmtCurrency(bond.price_per_token)}</div></div>
        <div><div className="k">Coupon</div><div className="v num">{bond.apy}%</div></div>
        <div><div className="k">Maturity</div><div className="v num">{maturityLabel(bond.maturity_months)}</div></div>
        <div><div className="k">Total issue</div><div className="v num">{fmtCurrencyCompact(bond.total_issue_size)}</div></div>
        <div><div className="k">Investors</div><div className="v num">{marketData.holderCount > 0 ? marketData.holderCount : "--"}</div></div>
      </div>

      <div className="bd-grid">
        {/* Left column */}
        <div>
          {/* Terms */}
          <h3 className="lx-subhead">Terms</h3>
          <div className="lx-drule"></div>
          <div style={{ paddingTop: 18 }}>
            <dl className="lx-dl" style={{ maxWidth: 460 }}>
              <dt>Issuer</dt><dd>{bond.issuer_name}</dd>
              <dt>Symbol</dt><dd className="num">{bond.symbol}</dd>
              <dt>Total supply</dt><dd className="num">{totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} units</dd>
              <dt>Total value</dt><dd className="num">{fmtCurrencyCompact(bond.total_issue_size)}</dd>
              <dt>Remaining</dt><dd className="num">{remainingTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} units</dd>
              <dt>Network</dt><dd>Solana Devnet</dd>
              <dt>Structure</dt><dd>Bilateral loan agreement, peer to peer</dd>
            </dl>
          </div>

          {/* Market data */}
          <div className="lx-subsection">
            <h3 className="lx-subhead">Market data</h3>
            <div className="lx-drule"></div>
            <div style={{ paddingTop: 18 }}>
              <dl className="lx-dl" style={{ maxWidth: 460 }}>
                <dt>24h volume</dt><dd className="num">{marketData.volume24h > 0 ? fmtCurrencyCompact(marketData.volume24h) : "--"}</dd>
                <dt>Total liquidity</dt><dd className="num">{marketData.totalLiquidity > 0 ? fmtCurrencyCompact(marketData.totalLiquidity) : "--"}</dd>
                <dt>Investors</dt><dd className="num">{marketData.holderCount > 0 ? `${marketData.holderCount} addresses` : "--"}</dd>
              </dl>
            </div>
          </div>

          {/* On-chain */}
          <div className="lx-subsection">
            <h3 className="lx-subhead">On-chain</h3>
            <div className="lx-drule"></div>
            {bond.contract_address ? (
              <div className="lx-addr-row">
                <span className="k">Contract</span>
                <code className="num">{bond.contract_address}</code>
                <a
                  href={`https://explorer.solana.com/address/${bond.contract_address}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  EXPLORER ↗
                </a>
              </div>
            ) : (
              <p className="lx-fn">Contract address not yet assigned. This bond is pending deployment.</p>
            )}
          </div>

          {/* Documents */}
          {documents.length > 0 && (
            <div className="lx-subsection">
              <h3 className="lx-subhead">Issuer documents</h3>
              <div className="lx-drule"></div>
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={getDocumentUrl(doc.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lx-addr-row bd-doc"
                >
                  <span className="k">{DOC_LABELS[doc.document_type] ?? doc.document_type}</span>
                  <code>{doc.file_name}</code>
                  <span className="bd-doc-open num">OPEN ↗</span>
                </a>
              ))}
              <p className="lx-fn">
                These documents were submitted by the issuer. Lacus does not verify the accuracy or
                authenticity of any uploaded document. Investors are solely responsible for
                conducting their own due diligence.
              </p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lx-sticky">
          <div className="lx-ticket">
            <div className="lx-ticket-head">
              <button className="on">SUBSCRIBE</button>
            </div>
            <div className="lx-ticket-body">
              <div className="lx-trow"><span>Bond</span><span className="v lx-sym">{bond.symbol}</span></div>
              <div className="lx-trow"><span>Price per unit</span><span className="v num">{fmtCurrency(bond.price_per_token)}</span></div>
              <div className="lx-trow"><span>Coupon</span><span className="v num">{bond.apy}%</span></div>
              <div className="lx-submeter" style={{ margin: "14px 0" }}>
                <div className="cap"><span>Subscribed</span><span className="num">{fillPct}%</span></div>
                <div className="bar"><i style={{ width: `${fillPct}%` }}></i></div>
                <div className="fig num">{soldTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} of {totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} units</div>
              </div>
            </div>
            <div className="lx-ticket-foot" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link href={`/primary?bond=${bond.symbol}`} className="lx-btn lx-btn-solid lx-btn-block">Buy units</Link>
              <Link href={`/secondary?bond=${bond.symbol}`} className="lx-btn lx-btn-ghost lx-btn-block">Secondary market</Link>
            </div>
            <div className="lx-finefoot">SOLANA DEVNET · TEST INSTRUMENTS</div>
          </div>

          {/* Your position */}
          {address && userHolding && userHolding.balance > 0 && (
            <div className="bd-position">
              <h3 className="lx-subhead">Your position</h3>
              <div className="lx-drule"></div>
              <dl className="lx-dl" style={{ paddingTop: 14 }}>
                <dt>Units</dt><dd className="num">{userHolding.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}</dd>
                <dt>Value</dt><dd className="num">{fmtCurrency(userHolding.balance * bond.price_per_token)}</dd>
                <dt>Accrued yield</dt><dd className="num">{fmtCurrency(userHolding.unclaimed_yield ?? 0)}</dd>
              </dl>
              <Link href="/dashboard" className="lx-readmore">View in Dashboard →</Link>
            </div>
          )}
          {!address && (
            <p className="lx-fn">Connect your wallet to view your position in this bond.</p>
          )}
        </div>
      </div>
      <div style={{ paddingBottom: 96 }} />
    </div>
  );
}

export default function BondDetailPage() {
  return (
    <Suspense fallback={<div className="lx-loading" style={{ minHeight: "50vh" }}>Loading…</div>}>
      <BondDetailContent />
    </Suspense>
  );
}
