"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLacusProgram } from "@/hooks/useLacus";
import type { BondState } from "@/types/lacus";
import { LACUS_PROGRAM_ID_STRING } from "@/config/program-id";
import { formatDate, formatSOL, formatSOLCompact } from "@/lib/format";
import {
  generateCouponSchedule,
  computeScheduleStatus,
  frequencyLabel,
  nextUnfundedCoupon,
  type CouponFrequencyMonths,
  type ScheduleStatusEntry,
} from "@/lib/coupon-schedule";

const EXPLORER = `https://explorer.solana.com/address/${LACUS_PROGRAM_ID_STRING}?cluster=devnet`;
const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

interface BondWithSchedule {
  bond: BondState;
  freq?: CouponFrequencyMonths;
  statuses?: ScheduleStatusEntry[];
}

export default function LandingPage() {
  const { fetchAllBonds } = useLacusProgram();
  const [items, setItems] = useState<BondWithSchedule[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: BondState[] = await fetchAllBonds();
        const ids = all.map((b) => Number(b.bondId));
        const freqMap: Record<number, CouponFrequencyMonths> = {};
        if (ids.length) {
          const { data } = await supabase.from("agreements").select("bond_id, terms_json").in("bond_id", ids);
          (data || []).forEach((r: { bond_id: number; terms_json: { couponFrequencyMonths?: number } | null }) => {
            const f = r.terms_json?.couponFrequencyMonths;
            if (f === 12 || f === 6 || f === 3) freqMap[r.bond_id] = f;
          });
        }
        const now = Math.floor(Date.now() / 1000);
        const withSched: BondWithSchedule[] = all.map((bond) => {
          const freq = freqMap[Number(bond.bondId)];
          const statuses = freq
            ? computeScheduleStatus(
                generateCouponSchedule({
                  faceValueLamports: Number(bond.faceValue),
                  couponRateBps: bond.couponRateBps,
                  maturityTimestamp: Number(bond.maturityTimestamp),
                  saleDeadline: Number(bond.saleDeadline),
                  couponFrequencyMonths: freq,
                }),
                {
                  tokensSold: Number(bond.tokensSold),
                  totalYieldDeposited: Number(bond.totalYieldDeposited),
                  totalPrincipalDeposited: Number(bond.totalPrincipalDeposited),
                  principalFunded: bond.principalFunded,
                  faceValueLamports: Number(bond.faceValue),
                  maturityTimestamp: Number(bond.maturityTimestamp),
                  nowSec: now,
                }
              )
            : undefined;
          return { bond, freq, statuses };
        });
        if (!cancelled) setItems(withSched);
      } catch {
        /* sessiz: veri yoksa illustrative örneğe düşülür */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAllBonds]);

  const hasData = items.length > 0;

  return (
    <>
      {/* HERO */}
      <div className="lx-wrap">
        <section className="lc-hero">
          <div>
            <div className="lx-kicker">Credit, not speculation · Solana</div>
            <h1>Crypto that does what banks do.</h1>
            <p className="lx-lede">
              Lacus turns a loan between two parties into a contract that executes itself on
              Solana. Companies borrow, lenders earn coupons, and nobody holds the money in
              between. Not even us.
            </p>
            <div className="lc-hero-ctas">
              <Link href="/primary" className="lx-btn lx-btn-solid">Explore bonds</Link>
              <Link href="/whitepaper" className="lx-btn lx-btn-ghost">Read the whitepaper</Link>
            </div>
          </div>

          {hasData ? <RealCertificate item={items[0]} /> : <SampleCertificate />}
        </section>
      </div>

      {/* INK STAT BAND */}
      {hasData ? <RealStats items={items} /> : <SampleStats />}

      {/* HOW IT WORKS */}
      <div className="lx-wrap">
        <section className="lx-section">
          <div className="lx-sec-head">
            <span className="lx-sec-no">§ 1–3</span>
            <h2>How it works</h2>
            <span className="sub">Three clauses, no fine print</span>
          </div>
          <div className="lx-clauses">
            <div className="lx-clause reveal">
              <div className="ghost">1</div>
              <div className="no">§ 1 · AGREE</div>
              <h3>A borrower signs a loan agreement</h3>
              <p>
                A company sets the amount, the coupon, and the maturity. The agreement is locked
                in a program account. Neither side can quietly amend it.
              </p>
              <div className="fine">Terms hash recorded on-chain</div>
            </div>
            <div className="lx-clause reveal">
              <div className="ghost">2</div>
              <div className="no">§ 2 · FUND</div>
              <h3>Lenders fund it, peer to peer</h3>
              <p>
                Each unit is a fixed share of the loan, paid in SOL. Money moves from your wallet
                into program-owned escrow. Lacus never touches it.
              </p>
              <div className="fine">Escrow: program-owned, auditable</div>
            </div>
            <div className="lx-clause reveal">
              <div className="ghost">3</div>
              <div className="no">§ 3 · EXECUTE</div>
              <h3>Every payment lands on the record</h3>
              <p>
                The borrower funds each coupon on the promised schedule, principal at maturity. The
                contract distributes it, wallet to wallet. There is no bank in the middle. Late is
                visible. Missing is undeniable.
              </p>
              <div className="fine">Every deposit is timestamped on-chain</div>
            </div>
          </div>
        </section>
      </div>

      {/* CURRENT OFFERING */}
      {hasData ? <RealOffering item={items[0]} /> : <SampleOffering />}

      {/* MARKETS */}
      {hasData ? <RealMarkets items={items} /> : <SampleMarkets />}

      {/* PAYMENT RECORD */}
      {hasData ? <RealRecord items={items} /> : <SampleRecord />}
    </>
  );
}

