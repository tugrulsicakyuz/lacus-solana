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
    <section style={{ background: "#10131b", minHeight: "100vh", paddingTop: "32px", paddingBottom: "48px" }}>
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 32px" }}>
        
        {/* Header with Tab Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "48px", flexWrap: "wrap", gap: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#c3c6d6", fontWeight: 500 }}>Secondary Market</p>
            <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "36px", fontWeight: 800, color: "#e0e2ed", letterSpacing: "-0.02em" }}>P2P Bond Exchange</h1>
          </div>
          
          {/* Tab Switcher */}
          <div style={{ background: "#181c23", padding: "4px", borderRadius: "8px", display: "inline-flex" }}>
            <button
              onClick={() => setActiveTab('buy')}
              style={{
                padding: "8px 32px",
                borderRadius: "6px",
                fontFamily: "Manrope, sans-serif",
                fontWeight: 600,
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: activeTab === 'buy' ? "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)" : "transparent",
                color: activeTab === 'buy' ? "#001849" : "#c3c6d6",
                boxShadow: activeTab === 'buy' ? "0 4px 12px rgba(179,197,255,0.15)" : "none"
              }}
            >
              BUY MODE
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              style={{
                padding: "8px 32px",
                borderRadius: "6px",
                fontFamily: "Manrope, sans-serif",
                fontWeight: 600,
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: activeTab === 'sell' ? "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)" : "transparent",
                color: activeTab === 'sell' ? "#001849" : "#c3c6d6",
                boxShadow: activeTab === 'sell' ? "0 4px 12px rgba(179,197,255,0.15)" : "none"
              }}
            >
              SELL MODE
            </button>
          </div>
        </div>

        {/* Market Stats Grid */}
        {isConnected && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            <div style={{ background: "#181c23", padding: "24px", borderRadius: "12px", border: "1px solid rgba(67,70,84,0.1)" }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6", marginBottom: "8px", fontWeight: 600 }}>Active Listings</p>
              <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, color: "#e0e2ed" }}>{listings.length}</p>
              <p style={{ fontSize: "11px", color: "rgba(195,198,214,0.6)", marginTop: "8px" }}>Across All Markets</p>
            </div>
            <div style={{ background: "#181c23", padding: "24px", borderRadius: "12px", border: "1px solid rgba(67,70,84,0.1)" }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6", marginBottom: "8px", fontWeight: 600 }}>Your Bonds</p>
              <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "24px", fontWeight: 700, color: "#e0e2ed" }}>{bonds.length}</p>
              <p style={{ fontSize: "11px", color: "rgba(195,198,214,0.6)", marginTop: "8px" }}>Available to List</p>
            </div>
          </div>
        )}

        {!isConnected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", background: "#181c23", borderRadius: "12px", textAlign: "center" }}>
            <Wallet style={{ width: "56px", height: "56px", color: "#b3c5ff", marginBottom: "20px", opacity: 0.5 }} />
            <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "20px", fontWeight: 700, color: "#e0e2ed", marginBottom: "8px" }}>Connect Your Wallet</h3>
            <p style={{ fontSize: "14px", color: "#c3c6d6", marginBottom: "24px" }}>Connect to browse listings or post a sell offer</p>
            <ConnectButton />
          </div>
        ) : (
          <div>
            {/* BUY TAB CONTENT */}
            {activeTab === 'buy' && (
              <div style={{ background: "#181c23", borderRadius: "12px", overflow: "hidden" }}>

                {loading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "12px" }}>
                    <Loader2 style={{ width: "20px", height: "20px", color: "#b3c5ff" }} className="animate-spin" />
                    <span style={{ fontSize: "14px", color: "#c3c6d6" }}>Loading listings...</span>
                  </div>
                ) : listings.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
                    <Tag style={{ width: "56px", height: "56px", color: "#434654", marginBottom: "20px", opacity: 0.4 }} />
                    <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#e0e2ed", marginBottom: "8px" }}>No active listings</h3>
                    <p style={{ fontSize: "14px", color: "#c3c6d6" }}>Check back later or list your own bonds</p>
                  </div>
                ) : (
                  <div style={{ width: "100%", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(67,70,84,0.2)" }}>
                          <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Asset</th>
                          <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Issuer</th>
                          <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>APY</th>
                          <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Amount</th>
                          <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Price</th>
                          <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Seller</th>
                          <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}></th>
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
                              style={{ 
                                borderBottom: "1px solid rgba(67,70,84,0.05)",
                                transition: "background 0.2s",
                                cursor: "default"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#262a32"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <td style={{ padding: "20px 24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#31353d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#b3c5ff" }}>{listing.bond_symbol.slice(0, 3).toUpperCase()}</span>
                                  </div>
                                  <div>
                                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#e0e2ed" }}>{listing.bond_symbol}</p>
                                    <p style={{ fontSize: "10px", color: "#c3c6d6" }}>Fixed Rate</p>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "20px 24px", fontSize: "13px", fontWeight: 500, color: "#e0e2ed" }}>{listing.issuer_name}</td>
                              <td style={{ padding: "20px 24px" }}>
                                <span style={{ fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, color: "#45dfa4" }}>7.5%</span>
                              </td>
                              <td style={{ padding: "20px 24px" }}>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#e0e2ed" }}>{listing.amount} TKN</p>
                                <p style={{ fontSize: "10px", color: "#c3c6d6" }}>${totalPrice} Val.</p>
                              </td>
                              <td style={{ padding: "20px 24px" }}>
                                <p style={{ fontSize: "13px", fontWeight: 700, color: "#e0e2ed" }}>${listing.price_per_token.toFixed(2)} <span style={{ fontSize: "10px", fontWeight: 400, color: "#c3c6d6" }}>USDC</span></p>
                              </td>
                              <td style={{ padding: "20px 24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#c3c6d6" }}>{truncateAddress(listing.seller_wallet)}</span>
                                </div>
                              </td>
                              <td style={{ padding: "20px 24px", textAlign: "right" }}>
                                {isMyListing ? (
                                  <button
                                    onClick={() => handleCancel(listing)}
                                    disabled={isCancelling}
                                    style={{
                                      background: "linear-gradient(135deg, #ffb4ab 0%, #ff8a80 100%)",
                                      color: "#690005",
                                      fontWeight: 700,
                                      fontSize: "12px",
                                      padding: "6px 20px",
                                      borderRadius: "6px",
                                      border: "none",
                                      cursor: isCancelling ? "not-allowed" : "pointer",
                                      opacity: isCancelling ? 0.5 : 1,
                                      transition: "transform 0.15s, box-shadow 0.15s",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px"
                                    }}
                                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                  >
                                    {isCancelling ? <><Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" />Cancelling</> : "Cancel"}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleBuy(listing)}
                                    disabled={isBuying || listing.escrow_listing_id == null}
                                    style={{
                                      background: "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
                                      color: "#001849",
                                      fontWeight: 700,
                                      fontSize: "12px",
                                      padding: "6px 20px",
                                      borderRadius: "6px",
                                      border: "none",
                                      cursor: (isBuying || listing.escrow_listing_id == null) ? "not-allowed" : "pointer",
                                      opacity: (isBuying || listing.escrow_listing_id == null) ? 0.4 : 1,
                                      transition: "transform 0.15s, box-shadow 0.15s",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      boxShadow: "0 4px 12px rgba(179,197,255,0.2)"
                                    }}
                                    onMouseEnter={(e) => { if (!isBuying && listing.escrow_listing_id != null) e.currentTarget.style.boxShadow = "0 6px 16px rgba(179,197,255,0.3)"; }}
                                    onMouseLeave={(e) => { if (!isBuying && listing.escrow_listing_id != null) e.currentTarget.style.boxShadow = "0 4px 12px rgba(179,197,255,0.2)"; }}
                                    onMouseDown={(e) => { if (!isBuying && listing.escrow_listing_id != null) e.currentTarget.style.transform = "scale(0.95)"; }}
                                    onMouseUp={(e) => { if (!isBuying && listing.escrow_listing_id != null) e.currentTarget.style.transform = "scale(1)"; }}
                                  >
                                    {isBuying ? <><Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" />{buyStep === "approving_usdc" ? "Approving" : "Buying"}</> : "Buy"}
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
              <div style={{ display: "grid", gridTemplateColumns: selectedBondSell ? "1fr 1.2fr" : "1fr", gap: "24px", transition: "grid-template-columns 0.3s" }}>
                {/* Bonds List Panel */}
                <div style={{ background: "#181c23", borderRadius: "12px", padding: "24px", minHeight: "400px" }}>
                  <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "16px", fontWeight: 700, color: "#e0e2ed", marginBottom: "20px", letterSpacing: "-0.01em" }}>Your Bonds</h2>
                
                  {loading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "12px" }}>
                      <Loader2 style={{ width: "20px", height: "20px", color: "#b3c5ff" }} className="animate-spin" />
                      <span style={{ fontSize: "14px", color: "#c3c6d6" }}>Loading bonds...</span>
                    </div>
                  ) : bonds.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
                      <CircleDollarSign style={{ width: "48px", height: "48px", color: "#434654", marginBottom: "16px", opacity: 0.3 }} />
                      <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "16px", fontWeight: 700, color: "#e0e2ed", marginBottom: "6px" }}>No bonds in your wallet</h3>
                      <p style={{ fontSize: "13px", color: "#c3c6d6" }}>Purchase bonds from the primary market</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                            style={{
                              background: isSelected ? "#262a32" : "transparent",
                              border: isSelected ? "1px solid rgba(179,197,255,0.3)" : "1px solid rgba(67,70,84,0.1)",
                              borderRadius: "10px",
                              padding: "16px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = "rgba(38,42,50,0.5)"; e.currentTarget.style.borderColor = "rgba(67,70,84,0.3)"; } }}
                            onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(67,70,84,0.1)"; } }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#31353d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#b3c5ff" }}>{bond.symbol.slice(0, 3).toUpperCase()}</span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, color: "#e0e2ed", marginBottom: "2px" }}>{bond.issuer_name}</h3>
                                <p style={{ fontSize: "11px", color: "#c3c6d6" }}>{bond.symbol}</p>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div>
                                <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(195,198,214,0.7)", marginBottom: "4px" }}>Balance</p>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#e0e2ed" }}>{formattedSellBalance}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(195,198,214,0.7)", marginBottom: "4px" }}>APY</p>
                                <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", fontWeight: 700, color: "#45dfa4" }}>{bond.apy}%</p>
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
                    style={{
                      background: "#181c23",
                      borderRadius: "12px",
                      padding: "32px",
                      minHeight: "400px",
                      opacity: expandForm ? 1 : 0,
                      transform: expandForm ? "translateX(0)" : "translateX(20px)",
                      transition: "opacity 0.3s ease-out, transform 0.3s ease-out"
                    }}
                  >
                    <div style={{ marginBottom: "28px" }}>
                      <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#e0e2ed", marginBottom: "4px" }}>Create Listing</h3>
                      <p style={{ fontSize: "12px", color: "#c3c6d6" }}>Set your price and list {selectedBondSell.symbol} for sale</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                      <div>
                        <label style={{ fontSize: "10px", color: "#c3c6d6", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                          Amount
                          <button onClick={() => setSellAmount(formattedSellBalance)} style={{ color: "#b3c5ff", background: "none", border: "none", cursor: "pointer", fontSize: "10px", textTransform: "none", fontWeight: 500 }}>
                            Max: {formattedSellBalance}
                          </button>
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={sellAmount}
                          onChange={(e) => setSellAmount(e.target.value)}
                          disabled={isSellLoading}
                          style={{
                            background: "#0a0e16",
                            border: "1px solid rgba(67,70,84,0.2)",
                            borderRadius: "8px",
                            padding: "16px",
                            color: "#e0e2ed",
                            fontSize: "14px",
                            fontWeight: 500,
                            width: "100%",
                            outline: "none",
                            opacity: isSellLoading ? 0.5 : 1,
                            transition: "border-color 0.2s"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "rgba(179,197,255,0.5)"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "rgba(67,70,84,0.2)"}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "10px", color: "#c3c6d6", marginBottom: "10px", display: "block", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Price per Token (USDC)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={sellPrice}
                          onChange={(e) => setSellPrice(e.target.value)}
                          disabled={isSellLoading}
                          style={{
                            background: "#0a0e16",
                            border: "1px solid rgba(67,70,84,0.2)",
                            borderRadius: "8px",
                            padding: "16px",
                            color: "#e0e2ed",
                            fontSize: "14px",
                            fontWeight: 500,
                            width: "100%",
                            outline: "none",
                            opacity: isSellLoading ? 0.5 : 1,
                            transition: "border-color 0.2s"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "rgba(179,197,255,0.5)"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "rgba(67,70,84,0.2)"}
                        />
                      </div>
                    </div>
                    {totalSellValue && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", background: "#0a0e16", borderRadius: "10px", marginBottom: "24px", border: "1px solid rgba(67,70,84,0.1)" }}>
                        <span style={{ fontSize: "12px", color: "#c3c6d6", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Total Value</span>
                        <span style={{ fontFamily: "Manrope, sans-serif", fontSize: "20px", fontWeight: 800, color: "#e0e2ed" }}>${totalSellValue}</span>
                      </div>
                    )}

                    {isSellLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "rgba(179,197,255,0.08)", borderRadius: "10px", marginBottom: "20px", border: "1px solid rgba(179,197,255,0.2)" }}>
                        <Loader2 style={{ width: "16px", height: "16px", color: "#b3c5ff" }} className="animate-spin" />
                        <span style={{ fontSize: "13px", color: "#b3c5ff", fontWeight: 500 }}>
                          {sellStep === "approving_bond" ? "Approving bond tokens..." : "Creating listing..."}
                        </span>
                      </div>
                    )}

                    {sellStep === "done" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "rgba(69,223,164,0.08)", borderRadius: "10px", marginBottom: "20px", border: "1px solid rgba(69,223,164,0.2)" }}>
                        <CheckCircle style={{ width: "16px", height: "16px", color: "#45dfa4" }} />
                        <span style={{ fontSize: "13px", color: "#45dfa4", fontWeight: 500 }}>Listing created successfully!</span>
                      </div>
                    )}
                    <button
                      onClick={handleCreateListing}
                      disabled={isSellLoading || !sellAmount || !sellPrice}
                      style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
                        color: "#001849",
                        borderRadius: "8px",
                        padding: "16px",
                        fontSize: "14px",
                        fontWeight: 700,
                        border: "none",
                        cursor: (isSellLoading || !sellAmount || !sellPrice) ? "not-allowed" : "pointer",
                        opacity: (isSellLoading || !sellAmount || !sellPrice) ? 0.4 : 1,
                        transition: "transform 0.15s, box-shadow 0.15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 4px 12px rgba(179,197,255,0.25)"
                      }}
                      onMouseEnter={(e) => { if (!isSellLoading && sellAmount && sellPrice) e.currentTarget.style.boxShadow = "0 6px 16px rgba(179,197,255,0.35)"; }}
                      onMouseLeave={(e) => { if (!isSellLoading && sellAmount && sellPrice) e.currentTarget.style.boxShadow = "0 4px 12px rgba(179,197,255,0.25)"; }}
                      onMouseDown={(e) => { if (!isSellLoading && sellAmount && sellPrice) e.currentTarget.style.transform = "scale(0.95)"; }}
                      onMouseUp={(e) => { if (!isSellLoading && sellAmount && sellPrice) e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      {isSellLoading ? (
                        <><Loader2 style={{ width: "16px", height: "16px" }} className="animate-spin" />{sellStep === "approving_bond" ? "Approving..." : "Creating..."}</>
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#0c1018", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <h3 className="font-semibold" style={{ color: "#e8ecf4" }}>Buy {activeListing.bond_symbol}</h3>
                <p className="text-sm mt-0.5" style={{ color: "#8896b3" }}>
                  {activeListing.amount} tokens · ${(activeListing.amount * activeListing.price_per_token).toFixed(2)} USDC
                </p>
              </div>
              {buyStep !== "buying" && buyStep !== "done" && (
                <button onClick={() => { setActiveListing(null); setBuyStep("idle"); }} style={{ color: "#4f5f7a" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#e8ecf4"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#4f5f7a"}>
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
                      border: `1px solid ${usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? "#34d399" : "#4c7df4"}`,
                      background: usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? "rgba(52,211,153,0.15)" : "rgba(76,125,244,0.15)",
                      color: usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? "#34d399" : "#8eb4fb",
                    }}>
                    {usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? <CheckCircle className="h-3 w-3" /> : "1"}
                  </div>
                  <span style={{ color: usdcApproveSuccess || buyStep === "buying" || buyStep === "done" ? "#34d399" : "#4c7df4" }}>
                    Approve USDC
                  </span>
                </div>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      border: `1px solid ${buyStep === "done" ? "#34d399" : buyStep === "buying" ? "#4c7df4" : "rgba(255,255,255,0.12)"}`,
                      background: buyStep === "done" ? "rgba(52,211,153,0.15)" : buyStep === "buying" ? "rgba(76,125,244,0.15)" : "transparent",
                      color: buyStep === "done" ? "#34d399" : "#8eb4fb",
                    }}>
                    {buyStep === "done" ? <CheckCircle className="h-3 w-3" /> : "2"}
                  </div>
                  <span style={{ color: buyStep === "done" ? "#34d399" : buyStep === "buying" ? "#4c7df4" : "#4f5f7a" }}>
                    Atomic Trade
                  </span>
                </div>
              </div>

              {buyStep === "done" ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(52,211,153,0.1)" }}>
                    <CheckCircle className="h-8 w-8" style={{ color: "#34d399" }} />
                  </div>
                  <h4 className="text-lg font-semibold mb-1" style={{ color: "#e8ecf4" }}>Trade Complete!</h4>
                  <p className="text-sm mb-1" style={{ color: "#8896b3" }}>
                    {activeListing.amount} {activeListing.bond_symbol} tokens are now in your wallet.
                  </p>
                  <p className="text-xs mb-5" style={{ color: "#4f5f7a" }}>
                    USDC was sent to the seller atomically in the same transaction.
                  </p>
                  {buyListingTxHash && (
                    <a href={`https://sepolia.basescan.org/tx/${buyListingTxHash}`} target="_blank" rel="noopener noreferrer"
                      className="block text-xs mb-4" style={{ color: "#4c7df4" }}>
                      View atomic trade details ↗
                    </a>
                  )}
                  <button onClick={() => { setActiveListing(null); setBuyStep("idle"); }}
                    className="px-6 py-2.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
                    style={{ background: "#4c7df4" }}>
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Escrow protection notice */}
                  <div className="rounded-lg p-3" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.12)" }}>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#34d399" }} />
                      <p className="text-xs" style={{ color: "#5a7a65" }}>
                        Step 1 approves USDC. Step 2 atomically transfers USDC to the seller and bonds to you in a single on-chain transaction — you cannot lose USDC without receiving bonds.
                      </p>
                    </div>
                  </div>

                  {/* Trade summary */}
                  <div className="rounded-lg p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#4f5f7a" }}>You pay</span>
                      <span className="font-semibold" style={{ color: "#e8ecf4" }}>
                        ${(activeListing.amount * activeListing.price_per_token).toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#4f5f7a" }}>You receive</span>
                      <span className="font-semibold" style={{ color: "#34d399" }}>
                        {activeListing.amount} {activeListing.bond_symbol} tokens
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "#4f5f7a" }}>Seller</span>
                      <span className="font-mono" style={{ color: "#4f5f7a" }}>
                        {activeListing.seller_wallet.slice(0, 6)}...{activeListing.seller_wallet.slice(-4)}
                      </span>
                    </div>
                  </div>

                  {/* Status indicator */}
                  {(buyStep === "approving_usdc" || buyStep === "buying") && (
                    <div className="flex items-center gap-2.5 p-3 rounded-lg"
                      style={{ background: "rgba(76,125,244,0.08)", border: "1px solid rgba(76,125,244,0.15)" }}>
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" style={{ color: "#4c7df4" }} />
                      <p className="text-xs" style={{ color: "#8eb4fb" }}>
                        {buyStep === "approving_usdc"
                          ? (usdcApprovePending ? "Confirm USDC approval in your wallet..." : "Confirming approval...")
                          : (buyListingPending ? "Confirm atomic trade in your wallet..." : "Executing atomic trade on-chain...")}
                      </p>
                    </div>
                  )}

                  {usdcApproveTxHash && (
                    <a href={`https://sepolia.basescan.org/tx/${usdcApproveTxHash}`} target="_blank" rel="noopener noreferrer"
                      className="block text-center text-xs" style={{ color: "#4c7df4" }}>
                      USDC approval tx ↗
                    </a>
                  )}
                  {buyListingTxHash && (
                    <a href={`https://sepolia.basescan.org/tx/${buyListingTxHash}`} target="_blank" rel="noopener noreferrer"
                      className="block text-center text-xs" style={{ color: "#4c7df4" }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#05080f" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#4c7df4" }} />
      </div>
    }>
      <SecondaryPageContent />
    </Suspense>
  );
}
