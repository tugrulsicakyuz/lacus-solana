"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/lib/supabase";
import {
  getLacusProgramReadOnly,
  getBondStatePDA,
  getInvestorPositionPDA,
} from "@/lib/lacus-program";
import { LACUS_PROGRAM_ID_STRING } from "@/config/program-id";
import { hashAgreementText, shortHash, bytesToHex } from "@/lib/loan-agreement";
import { formatSOL, formatSOLCompact, formatDate, timestampToMonths, maturityLabel } from "@/lib/format";

/* ── Types ── */
// Zincirden okunan tahvil (number'a indirgenmiş) + Supabase metadata.
interface BondView {
  bondId: number;
  issuer: string;
  symbol: string;
  name: string;
  issuerName: string;
  description?: string;
  faceValueLamports: number;
  couponRateBps: number;
  maturityTimestamp: number;
  saleDeadline: number;
  maxSupply: number;
  tokensSold: number;
  totalRaised: number;
  funded: boolean;
  loanAgreementHash: number[];
}

interface BondDocument {
  id: number;
  document_type: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

interface Position {
  units: number;
  contribution: number; // lamport
  redeemed: boolean;
  refunded: boolean;
}

const DOC_LABELS: Record<string, string> = {
  income_statement:          "Income Statement",
  balance_sheet:             "Balance Sheet",
  bank_statement:            "Bank Statement",
  articles_of_incorporation: "Articles of Incorporation",
  ein_document:              "EIN Document",
  fund_usage_plan:           "Fund Usage Plan",
};

/* ── Page ── */
function BondDetailContent() {
  const params = useParams();
  const symbol = (params?.symbol as string ?? "").toUpperCase();
  const { publicKey } = useWallet();

  const [bond, setBond] = useState<BondView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [holderCount, setHolderCount] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const [documents, setDocuments] = useState<BondDocument[]>([]);
  const [agreementCheck, setAgreementCheck] = useState<{
    status: "loading" | "verified" | "mismatch" | "none" | "error";
    onchainHex?: string;
    text?: string;
  }>({ status: "loading" });

  /* fetch bond (on-chain primary) + metadata (Supabase optional) + holder count */
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    async function fetchBond() {
      try {
        const program = getLacusProgramReadOnly();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const all = await (program.account as any).bondState.all();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hit = all.find((b: any) => (b.account.symbol || "").toUpperCase() === symbol);

        if (!hit) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return;
        }

        const acc = hit.account;
        const bondId = Number(acc.bondId);

        // İsteğe bağlı Supabase metadata (issuer adı / açıklama).
        const { data: meta } = await supabase
          .from("bonds")
          .select("issuer_name, description")
          .eq("symbol", acc.symbol)
          .maybeSingle();

        const view: BondView = {
          bondId,
          issuer: acc.issuer.toString(),
          symbol: acc.symbol,
          name: acc.name,
          issuerName: meta?.issuer_name || acc.name || `${acc.issuer.toString().slice(0, 6)}…${acc.issuer.toString().slice(-4)}`,
          description: meta?.description ?? undefined,
          faceValueLamports: Number(acc.faceValue),
          couponRateBps: acc.couponRateBps,
          maturityTimestamp: Number(acc.maturityTimestamp),
          saleDeadline: Number(acc.saleDeadline),
          maxSupply: Number(acc.maxSupply),
          tokensSold: Number(acc.tokensSold),
          totalRaised: Number(acc.totalRaised),
          funded: !!acc.funded,
          loanAgreementHash: acc.loanAgreementHash as number[],
        };
        if (!cancelled) { setBond(view); setLoading(false); }

        // Lender sayısı: bu tahvile ait pozisyonlar (bond_state offset 8+32=40).
        try {
          const [bondPda] = getBondStatePDA(bondId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const positions = await (program.account as any).investorPosition.all([
            { memcmp: { offset: 40, bytes: bondPda.toBase58() } },
          ]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const holders = positions.filter((p: any) => Number(p.account.units) > 0).length;
          if (!cancelled) setHolderCount(holders);
        } catch { /* yoksay */ }
      } catch (e) {
        console.error("fetchBond error:", e);
        if (!cancelled) { setNotFound(true); setLoading(false); }
      }
    }
    fetchBond();
    return () => { cancelled = true; };
  }, [symbol]);

  /* fetch this wallet's on-chain position */
  useEffect(() => {
    if (!bond || !publicKey) { setPosition(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const program = getLacusProgramReadOnly();
        const [bondPda] = getBondStatePDA(bond.bondId);
        const [posPda] = getInvestorPositionPDA(bondPda, publicKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pos = await (program.account as any).investorPosition.fetch(posPda);
        if (!cancelled) {
          setPosition({
            units: Number(pos.units),
            contribution: Number(pos.contribution),
            redeemed: !!pos.redeemed,
            refunded: !!pos.refunded,
          });
        }
      } catch {
        if (!cancelled) setPosition(null); // pozisyon hesabı yok = bu tahvilde holding yok
      }
    })();
    return () => { cancelled = true; };
  }, [bond, publicKey]);

