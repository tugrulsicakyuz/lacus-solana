"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Droplet, Loader2, ChevronDown } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { CONTRACTS } from "@/config/contracts";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tradeDropdownOpen, setTradeDropdownOpen] = useState(false);
  const [issueDropdownOpen, setIssueDropdownOpen] = useState(false);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.mockUSDC.address,
    abi: CONTRACTS.mockUSDC.abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleFaucet = () => {
    writeContract(
      { address: CONTRACTS.mockUSDC.address, abi: CONTRACTS.mockUSDC.abi, functionName: "faucet" },
      {
        onSuccess: () => toast.loading("Minting test USDC...", { id: "faucet-tx" }),
        onError: (error) => toast.error("Failed: " + error.message),
      }
    );
  };

  useEffect(() => {
    if (isConfirmed) {
      toast.success("10,000 test USDC received", { id: "faucet-tx" });
      refetchBalance();
    }
  }, [isConfirmed, refetchBalance]);

  const formattedBalance = usdcBalance
    ? (() => {
        const n = Number(usdcBalance) / 1e6;
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
        if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
        return n.toFixed(2);
      })()
    : "0.00";

  const isPending = isWritePending || isConfirming;

  // Dropdown items
  const tradeItems = [
    { label: "Secondary Market", href: "/secondary" },
    { label: "Buy Bonds", href: "/primary" },
  ];

  const issueItems = [
    { label: "Issue Bonds", href: "/apply" },
    { label: "Manage", href: "/manage" },
  ];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        background: "#05080f",
        borderBottom: "1px solid rgba(255,255,255,0.06)"
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", height: "60px", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        
        {/* LEFT: Logo + Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{ display: "flex", height: "32px", width: "32px", alignItems: "center", justifyContent: "center", borderRadius: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <img src="/logo.png" alt="Sparrow" style={{ height: "22px", width: "22px", objectFit: "contain" }} />
            </div>
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9" }}>Sparrow</span>
          </Link>
          <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)", color: "#34d399", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 500 }}>
            Testnet
          </div>
        </div>

        {/* CENTER: Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Markets */}
          <Link
            href="/launchpad"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: pathname === "/launchpad" || pathname.startsWith("/launchpad/") ? "#f1f5f9" : "#64748b",
              background: pathname === "/launchpad" || pathname.startsWith("/launchpad/") ? "rgba(255,255,255,0.06)" : "transparent",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "color 0.15s, background 0.15s"
            }}
            onMouseEnter={(e) => { 
              if (!(pathname === "/launchpad" || pathname.startsWith("/launchpad/"))) {
                e.currentTarget.style.color = "#94a3b8";
              }
            }}
            onMouseLeave={(e) => { 
              if (!(pathname === "/launchpad" || pathname.startsWith("/launchpad/"))) {
                e.currentTarget.style.color = "#64748b";
              }
            }}
          >
            Markets
          </Link>

          {/* Trade Dropdown */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setTradeDropdownOpen(true)}
            onMouseLeave={() => setTradeDropdownOpen(false)}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                color: tradeItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/")) ? "#f1f5f9" : "#64748b",
                background: tradeItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/")) ? "rgba(255,255,255,0.06)" : "transparent",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s, background 0.15s"
              }}
              onMouseEnter={(e) => {
                if (!tradeItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))) {
                  e.currentTarget.style.color = "#94a3b8";
                }
              }}
              onMouseLeave={(e) => {
                if (!tradeItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))) {
                  e.currentTarget.style.color = "#64748b";
                }
              }}
            >
              Trade
              <ChevronDown 
                style={{ 
                  width: "12px", 
                  height: "12px", 
                  transform: tradeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s"
                }} 
              />
            </button>
            
            {tradeDropdownOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, paddingTop: "4px", zIndex: 100 }}>
              <div
                style={{
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "6px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  minWidth: "160px",
                  animation: "dropdownFadeIn 0.15s ease-out"
                }}
              >
                {tradeItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "block",
                        padding: "10px 14px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        color: isActive ? "#f1f5f9" : "#94a3b8",
                        background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                        textDecoration: "none",
                        transition: "background 0.15s, color 0.15s"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                          e.currentTarget.style.color = "#f1f5f9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#94a3b8";
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              </div>
            )}
          </div>

          {/* Portfolio */}
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: pathname === "/dashboard" || pathname.startsWith("/dashboard/") ? "#f1f5f9" : "#64748b",
              background: pathname === "/dashboard" || pathname.startsWith("/dashboard/") ? "rgba(255,255,255,0.06)" : "transparent",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "color 0.15s, background 0.15s"
            }}
            onMouseEnter={(e) => { 
              if (!(pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
                e.currentTarget.style.color = "#94a3b8";
              }
            }}
            onMouseLeave={(e) => { 
              if (!(pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
                e.currentTarget.style.color = "#64748b";
              }
            }}
          >
            Portfolio
          </Link>

          {/* Issue Dropdown */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setIssueDropdownOpen(true)}
            onMouseLeave={() => setIssueDropdownOpen(false)}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                color: issueItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/")) ? "#f1f5f9" : "#64748b",
                background: issueItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/")) ? "rgba(255,255,255,0.06)" : "transparent",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s, background 0.15s"
              }}
              onMouseEnter={(e) => {
                if (!issueItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))) {
                  e.currentTarget.style.color = "#94a3b8";
                }
              }}
              onMouseLeave={(e) => {
                if (!issueItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))) {
                  e.currentTarget.style.color = "#64748b";
                }
              }}
            >
              Issue
              <ChevronDown 
                style={{ 
                  width: "12px", 
                  height: "12px", 
                  transform: issueDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s"
                }} 
              />
            </button>
            
            {issueDropdownOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, paddingTop: "4px", zIndex: 100 }}>
              <div
                style={{
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "6px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  minWidth: "160px",
                  animation: "dropdownFadeIn 0.15s ease-out"
                }}
              >
                {issueItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "block",
                        padding: "10px 14px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        color: isActive ? "#f1f5f9" : "#94a3b8",
                        background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                        textDecoration: "none",
                        transition: "background 0.15s, color 0.15s"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                          e.currentTarget.style.color = "#f1f5f9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#94a3b8";
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              </div>
            )}
          </div>

          {/* About - muted style */}
          <Link
            href="/about"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: pathname === "/about" || pathname.startsWith("/about/") ? "#f1f5f9" : "#475569",
              background: pathname === "/about" || pathname.startsWith("/about/") ? "rgba(255,255,255,0.06)" : "transparent",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "color 0.15s, background 0.15s"
            }}
            onMouseEnter={(e) => { 
              if (!(pathname === "/about" || pathname.startsWith("/about/"))) {
                e.currentTarget.style.color = "#64748b";
              }
            }}
            onMouseLeave={(e) => { 
              if (!(pathname === "/about" || pathname.startsWith("/about/"))) {
                e.currentTarget.style.color = "#475569";
              }
            }}
          >
            About
          </Link>
        </nav>

        {/* RIGHT: Wallet Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {mounted && isConnected && (
            <>
              {/* USDC Balance */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "6px 12px" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>USDC</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>${formattedBalance}</span>
              </div>
              
              {/* Faucet */}
              <button
                onClick={handleFaucet}
                disabled={isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "transparent",
                  border: "1px solid rgba(52,211,153,0.2)",
                  color: "#34d399",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: isPending ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.5 : 1,
                  transition: "border-color 0.15s"
                }}
                onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.borderColor = "rgba(52,211,153,0.4)"; }}
                onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.borderColor = "rgba(52,211,153,0.2)"; }}
              >
                {isPending ? <Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" /> : <Droplet style={{ width: "14px", height: "14px" }} />}
                Faucet
              </button>
            </>
          )}
          
          {/* Wallet Connect */}
          {mounted ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <ConnectButton showBalance={false} chainStatus="icon" />
            </div>
          ) : (
            <div style={{ height: "36px", width: "120px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }} className="animate-pulse" />
          )}
          
          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "6px",
              color: "#64748b",
              background: "transparent",
              border: "none",
              cursor: "pointer"
            }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X style={{ width: "20px", height: "20px" }} /> : <Menu style={{ width: "20px", height: "20px" }} />}
          </button>
        </div>
      </div>

      {/* Mobile menu - hidden for now */}
      {mobileOpen && (
        <div style={{ display: "none" }}>
          {/* Mobile menu content remains unchanged but hidden */}
        </div>
      )}

      {/* Dropdown animation keyframes */}
      <style jsx>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
}
