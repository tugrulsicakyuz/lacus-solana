"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

export default function PitchPage() {
  return (
      <div className="wp-root">
        {/* Top Bar */}
        <div className="wp-bar">
          <div className="wp-bar-left">
            <Link href="/" className="wp-logo">LACUS</Link>
            <span className="wp-ver">Pitch Deck</span>
          </div>
          <div className="wp-bar-right">
            <a href="/pitch.pdf" download className="wp-btn">
              <Download style={{ width: 12, height: 12 }} />
              Download PDF
            </a>
            <Link href="/" className="wp-btn">
              <ArrowLeft style={{ width: 12, height: 12 }} />
              Back
            </Link>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="wp-viewer">
          <iframe src="/pitch.pdf" title="Lacus Pitch Deck" />
        </div>
      </div>
  );
}
