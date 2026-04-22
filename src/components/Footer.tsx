"use client";

import Link from "next/link";
import Logo from "./Logo";


export default function Footer() {
  return (
    <footer className="relative border-t border-[var(--rule)]">
      <div className="max-w-[1280px] mx-auto px-8 py-14 grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 md:col-span-5 flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-3 group" aria-label="Lacus home">
            <Logo size="footer" />
            <span className="wordmark" style={{ fontSize: '1.35rem' }}>Lacus</span>
          </Link>
          <p className="eyebrow-dim mt-1">Credit markets with luminous depth.</p>
          <p className="text-[var(--ink3)] text-[0.88rem] leading-[1.6] mt-2 max-w-[36ch]">
            A Solana-native protocol for tokenized fixed-income. Open, continuous, and observable by default.
          </p>
        </div>

        <div className="col-span-6 md:col-span-2 flex flex-col gap-3">
          <div className="eyebrow-dim mb-1">Protocol</div>
          <Link href="#markets" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            Markets
          </Link>
          <Link href="#" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            Portfolio
          </Link>
          <Link href="#" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            Governance
          </Link>
        </div>

        <div className="col-span-6 md:col-span-2 flex flex-col gap-3">
          <div className="eyebrow-dim mb-1">Resources</div>
          <Link href="#" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            Whitepaper
          </Link>
          <Link href="#" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            Docs
          </Link>
          <Link href="#" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            Audits
          </Link>
        </div>

        <div className="col-span-12 md:col-span-3 flex flex-col gap-3">
          <div className="eyebrow-dim mb-1">Elsewhere</div>
          <Link href="#" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            GitHub
          </Link>
          <Link href="#" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            X (Twitter)
          </Link>
          <Link href="#" className="text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-[0.92rem]">
            Mirror
          </Link>
        </div>
      </div>

      <div className="border-t border-[var(--rule)]">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow-dim">© 2026 · Lacus Protocol · Built on Solana</p>
          <p className="font-display italic text-[var(--ink3)] text-[0.9rem]">Deep water stays clear.</p>
        </div>
      </div>
    </footer>
  );
}
