"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Logo from "./Logo";

/* ── Dropdown panel ── */
function DropdownMenu({
  items,
  pathname,
  accentColor,
}: {
  items: { label: string; href: string; desc: string }[];
  pathname: string;
  accentColor: "aqua" | "lilac";
}) {
  const ac =
    accentColor === "aqua"
      ? {
          strip: "var(--aqua-soft)",
          border: "rgba(125,211,252,0.18)",
          bg: "rgba(125,211,252,0.07)",
          text: "var(--aqua-bright)",
        }
      : {
          strip: "var(--lilac)",
          border: "rgba(196,181,253,0.18)",
          bg: "rgba(196,181,253,0.07)",
          text: "var(--lilac)",
        };

  return (
    <div
      style={{
        background: "rgba(8,10,26,0.94)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(226,228,245,0.09)",
        borderRadius: "16px",
        padding: "10px",
        minWidth: "210px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(125,211,252,0.03) inset",
      }}
    >
      {/* Accent strip */}
      <div
        style={{
          height: "1px",
          background: `linear-gradient(90deg, ${ac.strip}, transparent 70%)`,
          margin: "0 10px 10px",
          opacity: 0.55,
        }}
      />
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "block",
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${isActive ? ac.border : "transparent"}`,
              background: isActive ? ac.bg : "transparent",
              textDecoration: "none",
              transition: "background 0.15s ease, border-color 0.15s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "rgba(226,228,245,0.04)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.70rem",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: isActive ? ac.text : "var(--ink2)",
                marginBottom: "2px",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "0.68rem",
                color: "var(--ink4)",
                letterSpacing: "0.01em",
              }}
            >
              {item.desc}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Main Navbar ── */
export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const { connected } = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  const tradeItems = [
    { label: "Buy Bonds", href: "/primary", desc: "Primary issuances" },
    { label: "Secondary Market", href: "/secondary", desc: "P2P bond trading" },
  ];

  const issueItems = [
    { label: "Issue Bonds", href: "/apply", desc: "Tokenize your debt" },
    { label: "Manage", href: "/manage", desc: "Track instruments" },
  ];

  const isTradeActive = tradeItems.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );
  const isIssueActive = issueItems.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  /* nav link base style */
  const navItem = (active: boolean) => ({
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.68rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: active ? "var(--ink)" : "var(--ink4)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 0",
    transition: "color 0.2s ease",
    textDecoration: "none",
  });

  /* active underline */
  const ActiveBar = ({ color = "aqua" }: { color?: "aqua" | "lilac" }) => (
    <span
      style={{
        position: "absolute",
        bottom: "-22px",
        left: 0,
        right: 0,
        height: "1px",
        borderRadius: "1px",
        background:
          color === "aqua"
            ? "linear-gradient(90deg, var(--aqua-soft), var(--aqua-bright))"
            : "linear-gradient(90deg, var(--lilac), var(--lilac-bright))",
        opacity: 0.8,
      }}
    />
  );

  return (
    <>
      <header
        id="site-header"
        className="sticky top-0 z-50 transition-all duration-300"
        style={{ borderBottom: "1px solid transparent" }}
      >
        {/* Top gradient scan line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 5%, rgba(125,211,252,0.35) 35%, rgba(196,181,253,0.35) 65%, transparent 95%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 48px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex items-center gap-3 group flex-shrink-0"
            aria-label="Lacus home"
          >
            <Logo size="nav" />
            <span className="wordmark">Lacus</span>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-7" style={{ flex: 1, justifyContent: "center" }}>

            <Link
              href="/launchpad"
              style={navItem(pathname === "/launchpad" || pathname.startsWith("/launchpad/"))}
              onMouseEnter={(e) => { if (!(pathname === "/launchpad" || pathname.startsWith("/launchpad/"))) (e.currentTarget as HTMLElement).style.color = "var(--ink2)"; }}
              onMouseLeave={(e) => { if (!(pathname === "/launchpad" || pathname.startsWith("/launchpad/"))) (e.currentTarget as HTMLElement).style.color = "var(--ink4)"; }}
            >
              Markets
              {(pathname === "/launchpad" || pathname.startsWith("/launchpad/")) && <ActiveBar color="aqua" />}
            </Link>

            {/* Trade dropdown */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setTradeOpen(true)}
              onMouseLeave={() => setTradeOpen(false)}
            >
              <button
                style={navItem(isTradeActive)}
                onMouseEnter={(e) => { if (!isTradeActive) (e.currentTarget as HTMLElement).style.color = "var(--ink2)"; }}
                onMouseLeave={(e) => { if (!isTradeActive) (e.currentTarget as HTMLElement).style.color = "var(--ink4)"; }}
              >
                Trade
                <ChevronDown
                  style={{
                    width: "11px",
                    height: "11px",
                    transition: "transform 0.22s ease",
                    transform: tradeOpen ? "rotate(180deg)" : "rotate(0deg)",
                    opacity: 0.6,
                  }}
                />
                {isTradeActive && <ActiveBar color="aqua" />}
              </button>
              {tradeOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 60,
                    paddingTop: "16px",
                  }}
                >
                  <DropdownMenu
                    items={tradeItems}
                    pathname={pathname}
                    accentColor="aqua"
                  />
                </div>
              )}
            </div>

            <Link
              href="/dashboard"
              style={navItem(pathname === "/dashboard" || pathname.startsWith("/dashboard/"))}
              onMouseEnter={(e) => { if (!(pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) (e.currentTarget as HTMLElement).style.color = "var(--ink2)"; }}
              onMouseLeave={(e) => { if (!(pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) (e.currentTarget as HTMLElement).style.color = "var(--ink4)"; }}
            >
              Portfolio
              {(pathname === "/dashboard" || pathname.startsWith("/dashboard/")) && <ActiveBar color="lilac" />}
            </Link>

            {/* Issue dropdown */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setIssueOpen(true)}
              onMouseLeave={() => setIssueOpen(false)}
            >
              <button
                style={navItem(isIssueActive)}
                onMouseEnter={(e) => { if (!isIssueActive) (e.currentTarget as HTMLElement).style.color = "var(--ink2)"; }}
                onMouseLeave={(e) => { if (!isIssueActive) (e.currentTarget as HTMLElement).style.color = "var(--ink4)"; }}
              >
                Issue
                <ChevronDown
                  style={{
                    width: "11px",
                    height: "11px",
                    transition: "transform 0.22s ease",
                    transform: issueOpen ? "rotate(180deg)" : "rotate(0deg)",
                    opacity: 0.6,
                  }}
                />
                {isIssueActive && <ActiveBar color="lilac" />}
              </button>
              {issueOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 60,
                    paddingTop: "16px",
                  }}
                >
                  <DropdownMenu
                    items={issueItems}
                    pathname={pathname}
                    accentColor="lilac"
                  />
                </div>
              )}
            </div>

            <Link
              href="/about"
              style={navItem(pathname === "/about" || pathname.startsWith("/about/"))}
              onMouseEnter={(e) => { if (!(pathname === "/about" || pathname.startsWith("/about/"))) (e.currentTarget as HTMLElement).style.color = "var(--ink2)"; }}
              onMouseLeave={(e) => { if (!(pathname === "/about" || pathname.startsWith("/about/"))) (e.currentTarget as HTMLElement).style.color = "var(--ink4)"; }}
            >
              About
              {(pathname === "/about" || pathname.startsWith("/about/")) && <ActiveBar color="lilac" />}
            </Link>

          </nav>

          {/* ── Right cluster ── */}
          <div className="flex items-center gap-2.5 flex-shrink-0">

            {/* Live on Solana pill */}
            <span
              className="hidden lg:inline-flex items-center gap-2"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.60rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "5px 12px",
                borderRadius: "100px",
                border: "1px solid rgba(125,211,252,0.16)",
                background: "rgba(125,211,252,0.04)",
                color: "var(--aqua-bright)",
                flexShrink: 0,
              }}
            >
              <span style={{ position: "relative", display: "flex", width: "7px", height: "7px" }}>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "var(--aqua-bright)",
                    animation: "ping-soft 2.2s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    display: "block",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "var(--aqua-bright)",
                  }}
                />
              </span>
              Solana
            </span>

            {/* Solana Wallet Connect Button */}
            {mounted && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
              }}>
                <WalletMultiButton 
                  style={{ 
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '14px',
                    height: '36px',
                    padding: '0 16px',
                  }} 
                />
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden"
              aria-label="Toggle menu"
              style={{
                padding: "7px",
                borderRadius: "9px",
                border: "1px solid rgba(226,228,245,0.08)",
                background: "transparent",
                color: "var(--ink3)",
                cursor: "pointer",
                marginLeft: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {mobileOpen ? (
                <X style={{ width: "16px", height: "16px" }} />
              ) : (
                <Menu style={{ width: "16px", height: "16px" }} />
              )}
            </button>
          </div>
        </div>

        {/* Bottom gradient rule */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(125,211,252,0.12) 25%, rgba(196,181,253,0.12) 75%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
      </header>

      {/* ── Mobile menu overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{
            top: "72px",
            background: "rgba(5,6,20,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(125,211,252,0.08)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "28px 24px 40px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {/* Section label */}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.58rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ink4)",
                padding: "0 12px",
                marginBottom: "8px",
              }}
            >
              Navigation
            </div>

            {[
              { label: "Home", href: "/" },
              { label: "Launchpad", href: "/launchpad" },
              { label: "Primary Market", href: "/primary" },
              { label: "Issue Bond", href: "/manage/issue" },
              { label: "Portfolio", href: "/dashboard" },
              { label: "Manage", href: "/manage" },
              { label: "About", href: "/about" },
            ].map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.78rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    padding: "13px 16px",
                    borderRadius: "10px",
                    border: isActive
                      ? "1px solid rgba(125,211,252,0.18)"
                      : "1px solid transparent",
                    background: isActive
                      ? "rgba(125,211,252,0.05)"
                      : "transparent",
                    color: isActive ? "var(--aqua-bright)" : "var(--ink3)",
                    display: "block",
                    transition: "all 0.15s ease",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
