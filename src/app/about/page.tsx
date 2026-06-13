"use client";

import { LACUS_PROGRAM_ID_STRING } from "@/config/program-id";

const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export default function AboutPage() {
  return (
    <div className="lx-wrap">
      <div className="lx-pagehead">
        <div className="lx-kicker">About</div>
        <h1>The part of finance crypto skipped.</h1>
      </div>

      <div className="ab-prose">
        <p>
          Strip a bank down to its essentials and the job is simple: bind real parties to real
          contracts, then make sure those contracts execute. Loans, schedules, payments.
          Everything else is overhead on that one function.
        </p>
        <p>
          Crypto built exchanges, derivatives, and a thousand ways to bet. It never built the
          function itself. A decade in, most of the ecosystem still runs on speculation, and that
          keeps it fragile.
        </p>
        <p>
          Lacus rebuilds that function as software. A bond here is a loan agreement between two
          parties. The terms live in a program account that neither side can change. Payments
          execute on Solana, wallet to wallet, in USDC. The protocol is non-custodial: we provide
          the paper and the rails, never the bank account.
        </p>
        <p>
          Today that means corporate bonds. The goal is a real credit layer for the network:
          startup debt, traditional companies, one day even mortgages, sitting next to tokenized
          treasuries and stocks in a single portfolio. Real cash flows are how this ecosystem
          grows up.
        </p>
      </div>

      <section className="lx-section tight">
        <div className="lx-sec-head">
          <h2>Principles</h2>
        </div>
        <div className="lx-clauses">
          <div className="lx-clause reveal">
            <div className="ghost">1</div>
            <div className="no">PRINCIPLE 1</div>
            <h3>Non-custodial, always</h3>
            <p>
              Funds move wallet to wallet through program-owned escrow. Lacus has no account to
              freeze and no till to raid.
            </p>
          </div>
          <div className="lx-clause reveal">
            <div className="ghost">2</div>
            <div className="no">PRINCIPLE 2</div>
            <h3>The contract is the product</h3>
            <p>Terms lock at issuance and execute on schedule. Not by goodwill, by code.</p>
          </div>
          <div className="lx-clause reveal">
            <div className="ghost">3</div>
            <div className="no">PRINCIPLE 3</div>
            <h3>Real economy only</h3>
            <p>
              Every instrument is a real obligation of a real party. No tokens for the sake of
              tokens.
            </p>
          </div>
        </div>
      </section>

      <section className="lx-section tight" style={{ paddingTop: 0 }}>
        <div className="lx-sec-head">
          <h2>Protocol addresses</h2>
          <span className="sub">Verify everything</span>
        </div>
        <div className="ab-addrs">
          <div className="lx-addr-row">
            <span className="k">Program</span>
            <code className="num">{LACUS_PROGRAM_ID_STRING}</code>
            <a href={`https://explorer.solana.com/address/${LACUS_PROGRAM_ID_STRING}?cluster=devnet`} target="_blank" rel="noopener noreferrer">EXPLORER ↗</a>
          </div>
          <div className="lx-addr-row">
            <span className="k">USDC mint · devnet</span>
            <code className="num">{USDC_DEVNET}</code>
            <a href={`https://explorer.solana.com/address/${USDC_DEVNET}?cluster=devnet`} target="_blank" rel="noopener noreferrer">EXPLORER ↗</a>
          </div>
          <div className="lx-addr-row">
            <span className="k">Source code</span>
            <code>github.com/tugrulsicakyuz/lacus-solana</code>
            <a href="https://github.com/tugrulsicakyuz/lacus-solana" target="_blank" rel="noopener noreferrer">GITHUB ↗</a>
          </div>
        </div>
      </section>
      <div style={{ paddingBottom: 48 }} />
    </div>
  );
}
