"use client";

import '@solana/wallet-adapter-react-ui/styles.css';
import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ChevronDown, TrendingUp, Info, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useLacusProgram } from "@/hooks/useLacus";

interface OnChainBond {
  bondId: number;
  issuer: string;
  faceValue: number;
  couponRateBps: number;
  maturityTimestamp: number;
  maxSupply: number;
  tokensSold: number;
  isMatured: boolean;
}

interface BondMetadata {
  id: number;
  symbol: string;
  issuer_name: string;
  description?: string;
}

interface CombinedBond extends OnChainBond {
  symbol: string;
  issuerName: string;
  description?: string;
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function PrimaryPageContent() {
  const searchParams = useSearchParams();
  const { publicKey, connected } = useWallet();
  const { fetchAllBonds, fetchBond, buyBond } = useLacusProgram();

  const [onChainBonds, setOnChainBonds] = useState<OnChainBond[]>([]);
  const [bondMetadata, setBondMetadata] = useState<BondMetadata[]>([]);
  const [bonds, setBonds] = useState<CombinedBond[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedBond, setSelectedBond] = useState<CombinedBond | null>(null);
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [computedReceive, setComputedReceive] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const BONDS_PER_PAGE = 12;

  // Pagination calculations
  const totalPages = Math.ceil(bonds.length / BONDS_PER_PAGE);
  const startIndex = (currentPage - 1) * BONDS_PER_PAGE;
  const endIndex = startIndex + BONDS_PER_PAGE;
  const paginatedBonds = bonds.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    if (!connected) {
      setLoading(false);
      setFetchError("Please connect your wallet to view bonds.");
      return;
    }

    try {
      const onChainData = await fetchAllBonds();
      setOnChainBonds(onChainData);

      const { data: metadata, error: metaError } = await supabase
        .from("bonds")
        .select("id, symbol, issuer_name, description");

      if (metaError) {
        console.error("Failed to fetch metadata:", metaError);
      } else {
        setBondMetadata(metadata as BondMetadata[]);
      }

      const combined: CombinedBond[] = onChainData.map((bond: any, index: number) => {
        const meta = metadata?.find((m) => m.id === bond.bondId) || metadata?.[index];
        return {
          ...bond,
          symbol: meta?.symbol || `BOND-${bond.bondId}`,
          issuerName: meta?.issuer_name || "Unknown Issuer",
          description: meta?.description,
        };
      });

      setBonds(combined);
      setCurrentPage(1);

      const bondParam = searchParams.get("bond");
      if (bondParam) {
        const match = combined.find((b) => b.symbol === bondParam);
        if (match) setSelectedBond(match);
        else if (combined.length > 0) setSelectedBond(combined[0]);
      } else if (combined.length > 0) {
        setSelectedBond(combined[0]);
      }
    } catch (error) {
      console.error("Failed to fetch bonds:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFetchError("Failed to load bonds. Please try again.");
      toast.error('Failed to load bonds', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [fetchAllBonds, searchParams, connected]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPayAmount("");
    setComputedReceive("");
  }, [selectedBond]);

  const handleBuy = async () => {
    if (!connected || !publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    if (!selectedBond) {
      toast.error("No bond selected");
      return;
    }

    const usdcAmount = parseFloat(payAmount);
    if (!payAmount || isNaN(usdcAmount) || usdcAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (selectedBond.tokensSold >= selectedBond.maxSupply) {
      toast.error("Bond fully sold");
      return;
    }

    const faceValueUSDC = selectedBond.faceValue / 1_000_000;
    const bondTokenAmount = Math.floor((usdcAmount / faceValueUSDC) * 1_000_000) / 1_000_000;

    if (bondTokenAmount === 0) {
      toast.error("Amount too small");
      return;
    }

    const bondTokensToMint = Math.floor(bondTokenAmount);
    if (bondTokensToMint === 0) {
      toast.error("Amount too small to purchase even 1 token");
      return;
    }

    setIsProcessing(true);

    try {
      const tx = await buyBond(selectedBond.bondId, bondTokensToMint);
      
      toast.success(
        <span>
          🎉 Purchase complete!{" "}
          <a
            href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-400 hover:text-blue-300"
          >
            View transaction →
          </a>
        </span>
      );

      setPayAmount("");
      setComputedReceive("");
      
      await fetchData();
    } catch (error: any) {
      console.error("Buy failed:", error);
      toast.error(error?.message || "Purchase failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--lilac)]" />
          <p className="text-sm text-[var(--ink3)]">Loading bonds from Solana…</p>
        </div>
      </section>
    );
  }

  const faceValueUSDC = selectedBond ? selectedBond.faceValue / 1_000_000 : 0;
  const apy = selectedBond ? selectedBond.couponRateBps / 100 : 0;
  const tokensRemaining = selectedBond ? selectedBond.maxSupply - selectedBond.tokensSold : 0;
  const fillPercentage = selectedBond ? Math.min((selectedBond.tokensSold / selectedBond.maxSupply) * 100, 100) : 0;

  const marketStats = [
    { label: "Face Value", value: selectedBond ? fmtCurrency(faceValueUSDC) : "—", isYield: false },
    { label: "Remaining", value: selectedBond ? `${tokensRemaining.toLocaleString()} tokens` : "—", isYield: false },
    { label: "Maturity", value: selectedBond ? formatDate(selectedBond.maturityTimestamp) : "—", isYield: false },
    { label: "APY", value: selectedBond ? `${apy}%` : "—", isYield: true },
  ];

  return (
    <>
      {/* Header */}
      <section className="pt-14 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="eyebrow eyebrow-rule mb-5 reveal" style={{ color: "var(--aqua-bright)" }}>
            Primary Market
          </div>
          <h1
            className="font-display text-[var(--ink)] leading-[0.97] tracking-tight reveal reveal-d1"
            style={{ fontSize: "clamp(2rem, 3vw, 3.4rem)" }}
          >
            Buy bonds
            <span className="italic grad-ink-interactive cursor-pointer"> directly.</span>
          </h1>
          <p className="mt-4 text-[var(--ink3)] text-[0.95rem] leading-[1.65] max-w-[46ch] reveal reveal-d2">
            Purchase tokenized bonds at issuance — USDC in, yield-bearing tokens out.
          </p>
        </div>
      </section>

      {/* Main layout */}
      <section className="pb-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:px-8">
          {/* Left column */}
          <div className="w-full lg:w-[55%] space-y-4 reveal reveal-d1">
            {fetchError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4 gap-3">
                <p className="text-sm text-[var(--coral)]">{fetchError}</p>
                <button onClick={() => fetchData()} className="btn-ghost px-5 py-2.5 text-sm">
                  Try again
                </button>
              </div>
            ) : (
              <>
                {/* Bond selector */}
                <div className="relative">
                  <button
                    onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)] hover:border-[var(--lilac)] transition-colors"
                  >
                    {selectedBond ? `${selectedBond.issuerName} (${selectedBond.symbol}) / USDC` : "Select a bond"}
                    <ChevronDown
                      className={`ml-2 h-4 w-4 text-[var(--ink3)] transition-transform duration-200 ${
                        pairDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {pairDropdownOpen && (
                    <div className="absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-xl shadow-2xl bg-[var(--deep)] border border-[var(--rule)]">
                      <div className="max-h-80 overflow-y-auto">
                        {paginatedBonds.map((bond) => (
                          <button
                            key={bond.bondId}
                            onClick={() => {
                              setSelectedBond(bond);
                              setPairDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface)] ${
                              bond.bondId === selectedBond?.bondId
                                ? "bg-[var(--lilac)]/10 text-[var(--lilac)]"
                                : "text-[var(--ink2)]"
                            }`}
                          >
                            <span className="font-medium font-mono">{bond.symbol}</span>
                            <span className="text-[var(--ink3)]"> — {bond.issuerName}</span>
                          </button>
                        ))}
                      </div>
                      
                      {/* Pagination controls */}
                      {bonds.length > 0 && totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--rule)] bg-[var(--surface)]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviousPage();
                            }}
                            disabled={currentPage === 1}
                            className="text-xs font-medium text-[var(--ink3)] hover:text-[var(--lilac)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            ← Previous
                          </button>
                          <span className="text-xs text-[var(--ink3)] font-mono">
                            Page {currentPage} of {totalPages} ({bonds.length} bonds)
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextPage();
                            }}
                            disabled={currentPage === totalPages}
                            className="text-xs font-medium text-[var(--ink3)] hover:text-[var(--lilac)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bond info card */}
                {selectedBond && (
                  <div className="card-luminous rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-[var(--ink)]">{selectedBond.issuerName}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {marketStats.map((stat) => (
                        <div key={stat.label} className="rounded-lg px-3 py-3 bg-[var(--surface)] border border-[var(--rule)]">
                          <p className="eyebrow-dim">{stat.label}</p>
                          <p
                            className="mt-1 text-sm font-semibold font-mono"
                            style={{ color: stat.isYield ? "var(--aqua-bright)" : "var(--ink)" }}
                          >
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-[var(--ink3)]">Fill Rate</span>
                        <span className="text-[11px] font-mono text-[var(--ink2)]">{fillPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-[var(--shore)]">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[var(--aqua-soft)] to-[var(--lilac)]"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!selectedBond && (
                  <div className="card-luminous rounded-xl flex flex-col items-center justify-center p-10 text-center border border-dashed border-[var(--rule)]">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--lilac)]/10">
                      <TrendingUp className="h-6 w-6 text-[var(--lilac)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--ink2)]">Select a bond to view details</p>
                    <p className="mt-1 text-xs text-[var(--ink3)]">Choose from the dropdown above to see price, APY, and market data.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column: Buy interface */}
          <div className="w-full lg:w-[45%]">
            <div className="card-luminous rounded-2xl p-6">
              <div className="mb-5 pb-3 border-b border-[var(--rule)]">
                <span className="text-sm font-semibold text-[var(--ink)] eyebrow">Buy Bonds</span>
              </div>

              {!connected ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <p className="text-sm text-[var(--ink3)] mb-2">Connect your Solana wallet to continue</p>
                  <WalletMultiButton />
                </div>
              ) : (
                <>
                  {/* You Pay */}
                  <div className="rounded-xl p-4 bg-[var(--surface)] border border-[var(--rule)] focus-within:border-[var(--lilac)] transition-colors mb-3">
                    <div className="flex items-center justify-between eyebrow-dim mb-2">
                      <span>You Pay</span>
                      <span>USDC</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={payAmount}
                        onKeyDown={(e) => {
                          if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => {
                          setPayAmount(e.target.value);
                          const num = parseFloat(e.target.value);
                          if (!isNaN(num) && num > 0 && faceValueUSDC > 0) {
                            setComputedReceive((num / faceValueUSDC).toFixed(4));
                          } else {
                            setComputedReceive("");
                          }
                        }}
                        className="w-full min-w-0 bg-transparent text-2xl font-semibold font-mono text-[var(--ink)] outline-none placeholder:text-[var(--ink4)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold font-mono bg-[var(--shore)] border border-[var(--rule)] text-[var(--ink2)]">
                        USDC
                      </span>
                    </div>
                  </div>

                  {/* You Receive */}
                  <div className="rounded-xl p-4 bg-[var(--deep)] border border-[var(--rule)] mb-4">
                    <div className="flex items-center justify-between eyebrow-dim mb-2">
                      <span>You Receive (Est.)</span>
                      <span>{selectedBond?.symbol || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        readOnly
                        placeholder="0.0000"
                        value={computedReceive}
                        className="w-full min-w-0 bg-transparent text-2xl font-semibold font-mono text-[var(--ink3)] outline-none cursor-default"
                      />
                      <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold font-mono bg-[var(--shore)] border border-[var(--rule)] text-[var(--ink2)]">
                        {selectedBond?.symbol || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-4 space-y-2 rounded-xl px-4 py-3 bg-[var(--surface)] mb-5">
                    {([
                      {
                        label: "Face Value",
                        value: selectedBond ? `${fmtCurrency(faceValueUSDC)} / token` : "—",
                      },
                      {
                        label: "Total Cost",
                        value: payAmount && parseFloat(payAmount) > 0 ? fmtCurrency(parseFloat(payAmount)) : "—",
                      },
                      { label: "Network", value: "Solana Devnet", green: true },
                    ] as Array<{ label: string; value: string; green?: boolean }>).map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-[var(--ink3)]">
                          <Info className="h-3 w-3" />
                          {row.label}
                        </span>
                        <span
                          className="font-medium font-mono"
                          style={{ color: row.green ? "var(--aqua-bright)" : "var(--ink2)" }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={!payAmount || payAmount === "0" || isProcessing || !selectedBond}
                    className="w-full btn-primary py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      "Buy Bonds"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function PrimaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PrimaryPageContent />
    </Suspense>
  );
}
