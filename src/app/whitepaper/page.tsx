"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

export default function WhitepaperPage() {
  return (
    <div style={{ height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", background: "#05080f" }}>
      {/* Top Bar */}
      <div style={{ height: "48px", background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        {/* Left: Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{ display: "flex", height: "28px", width: "28px", alignItems: "center", justifyContent: "center", borderRadius: "6px", background: "#4c7df4", boxShadow: "0 0 12px rgba(76,125,244,0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8C3 5.239 5.239 3 8 3C10.761 3 13 5.239 13 8" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M5 10.5C5 9.119 6.343 8 8 8C9.657 8 11 10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="8" cy="13" r="1.2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em", color: "#f1f5f9" }}>Lacus</span>
          </Link>
          <span style={{ fontSize: "14px", color: "#64748b" }}>Whitepaper v1.0</span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a
            href="/whitepaper.pdf"
            download
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 16px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#94a3b8",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "border-color 0.2s, color 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              e.currentTarget.style.color = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <Download style={{ width: "14px", height: "14px" }} />
            Download PDF
          </a>
          <Link
            href="/about"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 16px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#94a3b8",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "border-color 0.2s, color 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              e.currentTarget.style.color = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <ArrowLeft style={{ width: "14px", height: "14px" }} />
            Back
          </Link>
        </div>
      </div>

      {/* PDF Viewer */}
      <iframe
        src="/whitepaper.pdf"
        style={{
          width: "100%",
          height: "calc(100vh - 108px)",
          border: "none"
        }}
        title="Lacus Whitepaper"
      />
    </div>
  );
}
