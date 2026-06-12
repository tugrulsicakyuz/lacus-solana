"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_BACKGROUNDS: Record<string, string> = {
  "/dashboard": "#080610",
  "/manage":    "#0e0508",
  "/about":     "#060d08",
};

function getFooterBg(pathname: string): string {
  if (pathname.startsWith("/manage")) return "#0e0508";
  if (pathname.startsWith("/bond"))   return "#030d10";
  return PAGE_BACKGROUNDS[pathname] ?? "#0d0b08";
}

export default function Footer() {
  const pathname = usePathname();
  const bg = getFooterBg(pathname);

  return (
    <footer className="lc-footer" style={{ background: bg }}>
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
  );
}