/* ─────────────────────────── REAL (on-chain) ─────────────────────────── */

function RealCertificate({ item }: { item: BondWithSchedule }) {
  const { bond, freq, statuses } = item;
  const faceSol = formatSOL(Number(bond.faceValue));
  const couponPct = (bond.couponRateBps / 100).toFixed(2);
  const next = statuses ? nextUnfundedCoupon(statuses) : null;
  return (
    <div className="lx-cert-stack reveal">
      <div className="lx-cert">
        <div className="row1"><span>{bond.symbol}</span><span>SOLANA DEVNET</span></div>
        <div className="lx-cert-rule"></div>
        <div className="title">CORPORATE BOND · TOKENIZED</div>
        <div className="name">{bond.symbol}</div>
        <div className="co">{bond.name}</div>
        <div className="face">
          <div className="v num">{faceSol} SOL</div>
          <div className="k">FACE VALUE · PAYABLE IN SOL</div>
        </div>
        <div className="terms">
          <span>COUPON {couponPct}%</span>
          {freq ? <span>{frequencyLabel(freq).toUpperCase()}</span> : <span>TOKENIZED</span>}
          <span>DUE {formatDate(Number(bond.maturityTimestamp)).toUpperCase()}</span>
        </div>
        <div className="seal"><span>L</span></div>
        <div className="stub">
          <span className="cut">✂ ·······</span>
          {next ? (
            <span>NEXT COUPON · {formatSOL(next.perUnitLamports)} SOL · {formatDate(next.dateUnix).toUpperCase()}</span>
          ) : (
            <span>PRINCIPAL DUE · {formatDate(Number(bond.maturityTimestamp)).toUpperCase()}</span>
          )}
          <span className="pay">VERIFY ON-CHAIN ↗</span>
        </div>
      </div>
    </div>
  );
}

