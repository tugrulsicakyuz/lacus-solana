"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dropdownBox: React.CSSProperties = {
    position: "absolute",
    top: "100%",          /* no gap — hover area is continuous */
    left: "50%",
    transform: "translateX(-50%)",
    paddingTop: "12px",   /* visual gap via padding, not offset */
    zIndex: 9999,
    mixBlendMode: "normal",
    minWidth: "180px",
  };

  const dropdownInner: React.CSSProperties = {
    background: "#1a1710",
    border: "1px solid rgba(201,149,42,0.35)",
    borderRadius: "8px",
    padding: "8px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  };

  const dropdownLink: React.CSSProperties = {
    display: "block",
    padding: "9px 12px",
    borderRadius: "6px",
    color: "rgba(240,232,216,0.8)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    textDecoration: "none",
    transition: "color 0.2s, background 0.2s",
  };

  return (
    <>
      <style>{`
        .lc-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 500;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 28px 48px;
          mix-blend-mode: difference;
          pointer-events: none;
        }
        .lc-nav > * {
          pointer-events: all;
        }
        .lc-nav-logo {
          font-family: "Bebas Neue", sans-serif;
          font-size: 22px;
          letter-spacing: 0.18em;
          color: #f0e8d8;
          text-decoration: none;
        }
        .lc-nav-links {
          display: flex;
          gap: 36px;
          list-style: none;
          margin: 0;
          padding: 0;
          align-items: center;
        }
        .lc-nav-links a,
        .lc-nav-btn {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(240,232,216,0.5);
          text-decoration: none;
          transition: color 0.3s;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0;
        }
        .lc-nav-links a:hover,
        .lc-nav-btn:hover {
          color: #f0e8d8;
        }
        .lc-nav-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 9px 22px;
          border: 1px solid rgba(201,149,42,0.8);
          color: #f0e8d8;
          text-decoration: none;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: color 0.3s;
          font-family: 'DM Mono', monospace;
        }
        .lc-nav-cta::before {
          content: "";
          position: absolute;
          inset: 0;
          background: oklch(0.72 0.14 72);
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .lc-nav-cta:hover { color: #0d0b08; }
        .lc-nav-cta:hover::before { transform: translateY(0); }
        .lc-nav-cta span { position: relative; z-index: 1; }

        /* Dropdown escapes the blend mode by sitting in a higher stacking context */
        .lc-dropdown-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .lc-dropdown-portal {
          position: fixed;
          mix-blend-mode: normal;
          z-index: 9999;
        }
      `}</style>

      <nav className="lc-nav">
        {/* Logo */}
        <Link href="/" className="lc-nav-logo">LACUS</Link>

        {/* Links */}
        <ul className="lc-nav-links">
          <li>
            <Link href="/launchpad">Markets</Link>
          </li>

          {/* Trade */}
          <li className="lc-dropdown-wrap"
            onMouseEnter={() => setTradeOpen(true)}
            onMouseLeave={() => setTradeOpen(false)}
          >
            <button className="lc-nav-btn">
              Trade
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                style={{ opacity: 0.5, transition: "transform 0.2s", transform: tradeOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            {tradeOpen && (
              <div style={dropdownBox}>
                <div style={dropdownInner}>
                  <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(201,149,42,0.5), transparent)", margin: "0 8px 8px" }} />
                  <Link href="/primary" style={dropdownLink}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f0e8d8"; (e.currentTarget as HTMLElement).style.background = "rgba(201,149,42,0.07)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(240,232,216,0.8)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    Buy Bonds
                  </Link>
                  <Link href="/secondary" style={dropdownLink}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f0e8d8"; (e.currentTarget as HTMLElement).style.background = "rgba(201,149,42,0.07)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(240,232,216,0.8)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    Secondary Market
                  </Link>
                </div>
              </div>
            )}
          </li>

          <li>
            <Link href="/dashboard">Portfolio</Link>
          </li>

          {/* Issue */}
          <li className="lc-dropdown-wrap"
            onMouseEnter={() => setIssueOpen(true)}
            onMouseLeave={() => setIssueOpen(false)}
          >
            <button className="lc-nav-btn">
              Issue
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                style={{ opacity: 0.5, transition: "transform 0.2s", transform: issueOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            {issueOpen && (
              <div style={dropdownBox}>
                <div style={dropdownInner}>
                  <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(201,149,42,0.5), transparent)", margin: "0 8px 8px" }} />
                  <Link href="/manage/issue" style={dropdownLink}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f0e8d8"; (e.currentTarget as HTMLElement).style.background = "rgba(201,149,42,0.07)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(240,232,216,0.8)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    Issue Bonds
                  </Link>
                  <Link href="/manage" style={dropdownLink}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f0e8d8"; (e.currentTarget as HTMLElement).style.background = "rgba(201,149,42,0.07)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(240,232,216,0.8)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    Manage
                  </Link>
                </div>
              </div>
            )}
          </li>

          <li>
            <Link href="/about">About</Link>
          </li>
        </ul>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {mounted && (
            <WalletMultiButton
              style={{
                backgroundColor: "transparent",
                border: "1px solid rgba(201,149,42,0.4)",
                borderRadius: "4px",
                fontSize: "10px",
                height: "34px",
                padding: "0 14px",
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#f0e8d8",
              }}
            />
          )}
        </div>
      </nav>
    </>
  );
}