  /* fetch issuer documents (Supabase) */
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

  /* verify loan agreement integrity: hash(stored text) === on-chain loan_agreement_hash */
  useEffect(() => {
    if (!bond) return;
    let cancelled = false;
    (async () => {
      setAgreementCheck({ status: "loading" });
      try {
        const onchainHex = bytesToHex(bond.loanAgreementHash);
        const { data: ag } = await supabase
          .from("agreements")
          .select("agreement_text")
          .eq("bond_id", bond.bondId)
          .maybeSingle();

        if (!ag?.agreement_text) {
          if (!cancelled) setAgreementCheck({ status: "none", onchainHex });
          return;
        }
        const computed = (await hashAgreementText(ag.agreement_text)).hashHex;
        if (!cancelled) {
          setAgreementCheck({
            status: computed === onchainHex ? "verified" : "mismatch",
            onchainHex,
            text: ag.agreement_text,
          });
        }
      } catch {
        if (!cancelled) setAgreementCheck({ status: "error" });
      }
    })();
    return () => { cancelled = true; };
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
          <p className="lx-lede">No on-chain bond found with symbol &ldquo;{symbol}&rdquo;</p>
        </div>
        <div style={{ marginTop: 28, paddingBottom: 96 }}>
          <Link href="/primary" className="lx-btn lx-btn-ghost">Back to Markets</Link>
        </div>
      </div>
    );
  }

  const faceValueSOL  = bond.faceValueLamports / 1e9;
  const totalSupply   = bond.maxSupply;
  const totalValueSOL = faceValueSOL * totalSupply;
  const remaining     = Math.max(0, bond.maxSupply - bond.tokensSold);
  const apy           = bond.couponRateBps / 100;
  const months        = timestampToMonths(bond.maturityTimestamp);
  const fillPct       = bond.maxSupply > 0 ? Math.min((bond.tokensSold / bond.maxSupply) * 100, 100) : 0;
  const nowSec        = Math.floor(Date.now() / 1000);
  const isSoldOut     = bond.tokensSold >= bond.maxSupply;
  const saleClosed    = bond.funded || nowSec >= bond.saleDeadline;
  const closed        = isSoldOut || saleClosed;
  const raisedSOL     = bond.totalRaised / 1e9;
  const [bondPda]     = getBondStatePDA(bond.bondId);

