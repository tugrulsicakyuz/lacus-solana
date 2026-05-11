"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <>
      <style>{`
        .lc-footer {
          background: var(--bg);
          border-top: 1px solid rgba(240,232,216,0.07);
          font-family: 'DM Mono', monospace;
        }
        .lc-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 72px 48px 48px;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
        }
        @media (max-width: 900px) {
          .lc-footer-inner {
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
        }
        @media (max-width: 540px) {
          .lc-footer-inner {
            grid-template-columns: 1fr;
            padding: 48px 24px 32px;
          }
          .lc-footer-bottom { padding: 20px 24px !important; }
        }
        .lc-footer-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 0.18em;
          color: #f0e8d8;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 16px;
        }
        .lc-footer-tagline {
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(201,149,42,0.7);
          margin-bottom: 14px;
        }
        .lc-footer-desc {
          font-size: 11px;
          line-height: 1.8;
          color: rgba(240,232,216,0.28);
          max-width: 28ch;
          letter-spacing: 0.06em;
        }
        .lc-footer-col-title {
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(201,149,42,0.55);
          margin-bottom: 20px;
        }
        .lc-footer-link {
          display: block;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(240,232,216,0.35);
          text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.2s;
        }
        .lc-footer-link:hover { color: #f0e8d8; }
        .lc-footer-bottom {
          border-top: 1px solid rgba(240,232,216,0.06);
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .lc-footer-copy {
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,232,216,0.2);
        }
        .lc-footer-sign {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 14px;
          font-weight: 300;
          color: rgba(240,232,216,0.2);
          letter-spacing: 0.04em;
        }
        .lc-footer-rule {
          width: 24px;
          height: 1px;
          background: linear-gradient(90deg, rgba(201,149,42,0.5), transparent);
          margin-bottom: 20px;
        }
      `}</style>

      <footer className="lc-footer">
        <div className="lc-footer-inner">
          {/* Brand */}
          <div>
            <Link href="/" className="lc-footer-logo">LACUS</Link>
            <div className="lc-footer-rule" />
            <p className="lc-footer-tagline">Open credit infrastructure</p>
            <p className="lc-footer-desc">
              Any company can issue debt. Any investor can buy it. Every term is on-chain — always.
            </p>
          </div>

          {/* Protocol */}
          <div>
            <p className="lc-footer-col-title">Protocol</p>
            <Link href="/launchpad" className="lc-footer-link">Markets</Link>
            <Link href="/dashboard" className="lc-footer-link">Portfolio</Link>
            <Link href="/manage" className="lc-footer-link">Manage</Link>
          </div>

          {/* Resources */}
          <div>
            <p className="lc-footer-col-title">Resources</p>
            <Link href="/whitepaper" className="lc-footer-link">Whitepaper</Link>
            <Link href="/about" className="lc-footer-link">About</Link>
            <Link href="#" className="lc-footer-link">Audits</Link>
          </div>

          {/* Elsewhere */}
          <div>
            <p className="lc-footer-col-title">Elsewhere</p>
            <a href="https://github.com/lacus-fi" target="_blank" rel="noopener noreferrer" className="lc-footer-link">GitHub</a>
            <a href="https://x.com/lacusfi" target="_blank" rel="noopener noreferrer" className="lc-footer-link">X (Twitter)</a>
            <a href="https://mirror.xyz/lacus.eth" target="_blank" rel="noopener noreferrer" className="lc-footer-link">Mirror</a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="lc-footer-bottom">
          <span className="lc-footer-copy">© 2026 · Lacus · Built on Solana</span>
          <span className="lc-footer-sign">Two parties. One agreement. On-chain.</span>
        </div>
      </footer>
    </>
  );
}
