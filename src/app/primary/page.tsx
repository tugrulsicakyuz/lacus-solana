"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ChevronDown, TrendingUp, Info, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CONTRACTS } from "@/config/contracts";
import { retryInsert, retryUpsert } from "@/lib/supabase-retry";

const baseScanUrl = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;

type ExchangeFlowState = 'idle' | 'approving' | 'approved' | 'buying' | 'done';

interface Bond {
  id: number; issuer_name: string; symbol: string; apy: number;
  maturity_months: number; total_issue_size: number; price_per_token: number;
  filled_percentage: number; contract_address?: string;
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function PrimaryPageContent() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const processingLockRef = useRef(false);
  const pendingBuyRef = useRef<{ bondAddress: string; bondAmountWei: bigint; totalCostWei: bigint } | null>(null);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [marketData, setMarketData] = useState({ volume24h: 0, totalLiquidity: 0 });
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [bondBalance, setBondBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [payAmount, setPayAmount] = useState("");
  const [computedReceive, setComputedReceive] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [exchangeFlow, setExchangeFlow] = useState<ExchangeFlowState>('idle');

  const publicClient = usePublicClient();
  const { data: approvalHash, writeContract: writeApproval, isPending: isApproving } = useWriteContract();
  const { data: buyHash, writeContract: writeBuy, isPending: isBuying, reset: resetBuy } = useWriteContract();
  const { isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: approvalHash });
  const { isSuccess: isBuyConfirmed } = useWaitForTransactionReceipt({ hash: buyHash });