  return (
    <div className="lx-wrap">
      <div className="lx-crumb"><Link href="/primary">MARKETS</Link> / {bond.symbol}</div>
      <div className="lx-pagehead" style={{ paddingTop: 32 }}>
        <div className="lx-kicker">
          Bond detail · {isSoldOut
            ? <span style={{ color: "var(--ink-2)" }}>SOLD OUT</span>
            : saleClosed
            ? <span style={{ color: "var(--ink-2)" }}>CLOSED</span>
            : <span>● OPEN</span>}
        </div>
        <h1>{bond.symbol}, {bond.issuerName}</h1>
      </div>

      {/* Price strip */}
      <div className="bd-pricestrip">
        <div><div className="k">Face value</div><div className="v num">{formatSOL(bond.faceValueLamports)} SOL</div></div>
        <div><div className="k">Coupon</div><div className="v num">{apy}%</div></div>
        <div><div className="k">Maturity</div><div className="v num">{maturityLabel(months)}</div></div>
        <div><div className="k">Total issue</div><div className="v num">{formatSOLCompact(totalValueSOL)}</div></div>
        <div><div className="k">Lenders</div><div className="v num">{holderCount > 0 ? holderCount : "--"}</div></div>
      </div>

      <div className="bd-grid">
        {/* Left column */}
        <div>
          {/* Terms */}
          <h3 className="lx-subhead">Terms</h3>
          <div className="lx-drule"></div>
          <div style={{ paddingTop: 18 }}>
            <dl className="lx-dl" style={{ maxWidth: 460 }}>
              <dt>Issuer</dt><dd>{bond.issuerName}</dd>
              <dt>Symbol</dt><dd className="num">{bond.symbol}</dd>
              <dt>Total supply</dt><dd className="num">{totalSupply.toLocaleString("en-US")} units</dd>
              <dt>Total value</dt><dd className="num">{formatSOLCompact(totalValueSOL)}</dd>
              <dt>Remaining</dt><dd className="num">{remaining.toLocaleString("en-US")} units</dd>
              <dt>Network</dt><dd>Solana Devnet</dd>
              <dt>Structure</dt><dd>Bilateral loan agreement, peer to peer</dd>
            </dl>
          </div>

          {/* Subscription (on-chain) */}
          <div className="lx-subsection">
            <h3 className="lx-subhead">Subscription</h3>
            <div className="lx-drule"></div>
            <div style={{ paddingTop: 18 }}>
              <dl className="lx-dl" style={{ maxWidth: 460 }}>
                <dt>Subscribed</dt><dd className="num">{fillPct.toFixed(1)}%</dd>
                <dt>Units sold</dt><dd className="num">{bond.tokensSold.toLocaleString("en-US")} / {bond.maxSupply.toLocaleString("en-US")}</dd>
                <dt>Raised</dt><dd className="num">{formatSOLCompact(raisedSOL)}</dd>
                <dt>Status</dt><dd>{bond.funded ? "Funded" : saleClosed ? "Closed" : "Raising"}</dd>
              </dl>
            </div>
          </div>

          {/* On-chain */}
          <div className="lx-subsection">
            <h3 className="lx-subhead">On-chain</h3>
            <div className="lx-drule"></div>
            <div className="lx-addr-row">
              <span className="k">Bond account</span>
              <code className="num">{bondPda.toBase58()}</code>
              <a
                href={`https://explorer.solana.com/address/${bondPda.toBase58()}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                EXPLORER ↗
              </a>
            </div>
            <div className="lx-addr-row">
              <span className="k">Issuer</span>
              <code className="num">{bond.issuer}</code>
              <a
                href={`https://explorer.solana.com/address/${bond.issuer}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                EXPLORER ↗
              </a>
            </div>
            <div className="lx-addr-row">
              <span className="k">Program</span>
              <code className="num">{LACUS_PROGRAM_ID_STRING}</code>
              <a
                href={`https://explorer.solana.com/address/${LACUS_PROGRAM_ID_STRING}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                EXPLORER ↗
              </a>
            </div>
          </div>

          {/* Loan agreement */}
          <div className="lx-subsection">
            <h3 className="lx-subhead">Loan agreement</h3>
            <div className="lx-drule"></div>
            <div style={{ paddingTop: 14 }}>
              {agreementCheck.status === "loading" && <p className="lx-fn">Checking integrity…</p>}
              {agreementCheck.status === "verified" && (
                <p className="lx-fn" style={{ color: "#1d9e75" }}>
                  ✓ Integrity verified · on-chain hash {shortHash(agreementCheck.onchainHex ?? "")} matches the stored agreement.
                </p>
              )}
              {agreementCheck.status === "mismatch" && (
                <p className="lx-fn" style={{ color: "#c0392b" }}>
                  ⚠ Hash mismatch · the stored agreement does not match the on-chain hash {shortHash(agreementCheck.onchainHex ?? "")}.
                </p>
              )}
              {agreementCheck.status === "none" && (
                <p className="lx-fn">
                  No structured agreement is on file for this bond (issued before the agreement feature, or not stored off chain).
                </p>
              )}
              {agreementCheck.status === "error" && (
                <p className="lx-fn">Could not read the on-chain hash for this bond.</p>
              )}
              {agreementCheck.text && (
                <details style={{ marginTop: 8 }}>
                  <summary className="lx-readmore" style={{ cursor: "pointer" }}>View agreement text</summary>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>{agreementCheck.text}</pre>
                </details>
              )}
            </div>
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
              <div className="lx-trow"><span>Face value</span><span className="v num">{formatSOL(bond.faceValueLamports)} SOL / unit</span></div>
              <div className="lx-trow"><span>Coupon</span><span className="v num">{apy}%</span></div>
              <div className="lx-trow"><span>Maturity</span><span className="v num">{formatDate(bond.maturityTimestamp)}</span></div>
              <div className="lx-submeter" style={{ margin: "14px 0" }}>
                <div className="cap"><span>Subscribed</span><span className="num">{fillPct.toFixed(1)}%</span></div>
                <div className="bar"><i style={{ width: `${fillPct}%` }}></i></div>
                <div className="fig num">{bond.tokensSold.toLocaleString("en-US")} of {bond.maxSupply.toLocaleString("en-US")} units</div>
              </div>
            </div>
            <div className="lx-ticket-foot">
              {closed ? (
                <p className="lx-fn" style={{ marginTop: 0 }}>
                  {isSoldOut ? "This offering is fully sold." : "Subscription is closed for this offering."}
                </p>
              ) : (
                <Link href={`/primary?bond=${bond.symbol}`} className="lx-btn lx-btn-solid lx-btn-block">Buy units</Link>
              )}
            </div>
            <div className="lx-finefoot">SOLANA DEVNET · TEST INSTRUMENTS</div>
          </div>

          {/* Your position */}
          {publicKey && position && position.units > 0 && (
            <div className="bd-position">
              <h3 className="lx-subhead">Your position</h3>
              <div className="lx-drule"></div>
              <dl className="lx-dl" style={{ paddingTop: 14 }}>
                <dt>Units</dt><dd className="num">{position.units.toLocaleString("en-US")}</dd>
                <dt>Contribution</dt><dd className="num">{formatSOL(position.contribution)} SOL</dd>
                <dt>Status</dt><dd>{position.redeemed ? "Redeemed" : position.refunded ? "Refunded" : "Active"}</dd>
              </dl>
              <Link href="/dashboard" className="lx-readmore">View in Dashboard →</Link>
            </div>
          )}
          {!publicKey && (
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
