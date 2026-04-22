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
  if (type === "BUY")   return { bg: "rgba(94,234,212,0.10)",  color: "var(--aqua-bright)" };
  if (type === "SELL")  return { bg: "rgba(253,164,175,0.10)", color: "var(--coral)" };
  if (type === "CLAIM") return { bg: "rgba(196,181,253,0.10)", color: "var(--lilac)" };
  return { bg: "rgba(124,125,153,0.10)", color: "var(--ink3)" };
}

function DashboardSkeleton() {
  return (
    <section className="pb-16 pt-16 sm:pt-20">
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
            <div key={i} className="card-luminous rounded-xl p-5">
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
              <div key={i} className="card-luminous rounded-xl p-5">
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
          <div className="card-luminous rounded-xl overflow-hidden">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-[var(--rule)] last:border-b-0">
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
        toast.success(<span>🎉 Yield claimed! <a href={baseScanUrl(claimHash!)} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 hover:text-blue-300">View transaction details →</a></span>, { id: "claim-yield" });
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
      <section className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center text-center px-4">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--lilac)]/10">
            <Wallet className="h-8 w-8 text-[var(--lilac)]" />
          </div>
          <h2 className="font-display text-[var(--ink)] text-2xl mb-3">Connect Your Wallet</h2>
          <p className="text-[var(--ink3)] text-base max-w-md mb-8">Connect your wallet to view your portfolio, track your bonds, and claim your yields.</p>
          <ConnectButton />
        </div>
      </section>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (fetchError) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center text-center px-4 gap-4">
          <p className="text-sm text-[var(--coral)]">{fetchError}</p>
          <button
            onClick={() => { setFetchError(null); setLoading(true); fetchPortfolio(); }}
            className="btn-ghost px-5 py-2.5 text-sm"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="min-h-screen pb-20">
        <div className="max-w-[1100px] mx-auto px-6">

          {/* Page Header */}
          <div className="pt-16 pb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="eyebrow eyebrow-rule mb-5 reveal" style={{ color: "var(--lilac)" }}>
                Investor View
              </div>
              <h1
                className="font-display text-[var(--ink)] leading-[0.97] tracking-tight reveal reveal-d1"
                style={{ fontSize: "clamp(2.2rem, 3.5vw, 3.8rem)" }}
              >
                My Portfolio
                <br />
                <span className="italic grad-ink-interactive cursor-pointer">at a glance.</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 card-luminous rounded-full px-4 py-2.5 reveal reveal-d1 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--aqua-bright)" }} />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.72rem",
                  letterSpacing: "0.06em",
                  color: "var(--ink3)",
                }}
              >
                {address ? truncateAddress(address) : ""}
              </span>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[
              { label: "TOTAL PORTFOLIO VALUE", value: fmtCurrency(totalPortfolioValue), color: "text-[var(--ink)]" },
              { label: "AVERAGE APY", value: totalPortfolioValue > 0 ? `${averageAPY.toFixed(2)}%` : "—", color: "text-[var(--aqua-bright)]" },
              { label: "NEXT PAYMENT", value: nextPaymentValue, color: hasUnclaimedYield ? "text-[var(--lilac)]" : "text-[var(--ink3)]", fontSize: hasUnclaimedYield ? "text-[2.25rem]" : hasBonds ? "text-[1.5rem]" : "text-[2.25rem]" },
            ].map((card) => (
              <div key={card.label} className="card-luminous rounded-2xl px-6 py-7">
                <p className="eyebrow-dim mb-3">{card.label}</p>
                <p className={`${card.fontSize || 'text-[2.25rem]'} font-semibold font-mono leading-none ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* My Bonds */}
          <div className="mb-12 reveal">
            <h2 className="eyebrow mb-4">MY BONDS</h2>
            
            {holdings.length === 0 ? (
              <div className="card-luminous rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center">
                <CircleDollarSign className="w-12 h-12 text-[var(--lilac)] mb-4 opacity-50" />
                <h3 className="text-base font-medium text-[var(--ink)] mb-2">No bonds in your portfolio yet</h3>
                <p className="text-sm text-[var(--ink3)] max-w-[400px]">Start building your portfolio by purchasing bonds and earn yield.</p>
              </div>
            ) : (
              <div className="card-luminous rounded-2xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--rule)]">
                      {["ASSET", "BALANCE", "CURRENT VALUE", "APY", "MATURES", "UNCLAIMED YIELD", "ACTION"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left eyebrow-dim">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => {
                      const hasYield = h.unclaimedYield > 0;
                      return (
                        <tr key={h.id} className="border-b border-[var(--rule-soft)] hover:bg-[var(--surface)] transition-colors last:border-b-0">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[var(--lilac)]/10 text-[var(--lilac)] text-[10px] font-bold font-mono flex items-center justify-center">
                                {h.symbol.slice(0, 3).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-[var(--ink)]">{h.issuer_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-[var(--ink2)] font-mono">{h.balance}</td>
                          <td className="px-5 py-4 text-sm text-[var(--ink2)] font-mono">{fmtCurrency(h.currentValue)}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-[var(--aqua-bright)] font-mono">{h.apy.toFixed(2)}%</td>
                          <td className="px-5 py-4 text-sm text-[var(--ink2)] font-mono">{h.maturityDate}</td>
                          <td className={`px-5 py-4 text-sm font-mono ${hasYield ? 'text-[var(--ink)]' : 'text-[var(--ink4)]'}`}>
                            {hasYield ? fmtCurrency(h.unclaimedYield) : "—"}
                          </td>
                          <td className="px-5 py-4">
                            {hasYield ? (
                              <button
                                onClick={() => handleClaimYield(h.symbol)}
                                disabled={claimingBond === h.symbol}
                                className="btn-primary px-4 py-1.5 text-[13px] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {claimingBond === h.symbol ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Claiming</> : "Claim"}
                              </button>
                            ) : (
                              <span className="text-[13px] text-[var(--ink4)]">No yield</span>
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
            <div className="reveal">
              <h2 className="eyebrow mb-4">TRANSACTION HISTORY</h2>
              <div className="card-luminous rounded-2xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--rule)]">
                      {["TYPE", "BOND", "AMOUNT", "USDC", "DATE"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left eyebrow-dim">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((t, i) => {
                      const bs = txBadgeStyle(t.transaction_type);
                      return (
                        <tr key={i} className="border-b border-[var(--rule-soft)] hover:bg-[var(--surface)] transition-colors last:border-b-0">
                          <td className="px-5 py-4">
                            <span className="rounded-full px-3 py-1 text-[12px] font-medium font-mono" style={{ background: bs.bg, color: bs.color }}>
                              {t.transaction_type}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-[var(--ink2)] font-mono">{t.bond_symbol}</td>
                          <td className="px-5 py-4 text-sm text-[var(--ink2)] font-mono">{t.token_amount}</td>
                          <td className="px-5 py-4 text-sm text-[var(--ink2)] font-mono">{fmtCurrency(t.usdc_amount)}</td>
                          <td className="px-5 py-4 text-sm text-[var(--ink2)] font-mono">{fmtDate(t.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {hasMoreTx && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => setTxPage((p) => p + 1)}
                    className="btn-ghost px-6 py-2.5 text-sm"
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
