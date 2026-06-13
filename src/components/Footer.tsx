"use client";

import Link from "next/link";
import { LACUS_PROGRAM_ID_STRING } from "@/config/program-id";

const programId = LACUS_PROGRAM_ID_STRING;
const programShort = `${programId.slice(0, 6)}…${programId.slice(-4)}`;

export default function Footer() {
  return (
    <footer className="lc-footer">
      <div className="lx-wrap">
        <div className="lc-footer-cols">
          <div>
            <Link href="/" className="lc-footer-brand">Lacus</Link>
            <p className="lc-footer-desc">
              Real borrowers, real contracts, executed on Solana. Lacus never holds your funds.
            </p>
          </div>

          <div>
            <p className="lc-footer-col-title">Markets</p>
            <Link href="/launchpad" className="lc-footer-link">Launchpad</Link>
            <Link href="/primary" className="lc-footer-link">Primary</Link>
            <Link href="/secondary" className="lc-footer-link">Secondary</Link>
          </div>

          <div>
            <p className="lc-footer-col-title">Account</p>
            <Link href="/dashboard" className="lc-footer-link">Dashboard</Link>
            <Link href="/manage" className="lc-footer-link">Manage</Link>
            <Link href="/manage/issue" className="lc-footer-link">Issue a bond</Link>
          </div>

          <div>
            <p className="lc-footer-col-title">Resources</p>
            <Link href="/about" className="lc-footer-link">About</Link>
            <Link href="/whitepaper" className="lc-footer-link">Whitepaper</Link>
            <Link href="/pitch" className="lc-footer-link">Pitch deck</Link>
            <a href="https://github.com/lacus-fi" target="_blank" rel="noopener noreferrer" className="lc-footer-link">GitHub</a>
          </div>
        </div>

        <div className="lc-footer-colophon">
          <span>SET IN SPECTRAL &amp; IBM PLEX MONO</span>
          <span>RECORDS ON SOLANA DEVNET</span>
          <span className="num">PROGRAM {programShort}</span>
          <span style={{ marginLeft: "auto" }}>EST. 2025</span>
        </div>
        <p className="lc-footer-legal">
          Lacus is experimental software running on Solana devnet. Bonds shown here are test
          instruments with no monetary value. Nothing on this site is investment advice. Lacus is
          non-custodial software: funds move wallet to wallet through program-owned escrow.
        </p>
      </div>
    </footer>
  );
}
