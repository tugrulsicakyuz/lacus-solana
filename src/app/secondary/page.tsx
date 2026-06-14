"use client";

import Link from "next/link";

const features = [
  { n: "001", title: "Peer-to-peer", sub: "Direct Trading", desc: "List your position at your price. No intermediary, no custody, no counterparty risk." },
  { n: "002", title: "Instant settlement", sub: "T+0", desc: "Settlement between two wallets, one transaction. No clearing house, no T+2 delay." },
  { n: "003", title: "Transparent", sub: "Fully On-Chain", desc: "Every bid, every ask, every fill: on-chain and auditable. Unlike a CDO, nothing is hidden." },
  { n: "004", title: "Verifiable", sub: "Open On-Chain", desc: "Terms, maturity, coupon and issuer are recorded on-chain for anyone to check. Issuance is permissionless, so you do your own due diligence." },
  { n: "005", title: "Non-custodial", sub: "Your Keys, Your Funds", desc: "No bridge, no wrapped asset, no custody. Positions settle directly between wallets through program-owned escrow." },
  { n: "006", title: "Continuous", sub: "Always Open", desc: "No trading hours. No gates. A permanent, always-on market for structured on-chain credit." },
];

const phases = [
  { n: "01", label: "Primary market", status: "live", desc: "Bond issuance and direct purchase from issuers. SOL in, yield-bearing tokens out." },
  { n: "02", label: "Portfolio & yield", status: "live", desc: "Holdings dashboard, coupon claims, maturity redemption, principal deposits." },
  { n: "03", label: "Secondary market", status: "building", desc: "P2P listings, order matching, atomic settlement between holders." },
  { n: "04", label: "Structured products", status: "planned", desc: "Transparent portfolio construction: mix high-yield and safe instruments. The CDO, rebuilt with full visibility." },
];

export default function SecondaryMarket() {
  return (
    <div>
      <div className="lx-wrap">
        <div className="lx-pagehead">
          <div className="lx-kicker">Secondary market</div>
          <h1>Trade before maturity.</h1>
          <p className="lx-lede">
            Sell your side of the agreement before maturity, or buy into one that is already live.
            The market sets the price. The contract handles accrued interest.
          </p>
        </div>

        {/* Status */}
        <div className="sec-bar num">
          <span className="lx-stamp open">PRIMARY · LIVE</span>
          <span className="lx-stamp">SECONDARY · BUILDING</span>
          <span className="lx-stamp">STRUCTURED · PLANNED</span>
          <span className="sec-phase-count">Phase 03 / 04</span>
        </div>

        {/* Features */}
        <section className="lx-section tight">
          <div className="lx-sec-head">
            <h2>What it will be</h2>
            <span className="sub">In development</span>
          </div>
          <div className="sec-features">
            {features.map((f) => (
              <div key={f.n} className="sec-feature reveal">
                <div className="no num">{f.n}</div>
                <h3>{f.title}</h3>
                <div className="sub2">{f.sub}</div>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="lx-section tight" style={{ paddingTop: 0 }}>
          <div className="lx-sec-head">
            <h2>Protocol roadmap</h2>
            <span className="sub">Issue, buy, trade, and build portfolios. Four phases, one open credit infrastructure.</span>
          </div>
          <div className="sec-phases">
            {phases.map((p) => (
              <div key={p.n} className={`sec-phase ${p.status}`}>
                <span className="pn num">{p.n}</span>
                <div>
                  <div className="pname">{p.label}</div>
                  <div className="pdesc">{p.desc}</div>
                </div>
                <span className={`pstatus num ${p.status}`}>
                  {p.status === "live" ? "● LIVE" : p.status === "building" ? "◌ BUILDING" : "PLANNED"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="lx-inkband" style={{ marginTop: 32 }}>
        <div className="lx-wrap lx-ctaband">
          <div>
            <h2>Earn yield now.</h2>
            <p>
              While secondary trading is being built, the primary market is live. Browse live
              issues, pick your yield, and lend directly, no intermediary.
            </p>
          </div>
          <Link href="/primary" className="lx-btn">Go to Primary Market</Link>
        </div>
      </div>
    </div>
  );
}
