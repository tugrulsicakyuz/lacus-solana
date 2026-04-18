"use client";

import Link from "next/link";

const footerLinks = [
  { label: "Markets", href: "/launchpad" },
  { label: "Primary Market", href: "/primary" },
  { label: "Secondary Market", href: "/secondary" },
  { label: "Portfolio", href: "/dashboard" },
  { label: "Management", href: "/manage" },
  { label: "Issue Request", href: "/apply" },
];

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "#05080f",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main row */}
        <div className="flex flex-col items-center gap-6 py-10 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <Link
              href="/"
              className="flex items-center gap-2"
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(76,125,244,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 14C7 10.134 10.134 7 14 7C17.866 7 21 10.134 21 14"
                    stroke="#4c7df4"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 17.5C10 15.567 11.791 14 14 14C16.209 14 18 15.567 18 17.5"
                    stroke="#4c7df4"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="14" cy="20.5" r="1.5" fill="#4c7df4" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "rgba(255,255,255,0.85)",
                  textTransform: "uppercase",
                }}
              >
                Sparrow
              </span>
            </Link>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
              P2P Bond Protocol on Base
            </p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            &copy; {new Date().getFullYear()} Sparrow Protocol
          </p>
        </div>

        {/* Legal disclaimer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16, paddingBottom: 16 }}>
          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.18)", lineHeight: 1.6 }}>
            This platform operates on{" "}
            <span style={{ color: "rgba(255,255,255,0.35)" }}>Base Sepolia testnet</span>{" "}
            and is for demonstration purposes only. Nothing on this site constitutes financial,
            legal, or investment advice. Do not use real funds.
          </p>
        </div>
      </div>
    </footer>
  );
}
