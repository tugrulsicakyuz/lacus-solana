"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

export default function WhitepaperPage() {
  return (
    <>
      <style>{`
        .wp-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0d0b08;
          font-family: 'DM Mono', monospace;
        }
        .wp-bar {
          height: 56px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(240,232,216,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: rgba(13,11,8,0.98);
        }
        .wp-bar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .wp-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 0.18em;
          color: #f0e8d8;
          text-decoration: none;
        }
        .wp-ver {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(240,232,216,0.35);
          padding-left: 16px;
          border-left: 1px solid rgba(240,232,216,0.1);
        }
        .wp-bar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .wp-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 16px;
          border: 1px solid rgba(240,232,216,0.14);
          color: rgba(240,232,216,0.5);
          text-decoration: none;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
          font-family: 'DM Mono', monospace;
          background: none;
        }
        .wp-btn:hover {
          color: #f0e8d8;
          border-color: rgba(240,232,216,0.35);
        }
        .wp-viewer {
          flex: 1;
          margin: 16px;
          border: 1px solid rgba(240,232,216,0.06);
          overflow: hidden;
          background: rgba(255,255,255,0.01);
        }
        .wp-viewer iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      `}</style>

      <div className="wp-root">
        {/* Top Bar */}
        <div className="wp-bar">
          <div className="wp-bar-left">
            <Link href="/" className="wp-logo">LACUS</Link>
            <span className="wp-ver">Whitepaper v1.0</span>
          </div>
          <div className="wp-bar-right">
            <a href="/whitepaper.pdf" download className="wp-btn">
              <Download style={{ width: 12, height: 12 }} />
              Download PDF
            </a>
            <Link href="/about" className="wp-btn">
              <ArrowLeft style={{ width: 12, height: 12 }} />
              Back
            </Link>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="wp-viewer">
          <iframe src="/whitepaper.pdf" title="Lacus Whitepaper" />
        </div>
      </div>
    </>
  );
}
