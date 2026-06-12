"use client";

import Link from "next/link";
import { LACUS_PROGRAM_ID } from "@/config/solana";

// Statik vitrin: §4–§6'daki tahvil/ödeme içerikleri concept rev 6'daki örnek
// veridir (devnet demo illüstrasyonu) — canlı veri /primary ve /launchpad'dedir.
const EXPLORER = `https://explorer.solana.com/address/${LACUS_PROGRAM_ID.toBase58()}?cluster=devnet`;

export default function LandingPage() {
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

          <div className="lx-cert-stack reveal">
            <div className="lx-cert">
              <div className="row1"><span>No. 0001 / 5,000</span><span>SERIES 2025-A</span></div>
              <div className="lx-cert-rule"></div>
              <div className="title">CORPORATE BOND · SENIOR UNSECURED</div>
              <div className="name">ATLAS27</div>
              <div className="co">Atlas Lojistik A.Ş., İzmir</div>
              <div className="face">
                <div className="v num">$100.00</div>
                <div className="k">FACE VALUE · PAYABLE IN USDC</div>
              </div>
              <div className="terms">
                <span>COUPON 11.50%</span>
                <span>SEMI-ANNUAL</span>
                <span>DUE 15 MAR 2027</span>
              </div>
              <div className="seal"><span>L</span></div>
              <div className="stub">
                <span className="cut">✂ ·······</span>
                <span>COUPON № 3 · $5.75 · 15 SEP 2026</span>
                <span className="pay">CLAIM IN USDC ↗</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* INK STAT BAND */}
      <div className="lx-inkband">
        <div className="lx-wrap">
          <div className="stats">
            <div className="stat"><div className="k">Total face value</div><div className="v num">$2.30M</div></div>
            <div className="stat"><div className="k">Active bonds</div><div className="v num">4</div></div>
            <div className="stat"><div className="k">Coupons paid on time<sup>1</sup></div><div className="v num">128 / 128</div></div>
            <div className="stat"><div className="k">Interest distributed</div><div className="v num">$190.1K</div></div>
          </div>
          <p className="lx-fn">
            <sup>1</sup> Counted per holder per payment date, across all issues since protocol
            launch. A late payment would show here, permanently.
          </p>
        </div>
      </div>

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
              <div className="fine">Terms hash: 4f2a…9c1e</div>
            </div>
            <div className="lx-clause reveal">
              <div className="ghost">2</div>
              <div className="no">§ 2 · FUND</div>
              <h3>Lenders fund it, peer to peer</h3>
              <p>
                Each unit is $100.00 of the loan, paid in USDC. Money moves from your wallet into
                program-owned escrow. Lacus never touches it.
              </p>
              <div className="fine">Escrow: program-owned, auditable</div>
            </div>
            <div className="lx-clause reveal">
              <div className="ghost">3</div>
              <div className="no">§ 3 · EXECUTE</div>
              <h3>The contract executes itself</h3>
              <p>
                Coupons flow from borrower to lender on fixed dates, principal at maturity. There
                is no bank in the middle. Late is visible. Missing is undeniable.
              </p>
              <div className="fine">Record to date: 128 / 128 on time</div>
            </div>
          </div>
        </section>
      </div>

      {/* CURRENT OFFERING */}
      <div className="lx-tint">
        <div className="lx-wrap">
          <section className="lx-section">
            <div className="lx-sec-head">
              <span className="lx-sec-no">§ 4</span>
              <h2>Current offering</h2>
              <span className="sub">Open for subscription until 28 Jun 2026</span>
              <Link className="more" href="/launchpad">All offerings →</Link>
            </div>
            <div className="lx-sheet reveal">
              <div className="lx-sheet-head">
                <span className="t">ATLAS27 · Atlas Lojistik A.Ş.</span>
                <span className="series">SERIES 2025-A · SENIOR UNSECURED</span>
                <span className="st">● OPEN</span>
              </div>
              <div className="lx-sheet-body">
                <div className="lx-sheet-col">
                  <dl>
                    <dt>Face value</dt><dd className="num">$100.00 / unit</dd>
                    <dt>Issue size</dt><dd className="num">$500,000.00</dd>
                    <dt>Units</dt><dd className="num">5,000</dd>
                    <dt>Price</dt><dd className="num">$98.40</dd>
                    <dt>Yield to maturity</dt><dd className="num">12.71%</dd>
                  </dl>
                </div>
                <div className="lx-sheet-col">
                  <dl>
                    <dt>Coupon</dt><dd className="num">11.50% p.a.</dd>
                    <dt>Frequency</dt><dd>Semi-annual</dd>
                    <dt>Settlement</dt><dd>USDC</dd>
                    <dt>Maturity</dt><dd className="num">15 Mar 2027</dd>
                    <dt>Next payment</dt><dd className="num">15 Sep 2026</dd>
                  </dl>
                </div>
                <div className="lx-sheet-col">
                  <div className="lx-submeter">
                    <div className="cap"><span>Subscribed</span><span className="num">84%</span></div>
                    <div className="bar"><i style={{ width: "84%" }}></i></div>
                    <div className="fig num">$420,000.00 of $500,000.00</div>
                  </div>
                  <div className="lx-sheet-cta">
                    <Link href="/primary" className="lx-btn lx-btn-solid lx-btn-sm lx-btn-block">Buy units</Link>
                  </div>
                </div>
              </div>
              <div className="lx-sheet-foot">
                <span>MINT <code className="num">AtLs4k…W9qw</code></span>
                <span>ESCROW <code className="num">3rNdQe…Xz2p</code></span>
                <span>ISSUER <code className="num">9wAtLs…7mKe</code></span>
                <span>STRUCTURE: BILATERAL LOAN AGREEMENT</span>
                <a style={{ marginLeft: "auto" }} href={EXPLORER} target="_blank" rel="noopener noreferrer">VERIFY ON EXPLORER ↗</a>
              </div>
            </div>

            <div className="lx-iblock">
              <div>
                <h3 className="lx-subhead">About the issuer</h3>
                <div className="lx-drule"></div>
                <p>
                  Atlas Lojistik runs contract freight for industrial exporters out of İzmir: 86
                  trucks, three depots, and long-term volume agreements with manufacturers in the
                  Aegean free zones. The company has been profitable for six consecutive years.
                </p>
                <p>Proceeds fund twelve additional vehicles and warehouse automation at the Çiğli depot.</p>
                <Link className="lx-readmore" href="/primary">Read the full disclosure ↗</Link>
              </div>
              <div>
                <h3 className="lx-subhead">Key figures</h3>
                <div className="lx-drule"></div>
                <dl className="lx-figures">
                  <div><dt>Founded</dt><dd className="num">2011 · İzmir</dd></div>
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

      {/* MARKETS */}
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
                  <th className="r">Price</th><th className="r">YTM</th><th className="r">Subscription</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="lx-rowno">01</td>
                  <td><div className="lx-sym">ATLAS27</div><div className="lx-issuer">Atlas Lojistik A.Ş.</div></td>
                  <td className="r num">11.50%</td><td className="r num">15 Mar 2027</td>
                  <td className="r num">$98.40</td><td className="r num">12.71%</td>
                  <td className="r"><span className="lx-stamp open num">84% SOLD</span></td>
                  <td className="r"><Link href="/primary" className="lx-btn lx-btn-ghost lx-btn-sm">Buy</Link></td>
                </tr>
                <tr>
                  <td className="lx-rowno">02</td>
                  <td><div className="lx-sym">VEGA28</div><div className="lx-issuer">Vega Tarım Gıda A.Ş.</div></td>
                  <td className="r num">9.25%</td><td className="r num">30 Sep 2028</td>
                  <td className="r num">$101.20</td><td className="r num">8.82%</td>
                  <td className="r"><span className="lx-stamp num">SOLD OUT</span></td>
                  <td className="r"><Link href="/secondary" className="lx-btn lx-btn-ghost lx-btn-sm">Trade</Link></td>
                </tr>
                <tr>
                  <td className="lx-rowno">03</td>
                  <td><div className="lx-sym">NOVA26</div><div className="lx-issuer">Nova Enerji Sistemleri A.Ş.</div></td>
                  <td className="r num">13.00%</td><td className="r num">01 Dec 2026</td>
                  <td className="r num">$96.10</td><td className="r num">15.34%</td>
                  <td className="r"><span className="lx-stamp open num">67% SOLD</span></td>
                  <td className="r"><Link href="/primary" className="lx-btn lx-btn-ghost lx-btn-sm">Buy</Link></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="lx-soon">CORPORATE BONDS TODAY · MORE INSTRUMENTS SOON</div>
        </section>
      </div>

      {/* PAYMENT RECORD */}
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
                  <span className="total">cumulative since launch · USDC</span>
                </div>
                <div className="lx-drule"></div>
                <svg
                  className="lc-chart"
                  viewBox="0 0 520 210"
                  role="img"
                  aria-label="Cumulative interest distributed to investors, from zero at launch in July 2025 to 190.1 thousand dollars in June 2026, rising in steps at each coupon payment date"
                >
                  <line className="gline" x1="40" y1="60" x2="500" y2="60" />
                  <line className="gline" x1="40" y1="120" x2="500" y2="120" />
                  <line className="axis" x1="40" y1="180" x2="500" y2="180" />
                  <text x="34" y="183" textAnchor="end">$0</text>
                  <text x="34" y="123" textAnchor="end">$100K</text>
                  <text x="34" y="63" textAnchor="end">$200K</text>
                  <path className="fill" d="M40,180 H136 V165.5 H155 V130.8 H197 V123 H352 V108.5 H365 V73.8 H440 V65.9 H500 V180 Z" />
                  <path className="step" d="M40,180 H136 V165.5 H155 V130.8 H197 V123 H352 V108.5 H365 V73.8 H440 V65.9 H500" />
                  <circle className="enddot" cx="500" cy="65.9" r="3.5" />
                  <text className="endlbl" x="497" y="52" textAnchor="end">$190.1K</text>
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
                <div className="lc-log-row"><span className="date">01 Jun 2026</span><span className="lx-sym">NOVA26</span><span className="kind">coupon</span><span className="tx num">4mPz…Tq8c</span><span className="amt num">$13,065.00</span><span className="ok">✓ ON TIME</span></div>
                <div className="lc-log-row"><span className="date">30 Mar 2026</span><span className="lx-sym">VEGA28</span><span className="kind">coupon</span><span className="tx num">8jQw…Lr4t</span><span className="amt num">$57,812.50</span><span className="ok">✓ ON TIME</span></div>
                <div className="lc-log-row"><span className="date">15 Mar 2026</span><span className="lx-sym">ATLAS27</span><span className="kind">coupon</span><span className="tx num">5Kd9…2mVp</span><span className="amt num">$24,150.00</span><span className="ok">✓ ON TIME</span></div>
                <div className="lc-log-row"><span className="date">01 Dec 2025</span><span className="lx-sym">NOVA26</span><span className="kind">coupon</span><span className="tx num">2xNe…9aGd</span><span className="amt num">$13,065.00</span><span className="ok">✓ ON TIME</span></div>
                <div className="lc-log-row"><span className="date">30 Sep 2025</span><span className="lx-sym">VEGA28</span><span className="kind">coupon</span><span className="tx num">7tRk…Mw3s</span><span className="amt num">$57,812.50</span><span className="ok">✓ ON TIME</span></div>
                <p className="lc-log-foot">
                  <a href={EXPLORER} target="_blank" rel="noopener noreferrer">View the full record on-chain ↗</a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
