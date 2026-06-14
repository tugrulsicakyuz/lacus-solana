"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDate, timestampToMonths, formatSOLCompact } from "@/lib/format";
import { useLacusProgram } from '@/hooks/useLacus';
import type { BondState } from '@/types/lacus';

interface Bond {
  bondId: number;
  issuer: string;
  issuer_name: string;
  symbol: string;
  name: string;
  apy: number;
  maturity_months: number;
  maturity_date: string;
  total_issue_size: number;
  price_per_token: number;
  filled_percentage: number;
  faceValue: number;
  couponRateBps: number;
  maxSupply: number;
  tokensSold: number;
  maturityTimestamp: number;
  description?: string;
  logo_url?: string;
  status: "live" | "ended";
}

function getBondStatus(bond: { filled_percentage: number; maturityTimestamp: number }): "live" | "ended" {
  const now = Math.floor(Date.now() / 1000);
  if (bond.filled_percentage >= 100 || bond.maturityTimestamp < now) return "ended";
  return "live";
}

export default function LaunchpadPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "ended">("all");
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchAllBonds } = useLacusProgram();

  const filtered = activeFilter === "all" ? bonds : bonds.filter(b => b.status === activeFilter);

  useEffect(() => {
    async function fetchBonds() {
      setLoading(true);
      try {
        // On-chain hata olursa supabase fallback'ine düş (sayfayı boş bırakma);
        // sadece her iki kaynak da çökerse aşağıdaki catch toast gösterir.
        let onChainBonds: BondState[] = [];
        try {
          onChainBonds = await fetchAllBonds();
        } catch (chainErr) {
          console.warn('On-chain fetch failed, falling back to Supabase:', chainErr);
        }
        if (!onChainBonds || onChainBonds.length === 0) {
          const { data } = await supabase.from("bonds").select("*").eq("documents_complete", true).order("id", { ascending: true });
          const fallback: Bond[] = (data || []).map((b: any) => ({
            bondId: b.id, issuer: '', issuer_name: b.issuer_name || b.symbol || b.name || 'Unknown',
            symbol: b.symbol || '', name: b.name || b.issuer_name || b.symbol || 'Unnamed Bond', apy: b.apy || 0,
            maturity_months: b.maturity_months || 0, maturity_date: '',
            total_issue_size: b.total_issue_size || 0, price_per_token: b.price_per_token || 0,
            filled_percentage: b.filled_percentage || 0, faceValue: 0, couponRateBps: 0,
            maxSupply: 0, tokensSold: 0, maturityTimestamp: 0,
            description: b.description, logo_url: b.logo_url,
            status: (b.filled_percentage || 0) >= 100 ? "ended" : "live", // fallback'te vade bilinmiyor; sadece doluluga bak
          }));
          setBonds(fallback);
          return;
        }
        const { data: meta } = await supabase.from('bonds').select('symbol, issuer_name, description, logo_url');
        const merged: Bond[] = onChainBonds.map((bond: BondState, i: number) => {
          const m = meta?.find((s: any) => s.symbol?.toLowerCase() === bond.symbol?.toLowerCase()) || meta?.[i];
          const faceValueSOL = Number(bond.faceValue) / 1_000_000_000;
          const maxSupply = Number(bond.maxSupply);
          const tokensSold = Number(bond.tokensSold);
          const filled = maxSupply > 0 ? Math.min((tokensSold / maxSupply) * 100, 100) : 0;
          const maturityTimestamp = Number(bond.maturityTimestamp);
          return {
            bondId: Number(bond.bondId), issuer: bond.issuer.toString(),
            issuer_name: m?.issuer_name || bond.name || bond.symbol || bond.issuer.toString().slice(0, 8) + '...',
            symbol: bond.symbol || `BOND-${Number(bond.bondId)}`,
            name: bond.name || m?.issuer_name || bond.symbol || 'Unnamed Bond', apy: bond.couponRateBps / 100,
            maturity_months: timestampToMonths(maturityTimestamp),
            maturity_date: formatDate(maturityTimestamp),
            total_issue_size: faceValueSOL * maxSupply, price_per_token: faceValueSOL,
            filled_percentage: filled, faceValue: Number(bond.faceValue),
            couponRateBps: bond.couponRateBps, maxSupply, tokensSold, maturityTimestamp,
            description: m?.description || 'On-chain tokenized bond', logo_url: m?.logo_url || null,
            status: getBondStatus({ filled_percentage: filled, maturityTimestamp }),
          };
        });
        setBonds(merged);
      } catch (err) {
        console.error('Failed to fetch bonds:', err);
        toast.error('Failed to load bonds', { description: err instanceof Error ? err.message : undefined });
      } finally {
        setLoading(false);
      }
    }
    fetchBonds();
  }, []);

  return (
    <div>
      <div className="lx-wrap">
      <div className="lx-pagehead">
        <div className="lx-kicker">Launchpad</div>
        <h1>New and upcoming issues.</h1>
        <p className="lx-lede">
          Offerings open for subscription. Funds stay in program escrow until a raise fills. If it
          does not fill, lenders are refunded automatically.
        </p>
      </div>

      <div className="lx-filters">
        <button className={`lx-chip ${activeFilter === "all" ? "on" : ""}`} onClick={() => setActiveFilter("all")}>All</button>
        <button className={`lx-chip ${activeFilter === "live" ? "on" : ""}`} onClick={() => setActiveFilter("live")}>Open</button>
        <button className={`lx-chip ${activeFilter === "ended" ? "on" : ""}`} onClick={() => setActiveFilter("ended")}>Closed</button>
        <div className="lp-count num">{filtered.length} offerings</div>
      </div>

      {loading ? (
        <div className="lx-loading">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="lx-empty">
          <p>No offerings are open right now. New issues appear here the moment a borrower publishes one.</p>
        </div>
      ) : (
        <div className="lp-sheets">
          {filtered.map((bond) => (
            <div key={bond.bondId} className="lx-sheet reveal">
              <div className="lx-sheet-head">
                <span className="t">{bond.symbol} · {bond.issuer_name}</span>
                {bond.description && <span className="series">{bond.description.toUpperCase()}</span>}
                {bond.status === "live" ? (
                  <span className="st num">● OPEN · {bond.filled_percentage.toFixed(0)}% SOLD</span>
                ) : bond.filled_percentage >= 100 ? (
                  <span className="st dim">SOLD OUT</span>
                ) : (
                  <span className="st dim">MATURED</span>
                )}
              </div>
              <div className="lx-sheet-body">
                <div className="lx-sheet-col">
                  <dl>
                    <dt>Face value</dt><dd className="num">{bond.price_per_token.toFixed(4)} SOL / unit</dd>
                    <dt>Issue size</dt><dd className="num">{formatSOLCompact(bond.total_issue_size)}</dd>
                    <dt>Units</dt><dd className="num">{bond.maxSupply.toLocaleString("en-US")}</dd>
                  </dl>
                </div>
                <div className="lx-sheet-col">
                  <dl>
                    <dt>Coupon</dt><dd className="num">{bond.apy.toFixed(2)}% p.a.</dd>
                    <dt>Settlement</dt><dd>SOL</dd>
                    <dt>Maturity</dt><dd className="num">{bond.maturity_date || "--"}</dd>
                  </dl>
                </div>
                <div className="lx-sheet-col">
                  <div className="lx-submeter">
                    <div className="cap"><span>Subscribed</span><span className="num">{bond.filled_percentage.toFixed(0)}%</span></div>
                    <div className="bar"><i style={{ width: `${Math.min(bond.filled_percentage, 100)}%` }}></i></div>
                    <div className="fig num">{bond.tokensSold.toLocaleString("en-US")} of {bond.maxSupply.toLocaleString("en-US")} units</div>
                  </div>
                  <div className="lx-sheet-cta">
                    {bond.status === "live" ? (
                      <Link href={`/primary?bond=${bond.symbol}`} className="lx-btn lx-btn-solid lx-btn-sm lx-btn-block">Buy units</Link>
                    ) : (
                      <Link href={`/primary?bond=${bond.symbol}`} className="lx-btn lx-btn-ghost lx-btn-sm lx-btn-block">View</Link>
                    )}
                  </div>
                </div>
              </div>
              <div className="lx-sheet-foot">
                {bond.issuer && <span>ISSUER <code className="num">{bond.issuer.slice(0, 6)}…{bond.issuer.slice(-4)}</code></span>}
                <span>STRUCTURE: BILATERAL LOAN AGREEMENT</span>
                {bond.issuer && (
                  <a
                    style={{ marginLeft: "auto" }}
                    href={`https://explorer.solana.com/address/${bond.issuer}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    VERIFY ON EXPLORER ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      <div className="lx-inkband lp-ctaband">
        <div className="lx-wrap lx-ctaband">
          <div>
            <h2>Borrow without the gatekeepers.</h2>
            <p>
              No advisors, no underwriting syndicate, no six-month process. Draft a term sheet and
              raise from lenders who can verify every promise you make.
            </p>
          </div>
          <Link href="/manage/issue" className="lx-btn">Issue a bond</Link>
        </div>
      </div>
    </div>
  );
}