  const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
    address: CONTRACTS.mockUSDC.address, abi: CONTRACTS.mockUSDC.abi, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.mockUSDC.address, abi: CONTRACTS.mockUSDC.abi, functionName: "allowance",
    args: address ? [address, CONTRACTS.bondExchange.address] : undefined, query: { enabled: !!address },
  });

  useEffect(() => {
    if (usdcBalanceRaw) setUsdcBalance(parseFloat(formatUnits(usdcBalanceRaw as bigint, 6)).toFixed(2));
  }, [usdcBalanceRaw]);

  const fetchBonds = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("bonds").select("*").order("id", { ascending: true });
    if (error) {
      console.error("Failed to fetch bonds:", error);
      setFetchError("Failed to load bonds. Please try again.");
      setLoading(false);
      return;
    }
    setFetchError(null);
    const fetched = data as Bond[];
    setBonds(fetched);
    const bondParam = searchParams.get("bond");
    if (bondParam) {
      const match = fetched.find((b) => b.symbol === bondParam);
      if (match) setSelectedBond(match); else if (fetched.length > 0) setSelectedBond(fetched[0]);
    } else if (fetched.length > 0) setSelectedBond(fetched[0]);
    setLoading(false);
  }, [searchParams]);

  useEffect(() => { fetchBonds(); }, [fetchBonds]);

  useEffect(() => { setPayAmount(""); setComputedReceive(""); }, [selectedBond]);

  useEffect(() => {
    async function fetchBondBalance() {
      if (!selectedBond || !selectedBond.symbol || !address) { setBondBalance(0); return; }
      const { data, error } = await supabase.from("user_holdings").select("balance")
        .eq("wallet_address", address.toLowerCase()).eq("bond_symbol", selectedBond.symbol).maybeSingle();
      if (error || !data) setBondBalance(0); else setBondBalance(data.balance || 0);
    }
    fetchBondBalance();
  }, [address, selectedBond]);

  useEffect(() => {
    if (!selectedBond) return;
    async function fetchMarketData() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: txs } = await supabase.from("transactions").select("usdc_amount")
        .eq("bond_symbol", selectedBond!.symbol).gte("created_at", since);
      const volume = (txs ?? []).reduce((sum, t) => sum + (t.usdc_amount || 0), 0);
      const { data: holdings } = await supabase.from("user_holdings").select("balance").eq("bond_symbol", selectedBond!.symbol);
      const totalTokens = (holdings ?? []).reduce((sum, h) => sum + (h.balance || 0), 0);
      setMarketData({ volume24h: volume, totalLiquidity: totalTokens * (selectedBond!.price_per_token || 0) });
    }
    fetchMarketData();
  }, [selectedBond]);

  const price = selectedBond?.price_per_token ?? 0;
  const symbol = selectedBond?.symbol ?? "—";

  const marketStats = [
    { label: "Price", value: selectedBond ? fmtCurrency(price) : "—", isYield: false },
    { label: "24h Volume", value: marketData.volume24h > 0 ? fmtCurrency(marketData.volume24h) : "—", isYield: false },
    { label: "Liquidity", value: marketData.totalLiquidity > 0 ? fmtCurrency(marketData.totalLiquidity) : "—", isYield: false },
    { label: "APY", value: selectedBond ? `${selectedBond.apy}%` : "—", isYield: true },
  ];


  const calculateNeededUSDC = (): bigint => {
    if (!selectedBond || !payAmount || payAmount === "0") return BigInt(0);
    const n = parseFloat(payAmount);
    if (isNaN(n) || n <= 0) return BigInt(0);
    return parseUnits(n.toFixed(6), 6);
  };

  const handleApprove = async () => {
    if (processingLockRef.current || exchangeFlow !== 'idle') return;
    if (!selectedBond || !address) return;
    const payAmountNum = parseFloat(payAmount);
    const usdcBalanceNum = parseFloat(usdcBalance);
    if (!payAmount || isNaN(payAmountNum) || payAmountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (payAmountNum > usdcBalanceNum) {
      toast.error(`Insufficient USDC balance. You have ${usdcBalanceNum.toFixed(2)} USDC but need ${payAmountNum.toFixed(2)} USDC.`);
      return;
    }
    if (!selectedBond?.contract_address) {
      toast.error("This bond does not have a deployed contract yet.");
      return;
    }
    processingLockRef.current = true;
    setExchangeFlow('approving'); setIsProcessing(true);
    const totalUsdcNeeded = calculateNeededUSDC();
    const price = selectedBond.price_per_token;
    const bondAmountWei = parseUnits((parseFloat(payAmount) / price).toFixed(18), 18);
    const totalCostWei = calculateNeededUSDC();
    pendingBuyRef.current = {
      bondAddress: selectedBond.contract_address as string,
      bondAmountWei,
      totalCostWei,
    };
    writeApproval(
      { address: CONTRACTS.mockUSDC.address, abi: CONTRACTS.mockUSDC.abi, functionName: "approve", args: [CONTRACTS.bondExchange.address, totalUsdcNeeded] },
      { onError: (error) => { toast.error("Approval failed: " + error.message); setIsProcessing(false); processingLockRef.current = false; setExchangeFlow('idle'); } }
    );
  };

  const handleBuy = async () => {
    if (!selectedBond || !address || !selectedBond.contract_address) return;
    if (processingLockRef.current) return;
    processingLockRef.current = true;
    setExchangeFlow('buying');
    if (!publicClient) { toast.error("Wallet not connected"); processingLockRef.current = false; setExchangeFlow('idle'); return; }
    setIsProcessing(true);
    const bondAmountWei = parseUnits(computedReceive || "0", 18);
    try {
      await publicClient.simulateContract({ address: CONTRACTS.bondExchange.address, abi: CONTRACTS.bondExchange.abi, functionName: "buyFromExchange", args: [selectedBond.contract_address as `0x${string}`, bondAmountWei], account: address });
      writeBuy(
        { address: CONTRACTS.bondExchange.address, abi: CONTRACTS.bondExchange.abi, functionName: "buyFromExchange", args: [selectedBond.contract_address as `0x${string}`, bondAmountWei] },
        { onError: (error) => { toast.error("Buy order failed: " + error.message); setIsProcessing(false); processingLockRef.current = false; setExchangeFlow('idle'); } }
      );
    } catch (error: any) {
      toast.error("Simulation failed: " + (error?.shortMessage || error?.message || "Unknown simulation error"));
      setIsProcessing(false); processingLockRef.current = false; setExchangeFlow('idle');
    }
  };

  useEffect(() => {
    if (!isApprovalConfirmed || !pendingBuyRef.current || !address || !publicClient) return;
    const { bondAddress, bondAmountWei, totalCostWei } = pendingBuyRef.current;
    (async () => {
      let attempts = 0;
      while (attempts < 20) {
        const allowance = await publicClient.readContract({ address: CONTRACTS.mockUSDC.address, abi: CONTRACTS.mockUSDC.abi, functionName: "allowance", args: [address as `0x${string}`, CONTRACTS.bondExchange.address] }) as bigint;
        if (allowance >= totalCostWei) break;
        await new Promise(resolve => setTimeout(resolve, 500)); attempts++;
      }
      if (attempts >= 20) {
        toast.error("Approval not detected after 10 seconds. Please try again.");
        setIsProcessing(false); processingLockRef.current = false; setExchangeFlow('idle');
        return;
      }
      toast.success("✅ USDC approved! Initiating purchase..."); refetchAllowance();
      publicClient.simulateContract({ address: CONTRACTS.bondExchange.address, abi: CONTRACTS.bondExchange.abi, functionName: "buyFromExchange", args: [bondAddress as `0x${string}`, bondAmountWei], account: address })
        .then(() => { writeBuy({ address: CONTRACTS.bondExchange.address, abi: CONTRACTS.bondExchange.abi, functionName: "buyFromExchange", args: [bondAddress as `0x${string}`, bondAmountWei] }, { onError: (error) => { toast.error("Buy error: " + error.message); setIsProcessing(false); processingLockRef.current = false; setExchangeFlow('idle'); } }); })
        .catch((error: any) => { toast.error("Simulation error: " + (error.shortMessage || error.message)); setIsProcessing(false); processingLockRef.current = false; setExchangeFlow('idle'); });
    })();
  }, [isApprovalConfirmed]);

  useEffect(() => {
    const syncToSupabase = async () => {
      if (!isBuyConfirmed || !selectedBond || !address) return;
      try {
        const walletAddress = address.toLowerCase();
        const bondSymbol = selectedBond.symbol;
        const tokenAmount = pendingBuyRef.current
          ? parseFloat(formatUnits(pendingBuyRef.current.bondAmountWei, 18))
          : parseFloat(computedReceive || "0");
        const usdcAmount = pendingBuyRef.current
          ? parseFloat(formatUnits(pendingBuyRef.current.totalCostWei, 6))
          : parseFloat(payAmount);
        toast.loading("Updating database...", { id: "swap-tx" });
        const txResult = await retryInsert("transactions", { wallet_address: walletAddress, transaction_type: "BUY", bond_symbol: bondSymbol, token_amount: tokenAmount, usdc_amount: usdcAmount });
        if (!txResult.success) throw new Error("Transaction record failed after 3 retries: " + txResult.error);
        const { data: existingHolding, error: fetchError } = await supabase.from("user_holdings").select("*").eq("wallet_address", walletAddress).eq("bond_symbol", bondSymbol).maybeSingle();
        if (fetchError) throw fetchError;
        const newBalance = existingHolding ? existingHolding.balance + tokenAmount : tokenAmount;
        const holdingsResult = await retryUpsert("user_holdings", { wallet_address: walletAddress, bond_symbol: bondSymbol, balance: newBalance, unclaimed_yield: existingHolding?.unclaimed_yield ?? 0 }, 3, "wallet_address,bond_symbol");
        if (!holdingsResult.success) throw new Error("Holdings update failed after 3 retries: " + holdingsResult.error);
        const { data: allHoldings } = await supabase.from("user_holdings").select("balance").eq("bond_symbol", bondSymbol);
        const totalSold = (allHoldings ?? []).reduce((sum: number, h: { balance: number }) => sum + h.balance, 0);
        const newFilledPct = Math.min(Math.round((totalSold / (selectedBond.total_issue_size / selectedBond.price_per_token)) * 100), 100);
        await supabase.from("bonds").update({ filled_percentage: newFilledPct }).eq("symbol", bondSymbol);
        toast.success(<span>🎉 Swap complete! <a href={baseScanUrl(buyHash!)} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 hover:text-blue-300">View transaction details →</a></span>, { id: "swap-tx" });
        refetchUsdcBalance(); refetchAllowance(); setPayAmount(""); setComputedReceive("");
      } catch (error) { console.error("Supabase sync error:", error); toast.error("Database update failed", { id: "swap-tx" }); }
      finally { setIsProcessing(false); resetBuy(); processingLockRef.current = false; setExchangeFlow('idle'); pendingBuyRef.current = null; }
    };
    syncToSupabase();
  }, [isBuyConfirmed, selectedBond, address, payAmount, computedReceive, buyHash, resetBuy, refetchUsdcBalance, refetchAllowance]);

  if (loading) {
    return (
      <section className="pb-4 pt-16 sm:pt-20" style={{ background: "#05080f" }}>
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#4c7df4" }} />
          <p className="mt-3 text-sm" style={{ color: "#4f5f7a" }}>Loading exchange data…</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="overflow-hidden pb-6 pt-16 sm:pt-20" style={{ background: "#05080f" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "#e8ecf4" }}>Primary Market</h1>
          <p className="mt-1 text-sm" style={{ color: "#8896b3" }}>Purchase tokenized bonds directly from issuers.</p>
        </div>
      </section>

      {/* Main layout */}
      <section className="py-8 sm:py-12" style={{ background: "#05080f" }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:px-8">

          {/* Left column */}
          <div className="w-full lg:w-[55%] space-y-4">
            {fetchError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <p className="text-sm mb-3" style={{ color: "#f87171" }}>{fetchError}</p>
                <button
                  onClick={() => fetchBonds()}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "rgba(76,125,244,0.12)", color: "#8eb4fb", border: "1px solid rgba(76,125,244,0.2)" }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
            {/* Bond selector */}
            <div className="relative">
              <button
                onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8ecf4" }}
              >
                {selectedBond ? `${selectedBond.issuer_name} (${selectedBond.symbol}) / USDC` : "Select a bond"}
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${pairDropdownOpen ? "rotate-180" : ""}`} style={{ color: "#8896b3" }} />
              </button>
              {pairDropdownOpen && (
                <div className="absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-xl shadow-2xl" style={{ background: "#0c1018", border: "1px solid rgba(255,255,255,0.10)" }}>
                  {bonds.map((bond) => (
                    <button
                      key={bond.id}
                      onClick={() => { setSelectedBond(bond); setPairDropdownOpen(false); }}
                      className="w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors"
                      style={bond.id === selectedBond?.id ? { background: "rgba(76,125,244,0.10)", color: "#8eb4fb" } : { color: "#c8d4e8" }}
                      onMouseEnter={(e) => { if (bond.id !== selectedBond?.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { if (bond.id !== selectedBond?.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span className="font-medium">{bond.symbol}</span>
                      <span style={{ color: "#8896b3" }}> — {bond.issuer_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bond info card */}
            {selectedBond && (
              <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold" style={{ color: "#e8ecf4" }}>{selectedBond.issuer_name}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {marketStats.map((stat) => (
                    <div key={stat.label} className="rounded-lg px-3 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: "#4f5f7a" }}>{stat.label}</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: stat.isYield ? "#34d399" : "#e8ecf4" }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px]" style={{ color: "#4f5f7a" }}>Fill Rate</span>
                    <span className="text-[11px] font-semibold" style={{ color: "#8896b3" }}>{selectedBond.filled_percentage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(selectedBond.filled_percentage, 100)}%`, background: "#4c7df4" }} />
                  </div>
                </div>
              </div>
            )}

            {!selectedBond && (
              <div className="flex flex-col items-center justify-center rounded-xl p-10 text-center" style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.10)" }}>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(76,125,244,0.08)" }}>
                  <TrendingUp className="h-6 w-6" style={{ color: "#4c7df4" }} />
                </div>
                <p className="text-sm font-medium" style={{ color: "#8896b3" }}>Select a bond to view details</p>
                <p className="mt-1 text-xs" style={{ color: "#4f5f7a" }}>Choose from the dropdown above to see price, APY, and market data.</p>
              </div>
            )}
              </>
            )}
          </div>

          {/* Right column: Swap */}
          <div className="w-full lg:w-[45%]">
            <div className="rounded-xl p-6" style={{ background: "#0c1018", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="mb-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-sm font-semibold" style={{ color: "#e8ecf4" }}>Buy Bonds</span>
              </div>

              {/* You Pay */}
              <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider" style={{ color: "#4f5f7a" }}>
                  <span>You Pay</span>
                  <span>Balance: {usdcBalance} USDC</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number" min="0" placeholder="0.00" value={payAmount}
                    onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => {
                      setPayAmount(e.target.value);
                      const num = parseFloat(e.target.value);
                      if (!isNaN(num) && num > 0 && price > 0) setComputedReceive((num / price).toFixed(4));
                      else setComputedReceive("");
                    }}
                    className="w-full min-w-0 bg-transparent text-2xl font-semibold outline-none placeholder:text-[#2a3545] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    style={{ color: "#e8ecf4" }}
                  />
                  <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: "#c8d4e8", border: "1px solid rgba(255,255,255,0.12)" }}>USDC</span>
                </div>
              </div>

              {/* You Receive */}
              <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider" style={{ color: "#4f5f7a" }}>
                  <span>You Receive (Est.)</span>
                  <span>Balance: {bondBalance} {symbol}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input type="text" readOnly placeholder="0.0000" value={computedReceive}
                    className="w-full min-w-0 bg-transparent text-2xl font-semibold outline-none cursor-default"
                    style={{ color: "#4f5f7a" }} />
                  <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: "#c8d4e8", border: "1px solid rgba(255,255,255,0.12)" }}>{symbol}</span>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 space-y-2 rounded-lg px-4 py-3 text-xs" style={{ background: "rgba(255,255,255,0.03)" }}>
                {[
                  { label: "Unit Price", value: selectedBond ? `${fmtCurrency(selectedBond.price_per_token)} / ${symbol}` : "—" },
                  { label: "Total Cost", value: payAmount && parseFloat(payAmount) > 0 ? fmtCurrency(parseFloat(payAmount)) : "—" },
                  { label: "Network", value: "Solana Devnet", green: true },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-1" style={{ color: "#4f5f7a" }}>
                      <Info className="h-3 w-3" />{row.label}
                    </span>
                    <span className="font-medium" style={{ color: (row as any).green ? "#34d399" : "#8896b3" }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedBond && !selectedBond.contract_address && (
                <div className="mt-4 rounded-lg px-4 py-2.5 text-xs" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                  <Info className="inline h-3.5 w-3.5 mr-1.5" />
                  Contract address missing. This bond has not been deployed yet.
                </div>
              )}

              <button
                onClick={() => {
                  const needed = calculateNeededUSDC();
                  const current = (allowanceRaw as bigint) || BigInt(0);
                  if (current >= needed && needed > BigInt(0)) { handleBuy(); }
                  else handleApprove();
                }}
                disabled={!payAmount || payAmount === "0" || (exchangeFlow !== 'idle' && exchangeFlow !== 'approved') || !selectedBond?.contract_address}
                className="mt-5 w-full cursor-pointer rounded-lg py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "#4c7df4" }}
              >
                {isApproving || isProcessing ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Processing...</span>
                ) : !selectedBond?.contract_address ? "Contract Address Missing"
                  : (() => { const needed = calculateNeededUSDC(); const current = (allowanceRaw as bigint) || BigInt(0); return current >= needed ? "Buy" : "Approve USDC"; })()}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function PrimaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#05080f" }} />}>
      <PrimaryPageContent />
    </Suspense>
  );
}
