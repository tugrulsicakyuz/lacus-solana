"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Wallet, TrendingUp, CalendarClock, CircleDollarSign, Gift, ExternalLink, Loader2 } from "lucide-react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { BOND_TOKEN_ABI } from "@/config/contracts";
import { retryInsert, retryUpsert } from "@/lib/supabase-retry";

const baseScanUrl = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;

interface BondRow { id: number; issuer_name: string; symbol: string; price_per_token: number; apy: number; maturity_months: number; created_at: string; contract_address?: string; }
interface HoldingRow { id: number; wallet_address: string; bond_symbol: string; balance: number; unclaimed_yield: number; }
interface MergedHolding { id: number; issuer_name: string; symbol: string; balance: number; pricePerToken: number; currentValue: number; unclaimedYield: number; apy: number; maturityDate: string; contract_address?: string; }
interface TransactionRow { id: number; wallet_address: string; transaction_type: string; bond_symbol: string; token_amount: number; usdc_amount: number; created_at: string; }

function fmtCurrency(n: number): string { return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }); }
function truncateAddress(addr: string): string { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function calcMaturityDate(createdAt: string, maturityMonths: number): string {
  if (!createdAt || !maturityMonths) return "—";
  const d = new Date(createdAt);
  d.setMonth(d.getMonth() + maturityMonths);
  const now = new Date();
  const isPast = d < now;
  const formatted = `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
  return isPast ? `${formatted} ✓` : formatted;
}

function txBadgeStyle(type: string): { bg: string; color: string } {
  if (type === "BUY")   return { bg: "rgba(52,211,153,0.1)",  color: "#34d399" };
  if (type === "SELL")  return { bg: "rgba(239,68,68,0.1)", color: "#ef4444" };
  if (type === "CLAIM") return { bg: "rgba(76,125,244,0.1)", color: "#4c7df4" };
  return { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" };
}

function DashboardSkeleton() {
  return (
    <section className="pb-16 pt-16 sm:pt-20" style={{ background: "#05080f" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
          <div>
            <div className="skeleton h-8 w-40 rounded" />
            <div className="skeleton mt-2 h-4 w-56 rounded" />
          </div>
          <div className="skeleton h-8 w-36 rounded-lg" />
        </div>

        {/* Summary cards */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton mt-3 h-7 w-32 rounded" />
            </div>
          ))}
        </div>

        {/* Holdings */}
        <div className="mt-8">
          <div className="skeleton mb-4 h-5 w-28 rounded" />
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="skeleton h-4 w-36 rounded" />
                    <div className="skeleton mt-1.5 h-3 w-20 rounded" />
                  </div>
                  <div className="skeleton h-8 w-24 rounded-lg" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {[1,2,3].map(j => (
                    <div key={j}>
                      <div className="skeleton h-3 w-16 rounded" />
                      <div className="skeleton mt-1 h-4 w-20 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div className="mt-8">
          <div className="skeleton mb-4 h-5 w-40 rounded" />
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div className="flex items-center gap-3">
                  <div className="skeleton h-6 w-14 rounded-md" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
                <div className="skeleton h-3 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [holdings, setHoldings] = useState<MergedHolding[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [claimingBond, setClaimingBond] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 10;

  const { data: claimHash, writeContract: writeClaim, isPending: isClaiming, reset: resetClaim } = useWriteContract();
  const { isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

  useEffect(() => { setMounted(true); }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    const walletLower = address.toLowerCase();
    const [holdingsRes, bondsRes, transactionsRes] = await Promise.all([
      supabase.from("user_holdings").select("*").ilike("wallet_address", walletLower),
      supabase.from("bonds").select("*"),
      supabase.from("transactions").select("*").ilike("wallet_address", walletLower).order("created_at", { ascending: false }),
    ]);
    if (holdingsRes.error) console.error("Holdings fetch error:", holdingsRes.error);
    if (bondsRes.error) console.error("Bonds fetch error:", bondsRes.error);
    if (transactionsRes.error) console.error("Transactions fetch error:", transactionsRes.error);
    if (holdingsRes.error || bondsRes.error) {
      setFetchError("Failed to load portfolio. Please try again.");
      setLoading(false);
      return;
    }
    setFetchError(null);
    const rawHoldings = (holdingsRes.data ?? []) as HoldingRow[];
    const rawBonds = (bondsRes.data ?? []) as BondRow[];
    const bondMap = new Map<string, BondRow>();
    rawBonds.forEach((b) => bondMap.set(b.symbol, b));
    const merged: MergedHolding[] = rawHoldings.map((h) => {
      const bond = bondMap.get(h.bond_symbol);
      const price = bond?.price_per_token ?? 0;
      return { id: h.id, issuer_name: bond?.issuer_name ?? h.bond_symbol, symbol: h.bond_symbol, balance: h.balance, pricePerToken: price, currentValue: h.balance * price, unclaimedYield: h.unclaimed_yield, apy: bond?.apy ?? 0, maturityDate: calcMaturityDate(bond?.created_at ?? "", bond?.maturity_months ?? 0), contract_address: bond?.contract_address };
    });
    setHoldings(merged);
    setTransactions((transactionsRes.data ?? []) as TransactionRow[]);
    setLoading(false);
  }, [address]);

  useEffect(() => {
    if (!address) { setHoldings([]); setTransactions([]); return; }
    setTxPage(1); fetchPortfolio();
  }, [address, fetchPortfolio]);

  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalYieldEarned = holdings.reduce((sum, h) => sum + h.unclaimedYield, 0);
  const paginatedTransactions = transactions.slice(0, txPage * TX_PER_PAGE);
  const hasMoreTx = transactions.length > txPage * TX_PER_PAGE;
  const averageAPY = totalPortfolioValue > 0 ? holdings.reduce((sum, h) => sum + (h.apy * h.currentValue), 0) / totalPortfolioValue : 0;
  const hasUnclaimedYield = Array.isArray(holdings) && holdings.some((h) => h.unclaimedYield > 0);
  const hasBonds = Array.isArray(holdings) && holdings.length > 0;
  const nextPaymentValue = hasUnclaimedYield ? "Available Now" : hasBonds ? "Awaiting Maturity" : "—";
  const nextPaymentColor = hasUnclaimedYield ? "#34d399" : hasBonds ? "#4c7df4" : "#4f5f7a";

  const handleClaimYield = async (symbol: string) => {
    if (!address) { toast.error("Please connect your wallet first"); return; }
    const holding = holdings.find(h => h.symbol === symbol);
    if (!holding || !holding.contract_address) { toast.error("Bond contract address not found"); return; }
    if (holding.unclaimedYield <= 0) { toast.info("No yield available to claim"); return; }
    setClaimingBond(symbol);
    try {
      toast.loading("Claiming yield from blockchain...", { id: "claim-yield" });
      writeClaim(
        { address: holding.contract_address as `0x${string}`, abi: BOND_TOKEN_ABI, functionName: "claimYield" },
        { onError: (error) => { console.error("Claim error:", error); toast.error("Yield claim failed: " + error.message, { id: "claim-yield" }); setClaimingBond(null); } }
      );
    } catch (error) { toast.error(`Yield claim error: ${error instanceof Error ? error.message : "Unknown error"}`, { id: "claim-yield" }); setClaimingBond(null); }
  };

  useEffect(() => {
    const syncClaimToSupabase = async () => {
      if (!isClaimConfirmed || !claimingBond || !address) return;
      try {
        const walletLower = address.toLowerCase();
        toast.loading("Updating database...", { id: "claim-yield" });
        const { data: holding, error: fetchError } = await supabase.from("user_holdings").select("*").eq("wallet_address", walletLower).eq("bond_symbol", claimingBond).maybeSingle();
        if (fetchError) throw fetchError;
        const claimedAmount = holding?.unclaimed_yield || 0;
        const holdingsResult = await retryUpsert("user_holdings", { wallet_address: walletLower, bond_symbol: claimingBond, balance: holding?.balance ?? 0, unclaimed_yield: 0 }, 3, "wallet_address,bond_symbol");
        if (!holdingsResult.success) throw new Error("Holdings update failed after 3 retries: " + holdingsResult.error);
        const txResult = await retryInsert("transactions", { wallet_address: walletLower, transaction_type: "CLAIM", bond_symbol: claimingBond, token_amount: 0, usdc_amount: claimedAmount });
        if (!txResult.success) throw new Error("Transaction record failed after 3 retries: " + txResult.error);
        toast.success(<span>🎉 Yield claimed! <a href={baseScanUrl(claimHash!)} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 hover:text-blue-300">View on BaseScan →</a></span>, { id: "claim-yield" });
        await fetchPortfolio();
      } catch (error) { console.error("Supabase sync error:", error); toast.error("Database update failed", { id: "claim-yield" }); }
      finally { setClaimingBond(null); resetClaim(); }
    };
    syncClaimToSupabase();
  }, [isClaimConfirmed, claimingBond, address, claimHash, resetClaim]);

  if (!mounted) {
    return <DashboardSkeleton />;
  }

  if (!isConnected) {
    return (
      <section className="pt-16 sm:pt-20" style={{ background: "#05080f" }}>
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(76,125,244,0.08)" }}>
            <Wallet className="h-8 w-8" style={{ color: "#4c7df4" }} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "#e8ecf4" }}>Connect Your Wallet</h2>
          <p className="mt-3 max-w-md text-base" style={{ color: "#8896b3" }}>Connect your wallet to view your portfolio, track your bonds, and claim your yields.</p>
          <div className="mt-8"><ConnectButton /></div>
        </div>
      </section>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (fetchError) {
    return (
      <section className="pb-4 pt-16 sm:pt-20" style={{ background: "#05080f" }}>
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <p className="text-sm mb-4" style={{ color: "#f87171" }}>{fetchError}</p>
          <button
            onClick={() => { setFetchError(null); setLoading(true); fetchPortfolio(); }}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "rgba(76,125,244,0.12)", color: "#8eb4fb", border: "1px solid rgba(76,125,244,0.2)" }}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Page Layout */}
      <section style={{ background: "#05080f", minHeight: "100vh", paddingTop: "48px", paddingBottom: "48px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
            <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#f1f5f9" }}>My Portfolio</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "8px 14px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
              <span style={{ fontSize: "13px", color: "#64748b" }}>{address ? truncateAddress(address) : ""}</span>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "48px" }}>
            {[
              { label: "TOTAL PORTFOLIO VALUE", value: fmtCurrency(totalPortfolioValue), color: "#f1f5f9" },
              { label: "AVERAGE APY", value: totalPortfolioValue > 0 ? `${averageAPY.toFixed(2)}%` : "—", color: "#34d399" },
              { label: "NEXT PAYMENT", value: nextPaymentValue, color: hasUnclaimedYield ? "#4c7df4" : hasBonds ? "#64748b" : "#64748b", fontSize: hasUnclaimedYield ? "36px" : hasBonds ? "24px" : "36px" },
            ].map((card) => (
              <div key={card.label} style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "28px 24px" }}>
                <p style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.1em", marginBottom: "12px" }}>{card.label}</p>
                <p style={{ fontSize: card.fontSize || "36px", fontWeight: 700, color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* My Bonds */}
          <div style={{ marginBottom: "48px" }}>
            <h2 style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.1em", marginBottom: "16px" }}>MY BONDS</h2>
            
            {holdings.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 20px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px" }}>
                <CircleDollarSign style={{ width: "48px", height: "48px", color: "#4c7df4", marginBottom: "16px" }} />
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", marginBottom: "8px" }}>No bonds in your portfolio yet</h3>
                <p style={{ fontSize: "14px", color: "#64748b", textAlign: "center", maxWidth: "400px" }}>Start building your portfolio by purchasing bonds and earn yield.</p>
              </div>
            ) : (
              <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["ASSET", "BALANCE", "CURRENT VALUE", "APY", "MATURES", "UNCLAIMED YIELD", "ACTION"].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.08em", textAlign: "left", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => {
                      const hasYield = h.unclaimedYield > 0;
                      return (
                        <tr key={h.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#1a2744", color: "#4c7df4", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {h.symbol.slice(0, 3).toUpperCase()}
                              </div>
                              <span style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>{h.issuer_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#94a3b8" }}>{h.balance}</td>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#94a3b8" }}>{fmtCurrency(h.currentValue)}</td>
                          <td style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "#34d399" }}>{h.apy.toFixed(2)}%</td>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#94a3b8" }}>{h.maturityDate}</td>
                          <td style={{ padding: "16px", fontSize: "14px", color: hasYield ? "#f1f5f9" : "#475569" }}>
                            {hasYield ? fmtCurrency(h.unclaimedYield) : "—"}
                          </td>
                          <td style={{ padding: "16px" }}>
                            {hasYield ? (
                              <button
                                onClick={() => handleClaimYield(h.symbol)}
                                disabled={claimingBond === h.symbol}
                                style={{
                                  border: "1px solid #4c7df4",
                                  color: "#4c7df4",
                                  background: "transparent",
                                  borderRadius: "8px",
                                  padding: "6px 16px",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  cursor: claimingBond === h.symbol ? "not-allowed" : "pointer",
                                  opacity: claimingBond === h.symbol ? 0.5 : 1,
                                  transition: "background 0.15s",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                                onMouseEnter={(e) => { if (claimingBond !== h.symbol) e.currentTarget.style.background = "rgba(76,125,244,0.1)"; }}
                                onMouseLeave={(e) => { if (claimingBond !== h.symbol) e.currentTarget.style.background = "transparent"; }}
                              >
                                {claimingBond === h.symbol ? <><Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" />Claiming</> : "Claim"}
                              </button>
                            ) : (
                              <span style={{ fontSize: "13px", color: "#475569" }}>No yield</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transaction History */}
          {transactions.length > 0 && (
            <div>
              <h2 style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.1em", marginBottom: "16px" }}>TRANSACTION HISTORY</h2>
              
              <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["TYPE", "BOND", "AMOUNT", "USDC", "DATE"].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.08em", textAlign: "left", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((tx) => {
                      const bs = txBadgeStyle(tx.transaction_type);
                      return (
                        <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "16px" }}>
                            <span style={{ background: bs.bg, color: bs.color, borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 500 }}>
                              {tx.transaction_type === "BUY" ? "BUY" : tx.transaction_type === "SELL" ? "SELL" : "CLAIM"}
                            </span>
                          </td>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#94a3b8" }}>{tx.bond_symbol}</td>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#94a3b8" }}>
                            {tx.transaction_type === "CLAIM" ? "—" : tx.token_amount}
                          </td>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#94a3b8" }}>{fmtCurrency(tx.usdc_amount)}</td>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#94a3b8" }}>{fmtDate(tx.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {hasMoreTx && (
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setTxPage((p) => p + 1)}
                    style={{
                      background: "#0d1117",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "#94a3b8",
                      borderRadius: "8px",
                      padding: "8px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#0d1117"}
                  >
                    Load More ({transactions.length - txPage * TX_PER_PAGE} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
