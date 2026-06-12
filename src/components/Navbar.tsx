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
    fontFamily: "var(--font-dm-mono)",
    fontSize: "10px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    textDecoration: "none",
    transition: "color 0.2s, background 0.2s",
  };

  return (
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
                fontFamily: "var(--font-dm-mono)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#f0e8d8",
              }}
            />
          )}
        </div>
      </nav>
  );
}