function RealStats({ items }: { items: BondWithSchedule[] }) {
  const now = Math.floor(Date.now() / 1000);
  const totalFace = items.reduce((s, { bond }) => s + (Number(bond.faceValue) / 1e9) * Number(bond.tokensSold), 0);
  const interest = items.reduce((s, { bond }) => s + Number(bond.totalYieldDeposited) / 1e9, 0);
  const unitsSold = items.reduce((s, { bond }) => s + Number(bond.tokensSold), 0);
  const active = items.filter(
    ({ bond }) => Number(bond.tokensSold) < Number(bond.maxSupply) && Number(bond.maturityTimestamp) > now
  ).length;
  return (
    <div className="lx-inkband">
      <div className="lx-wrap">
        <div className="stats">
          <div className="stat"><div className="k">Total face value</div><div className="v num">{formatSOLCompact(totalFace)}</div></div>
          <div className="stat"><div className="k">Active offerings</div><div className="v num">{active}</div></div>
          <div className="stat"><div className="k">Units subscribed</div><div className="v num">{unitsSold.toLocaleString("en-US")}</div></div>
          <div className="stat"><div className="k">Interest distributed</div><div className="v num">{formatSOLCompact(interest)}</div></div>
        </div>
        <p className="lx-fn">
          Live figures read directly from the Lacus program on Solana devnet. Every number here is
          recomputed from on-chain state on each visit.
        </p>
      </div>
    </div>
  );
}

