"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import Logo from "@/components/Logo";

export default function WhitepaperPage() {
  return (
    <div className="h-[calc(100vh-60px)] flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-[var(--deep)] border-b border-[var(--rule)] flex items-center justify-between px-6">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <Logo size="footer" />
            <span className="wordmark text-[1.1rem]">Lacus</span>
          </Link>
          <span className="text-sm text-[var(--ink3)] font-mono">Whitepaper v1.0</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <a
            href="/whitepaper.pdf"
            download
            className="btn-ghost px-4 py-2 text-sm inline-flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
          <Link
            href="/about"
            className="btn-ghost px-4 py-2 text-sm inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 card-luminous m-4 rounded-2xl overflow-hidden">
        <iframe
          src="/whitepaper.pdf"
          className="w-full h-full border-none"
          title="Lacus Whitepaper"
        />
      </div>
    </div>
  );
}
