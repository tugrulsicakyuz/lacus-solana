"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, parseEventLogs, type Abi } from "viem";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { retryInsert } from "@/lib/supabase-retry";
import {
  BOND_TOKEN_ABI,
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  BOND_ESCROW_ABI,
  BOND_ESCROW_ADDRESS,
} from "@/config/contracts";
import { Wallet, Tag, X, CheckCircle, Loader2, ShieldCheck, CircleDollarSign } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface Bond {
  id: number;
  issuer_name: string;
  symbol: string;
  apy: number;
  price_per_token: number;
  maturity_months: number;
  contract_address?: string;
}

interface Listing {
  id: number;
  bond_contract_address: string;
  bond_symbol: string;
  issuer_name: string;
  seller_wallet: string;
  amount: number;
  price_per_token: number;
  status: string;
  created_at: string;
  escrow_listing_id: number | null;
}

type SellStep = "idle" | "approving_bond" | "creating_listing" | "done";
type BuyStep = "idle" | "approving_usdc" | "buying" | "done";

function SecondaryPageContent() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [mounted, setMounted] = useState(false);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  // Sell state
  const [selectedBondSell, setSelectedBondSell] = useState<Bond | null>(null);
  const [sellAmount, setSellAmount] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellStep, setSellStep] = useState<SellStep>("idle");
  const pendingSellRef = useRef<{
    bondAddress: string;
    amount: string;
    price: string;
    symbol: string;
    issuerName: string;
  } | null>(null);

  // Buy state
  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [buyStep, setBuyStep] = useState<BuyStep>("idle");

  // Cancel state
  const [cancellingListingId, setCancellingListingId] = useState<number | null>(null);

  // Expand animation for sell form
  const [expandForm, setExpandForm] = useState(false);

  // ── Sell: step 1 — approve bond tokens ──
  const { writeContract: writeBondApprove, data: bondApproveTxHash, isPending: bondApprovePending, error: bondApproveError } = useWriteContract();
  const { isSuccess: bondApproveSuccess, isLoading: bondApproveConfirming } = useWaitForTransactionReceipt({ hash: bondApproveTxHash });

  // ── Sell: step 2 — createListing ──
  const { writeContract: writeCreateListing, data: createListingTxHash, isPending: createListingPending, error: createListingError } = useWriteContract();
  const { isSuccess: createListingSuccess, isLoading: createListingConfirming, isError: createListingReceiptError, data: createListingReceipt } = useWaitForTransactionReceipt({ hash: createListingTxHash });

  // ── Buy: step 1 — approve USDC ──
  const { writeContract: writeUsdcApprove, data: usdcApproveTxHash, isPending: usdcApprovePending, error: usdcApproveError } = useWriteContract();
  const { isSuccess: usdcApproveSuccess, isLoading: usdcApproveConfirming } = useWaitForTransactionReceipt({ hash: usdcApproveTxHash });

  // ── Buy: step 2 — buyListing (atomic!) ──
  const { writeContract: writeBuyListing, data: buyListingTxHash, isPending: buyListingPending, error: buyListingError } = useWriteContract();
  const { isSuccess: buyListingSuccess, isLoading: buyListingConfirming } = useWaitForTransactionReceipt({ hash: buyListingTxHash });

  // ── Cancel ──
  const { writeContract: writeCancelListing, data: cancelListingTxHash, isPending: cancelListingPending } = useWriteContract();
  const { isSuccess: cancelListingSuccess, isLoading: cancelListingConfirming } = useWaitForTransactionReceipt({ hash: cancelListingTxHash });

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [bondsRes, listingsRes] = await Promise.all([
      supabase.from("bonds").select("*").not("contract_address", "is", null).order("id", { ascending: false }),
      supabase.from("secondary_listings").select("*").eq("status", "active").order("created_at", { ascending: false }),
    ]);
    if (bondsRes.data) setBonds(bondsRes.data);
    if (listingsRes.data) setListings(listingsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { data: sellBondBalance } = useReadContract({
    address: selectedBondSell?.contract_address as `0x${string}` | undefined,
    abi: BOND_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!selectedBondSell?.contract_address && !!address },
  });

  const formattedSellBalance = sellBondBalance
    ? parseFloat(formatUnits(sellBondBalance as bigint, 18)).toFixed(2)
    : "0.00";

  // Trigger expand animation when bond is selected
  useEffect(() => {
    if (selectedBondSell) {
      setTimeout(() => setExpandForm(true), 50);
    } else {
      setExpandForm(false);
    }
  }, [selectedBondSell]);

  // ════════════════════════════════════════
  // SELL FLOW EFFECTS
  // ════════════════════════════════════════

  // Bond approved → poll allowance → auto-trigger createListing
  useEffect(() => {
    if (!bondApproveSuccess || sellStep !== "approving_bond" || !pendingSellRef.current || !publicClient || !address) return;

    const { bondAddress, amount, price } = pendingSellRef.current;
    const bondAmountWei = parseUnits(amount, 18);
    const usdcTotal = BigInt(Math.round(parseFloat(amount) * parseFloat(price) * 1_000_000));

    toast.success("Bond approved — verifying on-chain...");
    setSellStep("creating_listing");

    let attempts = 0;
    const maxAttempts = 12;

    const tryCreateListing = async () => {
      try {
        const allowance = await publicClient.readContract({
          address: bondAddress as `0x${string}`,
          abi: BOND_TOKEN_ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, BOND_ESCROW_ADDRESS as `0x${string}`],
        }) as bigint;

        if (allowance >= bondAmountWei) {
          writeCreateListing({
            address: BOND_ESCROW_ADDRESS as `0x${string}`,
            abi: BOND_ESCROW_ABI as Abi,
            functionName: "createListing",
            args: [bondAddress as `0x${string}`, bondAmountWei, usdcTotal],
          });
        } else {
          attempts++;
          if (attempts >= maxAttempts) {
            setSellStep("idle");
            pendingSellRef.current = null;
            toast.error("Approval not detected after 6 seconds. Please try again.");
          } else {
            setTimeout(tryCreateListing, 500);
          }
        }
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          setSellStep("idle");
          pendingSellRef.current = null;
          toast.error("Could not verify approval. Please try again.");
        } else {
          setTimeout(tryCreateListing, 500);
        }
      }
    };

    setTimeout(tryCreateListing, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bondApproveSuccess, sellStep]);

  // createListing confirmed → save to Supabase
  useEffect(() => {
    if (createListingSuccess && sellStep === "creating_listing" && createListingReceipt && pendingSellRef.current) {
      const { bondAddress, amount, price, symbol, issuerName } = pendingSellRef.current;

      let onChainId: number | null = null;
      try {
        const logs = parseEventLogs({
          abi: BOND_ESCROW_ABI as Abi,
          eventName: "ListingCreated",
          logs: createListingReceipt.logs,
        });
        const args = logs[0]?.args as { listingId?: bigint } | undefined;
        onChainId = args?.listingId != null ? Number(args.listingId) : null;
      } catch (e) {
        console.error("Failed to parse ListingCreated event:", e);
      }

      supabase.from("secondary_listings").insert({
        bond_contract_address: bondAddress,
        bond_symbol: symbol,
        issuer_name: issuerName,
        seller_wallet: address?.toLowerCase(),
        amount: parseFloat(amount),
        price_per_token: parseFloat(price),
        status: "active",
        escrow_listing_id: onChainId,
      }).then(({ error }) => {
        if (error) {
          toast.error(`On-chain listing created (ID: ${onChainId}) but DB save failed. TX: ${createListingTxHash?.slice(0, 10)}...`);
        } else {
          toast.success("Listing live! Bonds locked in escrow.");
          setSellAmount("");
          setSellPrice("");
          setSelectedBondSell(null);
          pendingSellRef.current = null;
          fetchData();
          setSellStep("done");
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createListingSuccess, sellStep, createListingReceipt]);

  // ════════════════════════════════════════
  // BUY FLOW EFFECTS
  // ════════════════════════════════════════

  // USDC approved → poll allowance → auto-trigger buyListing
  useEffect(() => {
    if (!usdcApproveSuccess || buyStep !== "approving_usdc" || activeListing?.escrow_listing_id == null || !publicClient || !address) return;

    const requiredUsdc = BigInt(Math.round(activeListing.price_per_token * activeListing.amount * 1_000_000));
    const listingId = BigInt(activeListing.escrow_listing_id);

    toast.success("USDC approved — verifying on-chain...");
    setBuyStep("buying");

    let attempts = 0;
    const maxAttempts = 12;

    const tryBuyListing = async () => {
      try {
        const allowance = await publicClient.readContract({
          address: MOCK_USDC_ADDRESS as `0x${string}`,
          abi: MOCK_USDC_ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, BOND_ESCROW_ADDRESS as `0x${string}`],
        }) as bigint;

        if (allowance >= requiredUsdc) {
          writeBuyListing({
            address: BOND_ESCROW_ADDRESS as `0x${string}`,
            abi: BOND_ESCROW_ABI as Abi,
            functionName: "buyListing",
            args: [listingId],
          });
        } else {
          attempts++;
          if (attempts >= maxAttempts) {
            setBuyStep("idle");
            setActiveListing(null);
            toast.error("USDC approval not detected after 6 seconds. Please try again.");
          } else {
            setTimeout(tryBuyListing, 500);
          }
        }
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          setBuyStep("idle");
          setActiveListing(null);
          toast.error("Could not verify USDC approval. Please try again.");
        } else {
          setTimeout(tryBuyListing, 500);
        }
      }
    };

    setTimeout(tryBuyListing, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdcApproveSuccess, buyStep]);

  // buyListing confirmed → update DB + done
  useEffect(() => {
    if (!buyListingSuccess || buyStep !== "buying" || !activeListing || !address) return;

    const syncSecondaryBuy = async () => {
      try {
        const buyerWallet = address.toLowerCase();
        const sellerWallet = activeListing.seller_wallet.toLowerCase();
        const bondSymbol = activeListing.bond_symbol;
        const amount = activeListing.amount;
        const usdcAmount = activeListing.price_per_token * activeListing.amount;

        // 1. Mark listing complete
        const { error: listingError } = await supabase
          .from("secondary_listings")
          .update({ status: "completed", buyer_wallet: buyerWallet })
          .eq("id", activeListing.id);
        if (listingError) throw new Error("Failed to update listing: " + listingError.message);

        // 2. Decrease seller balance
        const { data: sellerHolding } = await supabase
          .from("user_holdings")
          .select("*")
          .eq("wallet_address", sellerWallet)
          .eq("bond_symbol", bondSymbol)
          .maybeSingle();

        if (sellerHolding) {
          const newSellerBalance = Math.max(0, sellerHolding.balance - amount);
          const { error: sellerUpdateError } = await supabase
            .from("user_holdings")
            .update({ balance: newSellerBalance })
            .eq("id", sellerHolding.id);
          if (sellerUpdateError) throw new Error("Failed to update seller balance: " + sellerUpdateError.message);
        }

        // 3. Increase buyer balance
        const { data: buyerHolding } = await supabase
          .from("user_holdings")
          .select("*")
          .eq("wallet_address", buyerWallet)
          .eq("bond_symbol", bondSymbol)
          .maybeSingle();

        if (buyerHolding) {
          const { error: buyerUpdateError } = await supabase
            .from("user_holdings")
            .update({ balance: buyerHolding.balance + amount })
            .eq("id", buyerHolding.id);
          if (buyerUpdateError) throw new Error("Failed to update buyer balance: " + buyerUpdateError.message);
        } else {
          const buyerInsertResult = await retryInsert("user_holdings", {
            wallet_address: buyerWallet,
            bond_symbol: bondSymbol,
            balance: amount,
            unclaimed_yield: 0,
          });
          if (!buyerInsertResult.success) throw new Error("Failed to create buyer holding: " + buyerInsertResult.error);
        }

        // 4. Transaction records for both parties
        await retryInsert("transactions", { wallet_address: buyerWallet,  transaction_type: "BUY",  bond_symbol: bondSymbol, token_amount: amount, usdc_amount: usdcAmount });
        await retryInsert("transactions", { wallet_address: sellerWallet, transaction_type: "SELL", bond_symbol: bondSymbol, token_amount: amount, usdc_amount: usdcAmount });

        setBuyStep("done");
        toast.success("Trade complete — bonds are in your wallet!");
      } catch (error) {
        console.error("Secondary market DB sync error:", error);
        toast.error("Trade confirmed on-chain but database update failed. Your balance will sync shortly.");
      } finally {
        fetchData();
      }
    };

    syncSecondaryBuy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyListingSuccess, buyStep]);

  // ════════════════════════════════════════
  // CANCEL FLOW EFFECT
  // ════════════════════════════════════════

  useEffect(() => {
    if (cancelListingSuccess && cancellingListingId != null) {
      supabase
        .from("secondary_listings")
        .update({ status: "cancelled" })
        .eq("id", cancellingListingId)
        .then(() => {
          toast.success("Listing cancelled — bonds returned to your wallet.");
          setCancellingListingId(null);
          fetchData();
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelListingSuccess, cancellingListingId]);

  // ════════════════════════════════════════
  // ERROR RECOVERY EFFECTS
  // ════════════════════════════════════════

  // Sell: wallet rejection or error → reset sell flow
  useEffect(() => {
    if (bondApproveError && sellStep === "approving_bond") {
      setSellStep("idle");
      pendingSellRef.current = null;
      toast.error("Approval cancelled. You can try again.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bondApproveError]);

  // Sell: createListing wallet rejection → reset sell flow
  useEffect(() => {
    if (createListingError && sellStep === "creating_listing") {
      setSellStep("idle");
      pendingSellRef.current = null;
      toast.error("Listing cancelled. You can try again.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createListingError]);

  // Sell: createListing tx reverted on-chain → reset sell flow
  useEffect(() => {
    if (createListingReceiptError && sellStep === "creating_listing") {
      setSellStep("idle");
      pendingSellRef.current = null;
      toast.error("Escrow transaction failed. Make sure your bond approval went through.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createListingReceiptError]);

  // Buy: USDC approval rejected → close modal
  useEffect(() => {
    if (usdcApproveError && buyStep === "approving_usdc") {
      setBuyStep("idle");
      setActiveListing(null);
      toast.error("USDC approval cancelled.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdcApproveError]);

  // Buy: trade tx failed → close modal
  useEffect(() => {
    if (buyListingError && buyStep === "buying") {
      setBuyStep("idle");
      setActiveListing(null);
      toast.error("Trade failed: " + (buyListingError?.message?.slice(0, 80) || "Unknown error"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyListingError]);

  // ════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════

  const handleCreateListing = () => {
    if (!selectedBondSell?.contract_address || !sellAmount || !sellPrice || !address) return;
    const amt = parseFloat(sellAmount);
    const prc = parseFloat(sellPrice);
    if (isNaN(amt) || amt <= 0 || isNaN(prc) || prc <= 0) {
      toast.error("Enter valid amount and price");
      return;
    }
    if (amt > parseFloat(formattedSellBalance)) {
      toast.error("Amount exceeds your balance");
      return;
    }
    pendingSellRef.current = {
      bondAddress: selectedBondSell.contract_address,
      amount: sellAmount,
      price: sellPrice,
      symbol: selectedBondSell.symbol,
      issuerName: selectedBondSell.issuer_name,
    };
    setSellStep("approving_bond");
    writeBondApprove({
      address: selectedBondSell.contract_address as `0x${string}`,
      abi: BOND_TOKEN_ABI,
      functionName: "approve",
      args: [BOND_ESCROW_ADDRESS as `0x${string}`, parseUnits(sellAmount, 18)],
    });
  };

  const handleBuy = (listing: Listing) => {
    if (listing.escrow_listing_id == null) {
      toast.error("This legacy listing cannot be purchased through escrow.");
      return;
    }
    setActiveListing(listing);
    setBuyStep("approving_usdc");
    const usdcTotal = BigInt(Math.round(listing.amount * listing.price_per_token * 1_000_000));
    writeUsdcApprove({
      address: MOCK_USDC_ADDRESS as `0x${string}`,
      abi: MOCK_USDC_ABI,
      functionName: "approve",
      args: [BOND_ESCROW_ADDRESS as `0x${string}`, usdcTotal],
    });
  };

  const handleCancel = (listing: Listing) => {
    if (listing.escrow_listing_id == null) {
      supabase.from("secondary_listings").update({ status: "cancelled" }).eq("id", listing.id)
        .then(() => { toast.success("Listing removed."); fetchData(); });
      return;
    }
    setCancellingListingId(listing.id);
    writeCancelListing({
      address: BOND_ESCROW_ADDRESS as `0x${string}`,
      abi: BOND_ESCROW_ABI as Abi,
      functionName: "cancelListing",
      args: [BigInt(listing.escrow_listing_id)],
    });
  };

  if (!mounted) return null;

  const isSellLoading = sellStep === "approving_bond" || sellStep === "creating_listing";
  const totalSellValue = sellAmount && sellPrice
    ? (parseFloat(sellAmount || "0") * parseFloat(sellPrice || "0")).toFixed(2)
    : null;

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <section className="min-h-screen pt-8 pb-16">
      <div className="max-w-[1440px] mx-auto px-8">
        
        {/* Header with Tab Switcher */}
        <div className="pt-14 pb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div>
            <div className="eyebrow eyebrow-rule mb-5 reveal" style={{ color: "var(--lilac)" }}>
              Secondary Market
            </div>
            <h1
              className="font-display text-[var(--ink)] leading-[0.97] tracking-tight reveal reveal-d1"
              style={{ fontSize: "clamp(2.2rem, 3.5vw, 3.8rem)" }}
            >
              P2P Bond Exchange
              <br />
              <span className="italic grad-ink-interactive cursor-pointer">peer-to-peer.</span>
            </h1>
          </div>

          {/* Tab Switcher */}
          <div
            className="reveal reveal-d2 flex-shrink-0"
            style={{
              display: "inline-flex",
              gap: "4px",
              padding: "4px",
              borderRadius: "14px",
              border: "1px solid rgba(226,228,245,0.08)",
              background: "rgba(10,12,30,0.6)",
              backdropFilter: "blur(12px)",
            }}
          >
            {(["buy", "sell"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.68rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    padding: "10px 28px",
                    borderRadius: "10px",
                    border: active
                      ? tab === "buy"
                        ? "1px solid rgba(125,211,252,0.25)"
                        : "1px solid rgba(196,181,253,0.25)"
                      : "1px solid transparent",
                    background: active
                      ? tab === "buy"
                        ? "rgba(125,211,252,0.08)"
                        : "rgba(196,181,253,0.08)"
                      : "transparent",
                    color: active
                      ? tab === "buy" ? "var(--aqua-bright)" : "var(--lilac)"
                      : "var(--ink4)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {tab === "buy" ? "Buy" : "Sell"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Market Stats Grid */}
        {isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 reveal reveal-d2">
            <div className="card-luminous rounded-xl px-6 py-5">
              <p className="eyebrow-dim mb-2">Active Listings</p>
              <p className="text-2xl font-semibold text-[var(--ink)] font-mono">{listings.length}</p>
              <p className="text-[11px] text-[var(--ink4)] mt-2">Across All Markets</p>
            </div>
            <div className="card-luminous rounded-xl px-6 py-5">
              <p className="eyebrow-dim mb-2">Your Bonds</p>
              <p className="text-2xl font-semibold text-[var(--ink)] font-mono">{bonds.length}</p>
              <p className="text-[11px] text-[var(--ink4)] mt-2">Available to List</p>
            </div>
          </div>
        )}

        {!isConnected ? (
          <div className="card-luminous rounded-2xl flex flex-col items-center justify-center py-20 px-6 text-center">
            <Wallet className="w-14 h-14 text-[var(--lilac)] mb-5 opacity-40" />
            <h3 className="font-display text-[var(--ink)] text-xl mb-2">Connect Your Wallet</h3>
            <p className="text-sm text-[var(--ink3)] mb-6">Connect to browse listings or post a sell offer</p>
            <ConnectButton />
          </div>
        ) : (
          <div>
            {/* BUY TAB CONTENT */}
            {activeTab === 'buy' && (
              <div className="card-luminous rounded-2xl overflow-hidden">

                {loading ? (
                  <div className="flex items-center justify-center py-20 gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--lilac)]" />
                    <span className="text-sm text-[var(--ink3)]">Loading listings...</span>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Tag className="w-14 h-14 text-[var(--ink4)] mb-5 opacity-30" />
                    <h3 className="text-lg font-medium text-[var(--ink)] mb-2">No active listings</h3>
                    <p className="text-sm text-[var(--ink3)]">Check back later or list your own bonds</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--rule)]">
                          <th className="px-6 py-4 text-left eyebrow-dim">Asset</th>
                          <th className="px-6 py-4 text-left eyebrow-dim">Issuer</th>
                          <th className="px-6 py-4 text-left eyebrow-dim">APY</th>
                          <th className="px-6 py-4 text-left eyebrow-dim">Amount</th>
                          <th className="px-6 py-4 text-left eyebrow-dim">Price</th>
                          <th className="px-6 py-4 text-left eyebrow-dim">Seller</th>
                          <th className="px-6 py-4 text-right eyebrow-dim"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {listings.map((listing) => {
                          const isMyListing = listing.seller_wallet.toLowerCase() === address?.toLowerCase();
                          const isCancelling = cancellingListingId === listing.id && (cancelListingPending || cancelListingConfirming);
                          const isBuying = activeListing?.id === listing.id && (buyStep === "approving_usdc" || buyStep === "buying");
                          const totalPrice = (listing.amount * listing.price_per_token).toFixed(2);
                          
                          return (
                            <tr 
                              key={listing.id}
                              className="border-b border-[var(--rule-soft)] hover:bg-[var(--surface)] transition-colors"
                            >
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[var(--lilac)]/10 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-[var(--lilac)] font-mono">{listing.bond_symbol.slice(0, 3).toUpperCase()}</span>
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-semibold text-[var(--ink)]">{listing.bond_symbol}</p>
                                    <p className="text-[10px] text-[var(--ink3)]">Fixed Rate</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-[13px] font-medium text-[var(--ink)]">{listing.issuer_name}</td>
                              <td className="px-6 py-5">
                                <span className="text-sm font-semibold text-[var(--aqua-bright)] font-mono">7.5%</span>
                              </td>
                              <td className="px-6 py-5">
                                <p className="text-[13px] text-[var(--ink)] font-mono">{listing.amount} TKN</p>
                                <p className="text-[10px] text-[var(--ink3)]">${totalPrice} Val.</p>
                              </td>
                              <td className="px-6 py-5">
                                <p className="text-[13px] text-[var(--ink)] font-mono">${listing.price_per_token.toFixed(2)} <span className="text-[10px] text-[var(--ink3)]">USDC</span></p>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-[var(--ink3)]">{truncateAddress(listing.seller_wallet)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                {isMyListing ? (
                                  <button
                                    onClick={() => handleCancel(listing)}
                                    disabled={isCancelling}
                                    className="btn-ghost px-5 py-1.5 text-xs text-[var(--coral)] border-[var(--coral)]/30 hover:border-[var(--coral)]/60 flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {isCancelling ? <><Loader2 className="w-3 h-3 animate-spin" />Cancelling</> : "Cancel"}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleBuy(listing)}
                                    disabled={isBuying || listing.escrow_listing_id == null}
                                    className="btn-primary px-5 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {isBuying ? <><Loader2 className="w-3 h-3 animate-spin" />{buyStep === "approving_usdc" ? "Approving" : "Buying"}</> : "Buy"}
                                  </button>
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
            )}

            {/* SELL TAB CONTENT */}
            {activeTab === 'sell' && (
              <div className="grid gap-6 transition-all duration-300" style={{ gridTemplateColumns: selectedBondSell ? "1fr 1.2fr" : "1fr" }}>
                {/* Bonds List Panel */}
                <div className="card-luminous rounded-2xl p-6 min-h-[400px]">
                  <h2 className="text-base font-semibold text-[var(--ink)] mb-5">Your Bonds</h2>
                
                  {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--lilac)]" />
                      <span className="text-sm text-[var(--ink3)]">Loading bonds...</span>
                    </div>
                  ) : bonds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <CircleDollarSign className="w-12 h-12 text-[var(--ink4)] mb-4 opacity-30" />
                      <h3 className="text-base font-medium text-[var(--ink)] mb-2">No bonds in your wallet</h3>
                      <p className="text-[13px] text-[var(--ink3)]">Purchase bonds from the primary market</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {bonds.map((bond) => {
                        const isSelected = selectedBondSell?.id === bond.id;
                        return (
                          <div 
                            key={bond.id}
                            onClick={() => { 
                              if (selectedBondSell?.id === bond.id) {
                                setSelectedBondSell(null);
                              } else {
                                setSelectedBondSell(bond); 
                                setSellStep("idle"); 
                                setSellAmount(""); 
                                setSellPrice(""); 
                                pendingSellRef.current = null;
                              }
                            }}
                            className={`rounded-xl p-4 cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-[var(--surface)] border-[var(--lilac)]/30'
                                : 'border-[var(--rule)] hover:bg-[var(--surface)] hover:border-[var(--rule-soft)]'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-[var(--lilac)]/10 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-[var(--lilac)] font-mono">{bond.symbol.slice(0, 3).toUpperCase()}</span>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-sm font-semibold text-[var(--ink)] mb-0.5">{bond.issuer_name}</h3>
                                <p className="text-[11px] text-[var(--ink3)] font-mono">{bond.symbol}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="eyebrow-dim mb-1">Balance</p>
                                <p className="text-[13px] font-medium text-[var(--ink)] font-mono">{formattedSellBalance}</p>
                              </div>
                              <div>
                                <p className="eyebrow-dim mb-1">APY</p>
                                <p className="text-[13px] font-semibold text-[var(--aqua-bright)] font-mono">{bond.apy}%</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Form Panel - Only visible when bond is selected */}
                {selectedBondSell && (
                  <div 
                    className="card-luminous rounded-2xl p-8 min-h-[400px]"
                    style={{
                      opacity: expandForm ? 1 : 0,
                      transform: expandForm ? "translateX(0)" : "translateX(20px)",
                      transition: "opacity 0.3s ease-out, transform 0.3s ease-out"
                    }}
                  >
                    <div className="mb-7">
                      <h3 className="font-display text-[var(--ink)] text-lg mb-1">Create Listing</h3>
                      <p className="text-xs text-[var(--ink3)]">Set your price and list {selectedBondSell.symbol} for sale</p>
                    </div>

                    <div className="grid grid-cols-2 gap-5 mb-6">
                      <div>
                        <label className="text-[10px] text-[var(--ink2)] uppercase tracking-widest font-semibold mb-2.5 flex justify-between items-center">
                          Amount
                          <button onClick={() => setSellAmount(formattedSellBalance)} className="text-[var(--lilac)] text-[10px] font-medium hover:text-[var(--lilac-bright)] transition-colors bg-transparent border-none cursor-pointer">
                            Max: {formattedSellBalance}
                          </button>
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={sellAmount}
                          onChange={(e) => setSellAmount(e.target.value)}
                          disabled={isSellLoading}
                          className="w-full bg-[var(--abyss)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-4 text-sm font-medium text-[var(--ink)] outline-none transition-colors disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--ink2)] uppercase tracking-widest font-semibold mb-2.5 block">Price per Token (USDC)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={sellPrice}
                          onChange={(e) => setSellPrice(e.target.value)}
                          disabled={isSellLoading}
                          className="w-full bg-[var(--abyss)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-4 text-sm font-medium text-[var(--ink)] outline-none transition-colors disabled:opacity-50"
                        />
                      </div>
                    </div>
                    {totalSellValue && (
                      <div className="flex justify-between items-center p-5 bg-[var(--abyss)] rounded-xl mb-6 border border-[var(--rule)]">
                        <span className="text-xs text-[var(--ink3)] uppercase tracking-widest font-semibold">Total Value</span>
                        <span className="text-xl font-semibold text-[var(--ink)] font-mono">${totalSellValue}</span>
                      </div>
                    )}

                    {isSellLoading && (
                      <div className="flex items-center gap-3 p-4 bg-[var(--lilac)]/8 rounded-xl mb-5 border border-[var(--lilac)]/20">
                        <Loader2 className="w-4 h-4 text-[var(--lilac)] animate-spin" />
                        <span className="text-sm text-[var(--lilac)] font-medium">
                          {sellStep === "approving_bond" ? "Approving bond tokens..." : "Creating listing..."}
                        </span>
                      </div>
                    )}

                    {sellStep === "done" && (
                      <div className="flex items-center gap-3 p-4 bg-[var(--aqua)]/8 rounded-xl mb-5 border border-[var(--aqua)]/20">
                        <CheckCircle className="w-4 h-4 text-[var(--aqua)]" />
                        <span className="text-sm text-[var(--aqua)] font-medium">Listing created successfully!</span>
                      </div>
                    )}
                    <button
                      onClick={handleCreateListing}
                      disabled={isSellLoading || !sellAmount || !sellPrice}
                      className="w-full btn-primary py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSellLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />{sellStep === "approving_bond" ? "Approving..." : "Creating..."}</>
                      ) : (
                        "Create Listing"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buy Modal */}
      {activeListing && buyStep !== "idle" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/75">
          <div className="w-full max-w-md card-luminous rounded-2xl overflow-hidden">
            <div className="p-6 flex items-center justify-between border-b border-[var(--rule)]">
              <div>
                <h3 className="font-semibold text-[var(--ink)]">Buy {activeListing.bond_symbol}</h3>
                <p className="text-sm mt-0.5 text-[var(--ink3)]">
                  {activeListing.amount} tokens · ${(activeListing.amount * activeListing.price_per_token).toFixed(2)} USDC
                </p>
              </div>
              {buyStep !== "buying" && buyStep !== "done" && (
                <button onClick={() => { setActiveListing(null); setBuyStep("idle"); }} className="text-[var(--ink4)] hover:text-[var(--ink)] transition-colors">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Step progress */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      border: `1px solid ${usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? "var(--aqua)" : "var(--lilac)"}`,
                      background: usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? "rgba(52,211,153,0.15)" : "rgba(196,181,253,0.15)",
                      color: usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? "var(--aqua)" : "var(--lilac)",
                    }}>
                    {usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? <CheckCircle className="h-3 w-3" /> : "1"}
                  </div>
                  <span className={usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? "text-[var(--aqua)]" : "text-[var(--lilac)]" }>
                    Approve USDC
                  </span>
                </div>
                <div className="flex-1 h-px bg-[var(--rule)]" />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      border: `1px solid ${buyStep === "done" ? "var(--aqua)" : buyStep === "buying" ? "var(--lilac)" : "var(--rule)"}`,
                      background: buyStep === "done" ? "rgba(52,211,153,0.15)" : buyStep === "buying" ? "rgba(196,181,253,0.15)" : "transparent",
                      color: buyStep === "done" ? "var(--aqua)" : "var(--lilac)",
                    }}>
                    {buyStep === "done" ? <CheckCircle className="h-3 w-3" /> : "2"}
                  </div>
                  <span className={buyStep === "done" ? "text-[var(--aqua)]" : buyStep === "buying" ? "text-[var(--lilac)]" : "text-[var(--ink4)]" }>
                    Atomic Trade
                  </span>
                </div>
              </div>

              {buyStep === "done" ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center bg-[var(--aqua)]/10">
                    <CheckCircle className="h-8 w-8 text-[var(--aqua)]" />
                  </div>
                  <h4 className="text-lg font-semibold text-[var(--ink)] mb-1">Trade Complete!</h4>
                  <p className="text-sm text-[var(--ink3)] mb-1">
                    {activeListing.amount} {activeListing.bond_symbol} tokens are now in your wallet.
                  </p>
                  <p className="text-xs text-[var(--ink4)] mb-5">
                    USDC was sent to the seller atomically in the same transaction.
                  </p>
                  {buyListingTxHash && (
                    <a href={`https://sepolia.basescan.org/tx/${buyListingTxHash}`} target="_blank" rel="noopener noreferrer"
                      className="block text-xs text-[var(--lilac)] hover:text-[var(--lilac-bright)] transition-colors mb-4">
                      View atomic trade details ↗
                    </a>
                  )}
                  <button onClick={() => { setActiveListing(null); setBuyStep("idle"); }}
                    className="btn-primary px-6 py-2.5">
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Escrow protection notice */}
                  <div className="rounded-xl p-3 bg-[var(--aqua)]/5 border border-[var(--aqua)]/12">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--aqua)]" />
                      <p className="text-xs text-[var(--aqua)]/70">
                        Step 1 approves USDC. Step 2 atomically transfers USDC to the seller and bonds to you in a single on-chain transaction — you cannot lose USDC without receiving bonds.
                      </p>
                    </div>
                  </div>

                  {/* Trade summary */}
                  <div className="rounded-xl p-3 space-y-1.5 bg-[var(--surface)] border border-[var(--rule)]">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--ink3)]">You pay</span>
                      <span className="text-sm font-semibold text-[var(--ink)] font-mono">
                        ${(activeListing.amount * activeListing.price_per_token).toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--ink3)]">You receive</span>
                      <span className="text-sm font-semibold text-[var(--aqua-bright)] font-mono">
                        {activeListing.amount} {activeListing.bond_symbol} tokens
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-1.5 border-t border-[var(--rule-soft)]">
                      <span className="text-[var(--ink3)]">Seller</span>
                      <span className="font-mono text-[var(--ink4)]">
                        {activeListing.seller_wallet.slice(0, 6)}...{activeListing.seller_wallet.slice(-4)}
                      </span>
                    </div>
                  </div>

                  {/* Status indicator */}
                  {(buyStep === "approving_usdc" || buyStep === "buying") && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--lilac)]/8 border border-[var(--lilac)]/15">
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 text-[var(--lilac)]" />
                      <p className="text-xs text-[var(--lilac-bright)]">
                        {buyStep === "approving_usdc"
                          ? (usdcApprovePending ? "Confirm USDC approval in your wallet..." : "Confirming approval...")
                          : (buyListingPending ? "Confirm atomic trade in your wallet..." : "Executing atomic trade on-chain...")}
                      </p>
                    </div>
                  )}

                  {usdcApproveTxHash && (
                    <a href={`https://sepolia.basescan.org/tx/${usdcApproveTxHash}`} target="_blank" rel="noopener noreferrer"
                      className="block text-center text-xs text-[var(--lilac)] hover:text-[var(--lilac-bright)] transition-colors">
                      USDC approval tx ↗
                    </a>
                  )}
                  {buyListingTxHash && (
                    <a href={`https://sepolia.basescan.org/tx/${buyListingTxHash}`} target="_blank" rel="noopener noreferrer"
                      className="block text-center text-xs text-[var(--lilac)] hover:text-[var(--lilac-bright)] transition-colors">
                      View trade tx details ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function SecondaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--lilac)]" />
      </div>
    }>
      <SecondaryPageContent />
    </Suspense>
  );
}