function RealOffering({ item }: { item: BondWithSchedule }) {
  const { bond, freq, statuses } = item;
  const faceSol = Number(bond.faceValue) / 1e9;
  const maxSupply = Number(bond.maxSupply);
  const tokensSold = Number(bond.tokensSold);
  const issueSize = faceSol * maxSupply;
  const couponPct = (bond.couponRateBps / 100).toFixed(2);
  const fill = maxSupply > 0 ? Math.min((tokensSold / maxSupply) * 100, 100) : 0;
  const now = Math.floor(Date.now() / 1000);
  const isOpen = tokensSold < maxSupply && Number(bond.maturityTimestamp) > now && !bond.funded;
  return (
    <div className="lx-tint">
      <div className="lx-wrap">
        <section className="lx-section">
          <div className="lx-sec-head">
            <span className="lx-sec-no">§ 4</span>
            <h2>Current offering</h2>
            <span className="sub">Live on Solana devnet</span>
            <Link className="more" href="/launchpad">All offerings →</Link>
          </div>
          <div className="lx-sheet reveal">
            <div className="lx-sheet-head">
              <span className="t">{bond.symbol} · {bond.name}</span>
              <span className="series">CORPORATE BOND · TOKENIZED</span>
              <span className="st">{isOpen ? "● OPEN" : bond.funded ? "FUNDED" : "CLOSED"}</span>
            </div>
            <div className="lx-sheet-body">
              <div className="lx-sheet-col">
                <dl>
                  <dt>Face value</dt><dd className="num">{faceSol.toFixed(4)} SOL / unit</dd>
                  <dt>Issue size</dt><dd className="num">{formatSOLCompact(issueSize)}</dd>
                  <dt>Units</dt><dd className="num">{maxSupply.toLocaleString("en-US")}</dd>
                  <dt>Coupon</dt><dd className="num">{couponPct}% p.a.</dd>
                </dl>
              </div>
              <div className="lx-sheet-col">
                <dl>
                  <dt>Frequency</dt><dd>{freq ? frequencyLabel(freq) : "—"}</dd>
                  <dt>Settlement</dt><dd>SOL</dd>
                  <dt>Maturity</dt><dd className="num">{formatDate(Number(bond.maturityTimestamp))}</dd>
                  <dt>Coupons</dt><dd className="num">{statuses ? statuses.filter((s) => s.type === "coupon").length : "—"}</dd>
                </dl>
              </div>
              <div className="lx-sheet-col">
                <div className="lx-submeter">
                  <div className="cap"><span>Subscribed</span><span className="num">{fill.toFixed(0)}%</span></div>
                  <div className="bar"><i style={{ width: `${fill}%` }}></i></div>
                  <div className="fig num">{tokensSold.toLocaleString("en-US")} of {maxSupply.toLocaleString("en-US")} units</div>
                </div>
                <div className="lx-sheet-cta">
                  <Link href={`/bond/${bond.symbol}`} className="lx-btn lx-btn-solid lx-btn-sm lx-btn-block">View bond</Link>
                </div>
              </div>
            </div>
            <div className="lx-sheet-foot">
              <span>ISSUER <code className="num">{short(bond.issuer.toString())}</code></span>
              <span>STRUCTURE: BILATERAL LOAN AGREEMENT</span>
              <a
                style={{ marginLeft: "auto" }}
                href={`https://explorer.solana.com/address/${bond.issuer.toString()}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                VERIFY ON EXPLORER ↗
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RealMarkets({ items }: { items: BondWithSchedule[] }) {
  const now = Math.floor(Date.now() / 1000);
  const rows = items.slice(0, 6);
  return (
    <div className="lx-wrap">
      <section className="lx-section">
        <div className="lx-sec-head">
          <span className="lx-sec-no">§ 5</span>
          <h2>Markets</h2>
          <span className="sub">Live issues at a glance</span>
          <Link className="more" href="/primary">Primary market →</Link>
        </div>
        <div className="lx-scroll" style={{ marginTop: "8px" }}>
          <table className="lx-table">
            <thead>
              <tr>
                <th>No.</th><th>Bond</th><th className="r">Coupon</th><th className="r">Maturity</th>
                <th className="r">Face value</th><th className="r">Subscription</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ bond }, i) => {
                const maxSupply = Number(bond.maxSupply);
                const sold = Number(bond.tokensSold);
                const fill = maxSupply > 0 ? Math.min((sold / maxSupply) * 100, 100) : 0;
                const isSold = sold >= maxSupply;
                const isOpen = !isSold && Number(bond.maturityTimestamp) > now && !bond.funded;
                return (
                  <tr key={i}>
                    <td className="lx-rowno">{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <Link href={`/bond/${bond.symbol}`} className="lx-sym mgmt-link">{bond.symbol}</Link>
                      <div className="lx-issuer">{bond.name}</div>
                    </td>
                    <td className="r num">{(bond.couponRateBps / 100).toFixed(2)}%</td>
                    <td className="r num">{formatDate(Number(bond.maturityTimestamp))}</td>
                    <td className="r num">{formatSOL(Number(bond.faceValue))} SOL</td>
                    <td className="r"><span className={`lx-stamp num${isSold ? "" : " open"}`}>{fill.toFixed(0)}% SOLD</span></td>
                    <td className="r">
                      <Link href={isOpen ? `/primary?bond=${bond.symbol}` : `/bond/${bond.symbol}`} className="lx-btn lx-btn-ghost lx-btn-sm">
                        {isOpen ? "Buy" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="lx-soon">CORPORATE BONDS TODAY · MORE INSTRUMENTS SOON</div>
      </section>
    </div>
  );
}

function RealRecord({ items }: { items: BondWithSchedule[] }) {
  const interest = items.reduce((s, { bond }) => s + Number(bond.totalYieldDeposited) / 1e9, 0);
  const scheduled = items.filter((i) => i.statuses && i.statuses.length > 0);
  return (
    <div className="lc-green">
      <div className="lx-wrap">
        <section className="lx-section">
          <div className="lx-sec-head">
            <span className="lx-sec-no">§ 6</span>
            <h2>Payment record</h2>
            <span className="sub">Every coupon, on the record</span>
          </div>
          <div className="lc-payrecord">
            <div>
              <div className="lc-chart-cap">
                <h3 className="lx-subhead" style={{ paddingBottom: 0 }}>Interest distributed</h3>
                <span className="total">to date · SOL</span>
              </div>
              <div className="lx-drule"></div>
              <div className="face" style={{ paddingTop: 18 }}>
                <div className="v num" style={{ fontSize: 40 }}>{formatSOLCompact(interest)}</div>
                <div className="k">PAID FROM BORROWERS TO LENDERS, ON-CHAIN</div>
              </div>
              <p className="lc-bigclaim">No banker vouches for anyone here. The record vouches for itself.</p>
            </div>
            <div>
              <h3 className="lx-subhead">Coupon status</h3>
              <div className="lx-drule"></div>
              {scheduled.length === 0 ? (
                <p className="lx-fn" style={{ paddingTop: 12 }}>
                  No scheduled coupons are live yet. As borrowers publish bonds with payment
                  schedules, each coupon and its status appears here, straight from on-chain state.
                </p>
              ) : (
                scheduled.map(({ bond, statuses }, i) => {
                  const coupons = statuses!.filter((s) => s.type === "coupon");
                  const paid = coupons.filter((s) => s.status === "paid").length;
                  const overdue = coupons.filter((s) => s.status === "due").length;
                  const next = nextUnfundedCoupon(statuses!);
                  return (
                    <div className="lc-log-row" key={i}>
                      <Link href={`/bond/${bond.symbol}`} className="lx-sym">{bond.symbol}</Link>
                      <span className="kind">{paid}/{coupons.length} coupons funded</span>
                      <span className="amt num">{next ? `next ${formatDate(next.dateUnix)}` : "principal due"}</span>
                      {overdue > 0
                        ? <span className="ok" style={{ color: "#c0392b" }}>● {overdue} OVERDUE</span>
                        : <span className="ok">✓ ON TRACK</span>}
                    </div>
                  );
                })
              )}
              <p className="lc-log-foot">
                <a href={EXPLORER} target="_blank" rel="noopener noreferrer">View the full record on-chain ↗</a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─────────────────── ILLUSTRATIVE SAMPLE (no live data) ─────────────────── */
// Devnet'te canlı bond yokken gösterilir. Açıkça "illustrative sample" etiketli;
// gerçek protokol verisi DEĞİLDİR. İsimler İngilizce kurgudur.

function SampleCertificate() {
  return (
    <div className="lx-cert-stack reveal">
      <div className="lx-cert">
        <div className="row1"><span>No. 0001 / 5,000</span><span>SERIES 2025-A</span></div>
        <div className="lx-cert-rule"></div>
        <div className="title">CORPORATE BOND · SENIOR UNSECURED</div>
        <div className="name">ATLAS27</div>
        <div className="co">Atlas Freight Inc.</div>
        <div className="face">
          <div className="v num">100.00 SOL</div>
          <div className="k">FACE VALUE · PAYABLE IN SOL</div>
        </div>
        <div className="terms">
          <span>COUPON 11.50%</span>
          <span>SEMI-ANNUAL</span>
          <span>DUE 15 MAR 2027</span>
        </div>
        <div className="seal"><span>L</span></div>
        <div className="stub">
          <span className="cut">✂ ·······</span>
          <span>COUPON № 3 · 5.75 SOL · 15 SEP 2026</span>
          <span className="pay">ILLUSTRATIVE SAMPLE</span>
        </div>
      </div>
    </div>
  );
}

function SampleStats() {
  return (
    <div className="lx-inkband">
      <div className="lx-wrap">
        <div className="stats">
          <div className="stat"><div className="k">Total face value</div><div className="v num">2.30M SOL</div></div>
          <div className="stat"><div className="k">Active bonds</div><div className="v num">4</div></div>
          <div className="stat"><div className="k">Coupons paid on time<sup>1</sup></div><div className="v num">128 / 128</div></div>
          <div className="stat"><div className="k">Interest distributed</div><div className="v num">190.1K SOL</div></div>
        </div>
        <p className="lx-fn">
          <sup>1</sup> Figures on this page are an illustrative sample, not live protocol data. No
          bonds are live on devnet right now. See the live markets for real, on-chain figures.
        </p>
      </div>
    </div>
  );
}

function SampleOffering() {
  return (
    <div className="lx-tint">
      <div className="lx-wrap">
        <section className="lx-section">
          <div className="lx-sec-head">
            <span className="lx-sec-no">§ 4</span>
            <h2>Current offering</h2>
            <span className="sub">Illustrative sample · no live offerings right now</span>
            <Link className="more" href="/launchpad">All offerings →</Link>
          </div>
          <div className="lx-sheet reveal">
            <div className="lx-sheet-head">
              <span className="t">ATLAS27 · Atlas Freight Inc.</span>
              <span className="series">SERIES 2025-A · SENIOR UNSECURED</span>
              <span className="st">● SAMPLE</span>
            </div>
            <div className="lx-sheet-body">
              <div className="lx-sheet-col">
                <dl>
                  <dt>Face value</dt><dd className="num">100.00 SOL / unit</dd>
                  <dt>Issue size</dt><dd className="num">500,000 SOL</dd>
                  <dt>Units</dt><dd className="num">5,000</dd>
                  <dt>Coupon</dt><dd className="num">11.50% p.a.</dd>
                </dl>
              </div>
              <div className="lx-sheet-col">
                <dl>
                  <dt>Frequency</dt><dd>Semi-annual</dd>
                  <dt>Settlement</dt><dd>SOL</dd>
                  <dt>Maturity</dt><dd className="num">15 Mar 2027</dd>
                  <dt>Next payment</dt><dd className="num">15 Sep 2026</dd>
                </dl>
              </div>
              <div className="lx-sheet-col">
                <div className="lx-submeter">
                  <div className="cap"><span>Subscribed</span><span className="num">84%</span></div>
                  <div className="bar"><i style={{ width: "84%" }}></i></div>
                  <div className="fig num">4,200 of 5,000 units</div>
                </div>
                <div className="lx-sheet-cta">
                  <Link href="/primary" className="lx-btn lx-btn-solid lx-btn-sm lx-btn-block">Explore live bonds</Link>
                </div>
              </div>
            </div>
            <div className="lx-sheet-foot">
              <span>STRUCTURE: BILATERAL LOAN AGREEMENT</span>
              <span style={{ marginLeft: "auto" }}>ILLUSTRATIVE SAMPLE · NOT LIVE DATA</span>
            </div>
          </div>

          <div className="lx-iblock">
            <div>
              <h3 className="lx-subhead">About the issuer</h3>
              <div className="lx-drule"></div>
              <p>
                Atlas Freight runs contract logistics for industrial exporters: 86 trucks, three
                depots, and long-term volume agreements with regional manufacturers. The company
                has been profitable for six consecutive years.
              </p>
              <p>Proceeds fund twelve additional vehicles and warehouse automation.</p>
              <Link className="lx-readmore" href="/primary">Browse live bonds ↗</Link>
            </div>
            <div>
              <h3 className="lx-subhead">Key figures</h3>
              <div className="lx-drule"></div>
              <dl className="lx-figures">
                <div><dt>Founded</dt><dd className="num">2011</dd></div>
                <div><dt>Sector</dt><dd>Freight &amp; logistics</dd></div>
                <div><dt>Employees</dt><dd className="num">142</dd></div>
                <div><dt>Revenue · FY2025</dt><dd className="num">$18.4M</dd></div>
                <div><dt>Use of proceeds</dt><dd>Fleet expansion</dd></div>
                <div><dt>Prior issue</dt><dd className="good">ATLAS25: repaid in full, 4/4 on time</dd></div>
              </dl>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SampleMarkets() {
  return (
    <div className="lx-wrap">
      <section className="lx-section">
        <div className="lx-sec-head">
          <span className="lx-sec-no">§ 5</span>
          <h2>Markets</h2>
          <span className="sub">Illustrative sample · see the primary market for live issues</span>
          <Link className="more" href="/primary">Primary market →</Link>
        </div>
        <div className="lx-scroll" style={{ marginTop: "8px" }}>
          <table className="lx-table">
            <thead>
              <tr>
                <th>No.</th><th>Bond</th><th className="r">Coupon</th><th className="r">Maturity</th>
                <th className="r">Price</th><th className="r">Subscription</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="lx-rowno">01</td>
                <td><div className="lx-sym">ATLAS27</div><div className="lx-issuer">Atlas Freight Inc.</div></td>
                <td className="r num">11.50%</td><td className="r num">15 Mar 2027</td>
                <td className="r num">100.00 SOL</td>
                <td className="r"><span className="lx-stamp open num">84% SOLD</span></td>
              </tr>
              <tr>
                <td className="lx-rowno">02</td>
                <td><div className="lx-sym">VEGA28</div><div className="lx-issuer">Vega Agro Foods Inc.</div></td>
                <td className="r num">9.25%</td><td className="r num">30 Sep 2028</td>
                <td className="r num">100.00 SOL</td>
                <td className="r"><span className="lx-stamp num">SOLD OUT</span></td>
              </tr>
              <tr>
                <td className="lx-rowno">03</td>
                <td><div className="lx-sym">NOVA26</div><div className="lx-issuer">Nova Energy Systems Inc.</div></td>
                <td className="r num">13.00%</td><td className="r num">01 Dec 2026</td>
                <td className="r num">100.00 SOL</td>
                <td className="r"><span className="lx-stamp open num">67% SOLD</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="lx-soon">ILLUSTRATIVE SAMPLE · CORPORATE BONDS TODAY · MORE INSTRUMENTS SOON</div>
      </section>
    </div>
  );
}

function SampleRecord() {
  return (
    <div className="lc-green">
      <div className="lx-wrap">
        <section className="lx-section">
          <div className="lx-sec-head">
            <span className="lx-sec-no">§ 6</span>
            <h2>Payment record</h2>
            <span className="sub">Illustrative sample · how the record will read once bonds are live</span>
          </div>
          <div className="lc-payrecord">
            <div>
              <div className="lc-chart-cap">
                <h3 className="lx-subhead" style={{ paddingBottom: 0 }}>Interest distributed</h3>
                <span className="total">cumulative since launch · SOL · sample</span>
              </div>
              <div className="lx-drule"></div>
              <svg
                className="lc-chart"
                viewBox="0 0 520 210"
                role="img"
                aria-label="Illustrative sample of cumulative interest distributed to investors, rising in steps at each coupon payment date"
              >
                <line className="gline" x1="40" y1="60" x2="500" y2="60" />
                <line className="gline" x1="40" y1="120" x2="500" y2="120" />
                <line className="axis" x1="40" y1="180" x2="500" y2="180" />
                <text x="34" y="183" textAnchor="end">0</text>
                <text x="34" y="123" textAnchor="end">100K</text>
                <text x="34" y="63" textAnchor="end">200K</text>
                <path className="fill" d="M40,180 H136 V165.5 H155 V130.8 H197 V123 H352 V108.5 H365 V73.8 H440 V65.9 H500 V180 Z" />
                <path className="step" d="M40,180 H136 V165.5 H155 V130.8 H197 V123 H352 V108.5 H365 V73.8 H440 V65.9 H500" />
                <circle className="enddot" cx="500" cy="65.9" r="3.5" />
                <text className="endlbl" x="497" y="52" textAnchor="end">190.1K SOL</text>
                <text x="40" y="198">JUL 25</text>
                <text x="155" y="198">OCT 25</text>
                <text x="269" y="198">JAN 26</text>
                <text x="384" y="198">APR 26</text>
                <text x="478" y="198">JUN 26</text>
              </svg>
              <p className="lc-bigclaim">No banker vouches for anyone here. The record vouches for itself.</p>
            </div>
            <div>
              <h3 className="lx-subhead">Payment log</h3>
              <div className="lx-drule"></div>
              <div className="lc-log-row"><span className="date">01 Jun 2026</span><span className="lx-sym">NOVA26</span><span className="kind">coupon</span><span className="amt num">13,065.00 SOL</span><span className="ok">✓ ON TIME</span></div>
              <div className="lc-log-row"><span className="date">30 Mar 2026</span><span className="lx-sym">VEGA28</span><span className="kind">coupon</span><span className="amt num">57,812.50 SOL</span><span className="ok">✓ ON TIME</span></div>
              <div className="lc-log-row"><span className="date">15 Mar 2026</span><span className="lx-sym">ATLAS27</span><span className="kind">coupon</span><span className="amt num">24,150.00 SOL</span><span className="ok">✓ ON TIME</span></div>
              <p className="lc-log-foot" style={{ color: "var(--ink-3)" }}>Illustrative sample, not live protocol data.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
