"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { formatDate } from "@/lib/format";
import FaucetButton from "@/components/FaucetButton";

const LINKS = [
  { href: "/launchpad", label: "Launchpad" },
  { href: "/primary", label: "Primary" },
  { href: "/secondary", label: "Secondary" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/manage", label: "Manage" },
  { href: "/about", label: "About" },
  { href: "/whitepaper", label: "Whitepaper" },
];

export default function Navbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const today = formatDate(Date.now() / 1000);

  return (
    <header className="lc-header">
      <div className="lx-wrap">
        <div className="lc-masthead">
          <span>Peer-to-peer credit, executed on Solana</span>
          <span className="num">{mounted ? `${today} · Devnet` : "Devnet"}</span>
        </div>
        <nav className="lc-nav">
          <Link href="/" className="lc-nav-logo">Lacus</Link>
          <ul className="lc-nav-links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
          <div className="lc-nav-right">
            <span className="lc-devnet">DEVNET</span>
            {mounted && <FaucetButton />}
            {mounted && <WalletMultiButton />}
          </div>
        </nav>
      </div>
    </header>
  );
}
