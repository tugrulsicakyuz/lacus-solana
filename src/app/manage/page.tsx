"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, TrendingUp, Loader2, Info, Wallet } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAccount, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS, BOND_TOKEN_ABI } from "@/config/contracts";

const baseScanUrl = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;

type FlowState = 'idle' | 'approving' | 'approved' | 'depositing' | 'done';

interface Bond {
  id: number; issuer_name: string; symbol: string; apy: number; price_per_token: number;
  maturity_months: number; contract_address?: string; total_issue_size: number;
}
interface HoldingRow { id: number; wallet_address: string; bond_symbol: string; balance: number; unclaimed_yield: number; }

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function ManagePage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [yieldInputs, setYieldInputs] = useState<Record<string, string>>({});
  const [flowStates, setFlowStates] = useState<Map<string, FlowState>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Web3 hooks
  const publicClient = usePublicClient();
  const { writeContract: writeApproval, data: approvalTxHash } = useWriteContract();
  const { isSuccess: isApprovalConfirmed, isError: isApprovalFailed } = useWaitForTransactionReceipt({ hash: approvalTxHash });
  const [pendingApprovalSymbol, setPendingApprovalSymbol] = useState<string | null>(null);
  const { writeContract: writeDeposit, data: depositTxHash } = useWriteContract();
  const { isSuccess: isDepositConfirmed, isError: isDepositFailed } = useWaitForTransactionReceipt({ hash: depositTxHash });
  const [pendingDepositSymbol, setPendingDepositSymbol] = useState<string | null>(null);
  const [pendingDepositAmount, setPendingDepositAmount] = useState<number>(0);

  // Flow state helpers
  const getFlow = (symbol: string): FlowState => flowStates.get(symbol) ?? 'idle';
  const setFlow = (symbol: string, state: FlowState) => {
    setFlowStates(prev => new Map(prev).set(symbol, state));
  };

  // Approval confirmed → move to 'approved' state
  useEffect(() => {
    if (!isApprovalConfirmed || !pendingApprovalSymbol) return;
    toast.success("✅ USDC approved! Now click 'Deposit Yield'.", { id: "approve-confirm" });
    setFlow(pendingApprovalSymbol, 'approved');
    setPendingApprovalSymbol(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprovalConfirmed]);

  // Approval tx failed on-chain → reset flow
  useEffect(() => {
    if (!isApprovalFailed || !pendingApprovalSymbol) return;
    toast.error("Approval transaction failed. Please try again.", { id: "approve-confirm" });
    setFlow(pendingApprovalSymbol, 'idle');
    setPendingApprovalSymbol(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprovalFailed]);

  useEffect(() => {
    if (!isDepositFailed || !pendingDepositSymbol) return;
    toast.error("Yield deposit transaction failed on-chain. Please try again.", { id: "deposit-confirm" });
    setFlow(pendingDepositSymbol, 'idle');
    setPendingDepositSymbol(null);
    setPendingDepositAmount(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDepositFailed]);

  // Sync yield to DB only after tx is confirmed on-chain
  useEffect(() => {
    if (!isDepositConfirmed || !pendingDepositSymbol) return;
    const bondSymbol = pendingDepositSymbol;
    const depositAmount = pendingDepositAmount;
    (async () => {
      const { data: holdings } = await supabase
        .from("user_holdings")
        .select("*")
        .eq("bond_symbol", bondSymbol);
      if (holdings && holdings.length > 0) {
        for (const holding of holdings) {
          const yieldShare = depositAmount * holding.balance;
          const { error: yieldUpdateError } = await supabase
            .from("user_holdings")
            .update({ unclaimed_yield: holding.unclaimed_yield + yieldShare })
            .eq("id", holding.id);
          if (yieldUpdateError) {
            console.error(`Failed to update yield for holding id=${holding.id}:`, yieldUpdateError);
          }
        }
      }
      toast.success(
        <span>✅ Yield distributed! <a href={baseScanUrl(depositTxHash!)} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 hover:text-blue-300">View transaction details →</a></span>,
        { id: "deposit-confirm" }
      );
      setFlow(bondSymbol, 'done');
      setYieldInputs(prev => ({ ...prev, [bondSymbol]: "" }));
      setPendingDepositSymbol(null);
      setPendingDepositAmount(0);
      setTimeout(() => setFlow(bondSymbol, 'idle'), 2000);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDepositConfirmed]);

  // Fetch bonds
  useEffect(() => {
    async function fetchBonds() {
      if (!address) {
        setBonds([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("bonds")
        .select("*")
        .eq("issuer_wallet", address.toLowerCase())
        .order("id", { ascending: true });

      if (error) {
        console.error("Failed to fetch bonds:", error);
        toast.error("Failed to load bonds");
      } else {
        setBonds(data as Bond[]);
      }
      setLoading(false);
    }
    fetchBonds();
  }, [address]);

  // Handle approve button click
  const handleApprove = async (bondSymbol: string) => {
    if (getFlow(bondSymbol) !== 'idle') return;

    const bond = bonds.find(b => b.symbol === bondSymbol);
    if (!bond || !bond.contract_address) {
      toast.error("Bond contract address not found");
      return;
    }

    const inputAmount = parseFloat(yieldInputs[bondSymbol] || "0");
    if (!inputAmount || inputAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setFlow(bondSymbol, 'approving');

    // Fetch total sold tokens to calculate total yield amount
    const { data: holdings } = await supabase
      .from("user_holdings")
      .select("balance")
      .eq("bond_symbol", bondSymbol);

    const totalSold = holdings ? holdings.reduce((sum, h) => sum + h.balance, 0) : 0;
    const totalYieldUSDC = parseUnits((inputAmount * totalSold).toString(), 6);

    writeApproval(
      {
        address: CONTRACTS.mockUSDC.address,
        abi: CONTRACTS.mockUSDC.abi,
        functionName: "approve",
        args: [bond.contract_address as `0x${string}`, totalYieldUSDC],
      },
      {
        onSuccess: () => {
          toast.loading("Waiting for approval confirmation...", { id: "approve-confirm" });
          setPendingApprovalSymbol(bondSymbol);
        },
        onError: (error) => {
          console.error("Approval error:", error);
          toast.error("Approval failed: " + error.message);
          setFlow(bondSymbol, 'idle');
        },
      }
    );
  };

  // Handle deposit button click with simulation
  const handleDeposit = async (bondSymbol: string) => {
    if (getFlow(bondSymbol) !== 'approved') return;

    const bond = bonds.find(b => b.symbol === bondSymbol);
    if (!bond || !bond.contract_address) {
      toast.error("Bond contract address not found");
      return;
    }

    const inputAmount = parseFloat(yieldInputs[bondSymbol] || "0");
    if (!inputAmount || inputAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!address || !publicClient) {
      toast.error("Wallet not connected");
      return;
    }

    setFlow(bondSymbol, 'depositing');

    // Fetch total sold tokens to calculate total yield amount
    const { data: holdings } = await supabase
      .from("user_holdings")
      .select("balance")
      .eq("bond_symbol", bondSymbol);

    const totalSold = holdings ? holdings.reduce((sum, h) => sum + h.balance, 0) : 0;
    const totalYieldUSDC = parseUnits((inputAmount * totalSold).toString(), 6);

    try {
      // Simulate the transaction first to catch exact revert reason
      await publicClient.simulateContract({
        address: bond.contract_address as `0x${string}`,
        abi: BOND_TOKEN_ABI,
        functionName: "depositYield",
        args: [totalYieldUSDC],
        account: address,
      });

      // If simulation passes, execute the real transaction
      writeDeposit(
        {
          address: bond.contract_address as `0x${string}`,
          abi: BOND_TOKEN_ABI,
          functionName: "depositYield",
          args: [totalYieldUSDC],
        },
        {
          onSuccess: () => {
            toast.loading("Waiting for deposit confirmation...", { id: "deposit-confirm" });
            setPendingDepositSymbol(bondSymbol);
            setPendingDepositAmount(inputAmount);
          },
          onError: (error) => {
            console.error("Deposit error:", error);
            toast.error("Yield deposit failed: " + error.message);
            setFlow(bondSymbol, 'idle');
          },
        }
      );
    } catch (error: any) {
      console.error("Simulation failed:", error);
      const errorMessage = error?.shortMessage || error?.message || "Unknown simulation error";
      toast.error("Simulation failed: " + errorMessage);
      setFlow(bondSymbol, 'idle');
    }
  };

  // Determine button state for each bond based on flow state machine
  const getButtonState = (bondSymbol: string) => {
    const bond = bonds.find(b => b.symbol === bondSymbol);
    if (!bond?.contract_address) return { text: "No Address", disabled: true, action: () => {} };

    const inputAmount = parseFloat(yieldInputs[bondSymbol] || "0");
    if (!inputAmount || inputAmount <= 0) {
      return { text: "Enter Amount", disabled: true, action: () => {} };
    }

    const flow = getFlow(bondSymbol);

    switch (flow) {
      case 'idle':
        return {
          text: "Approve USDC",
          disabled: false,
          action: () => handleApprove(bondSymbol),
        };
      case 'approving':
        return {
          text: "Approving...",
          disabled: true,
          action: () => {},
        };
      case 'approved':
        return {
          text: "Deposit Yield",
          disabled: false,
          action: () => handleDeposit(bondSymbol),
        };
      case 'depositing':
        return {
          text: "Depositing...",
          disabled: true,
          action: () => {},
        };
      case 'done':
        return {
          text: "✓ Done",
          disabled: true,
          action: () => {},
        };
    }
  };

  // Set input value
  const handleInputChange = (bondSymbol: string, value: string) => {
    setYieldInputs(prev => ({ ...prev, [bondSymbol]: value }));
  };

  if (!mounted) {
    return (
      <section style={{ background: "#10131b", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px" }}>
        <Loader2 style={{ width: "32px", height: "32px", color: "#b3c5ff" }} className="animate-spin" />
      </section>
    );
  }

  if (!isConnected) {
    return (
      <section style={{ background: "#10131b", minHeight: "100vh", paddingTop: "120px", paddingBottom: "48px" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", background: "#181c23", borderRadius: "12px", textAlign: "center" }}>
            <Wallet style={{ width: "56px", height: "56px", color: "#b3c5ff", marginBottom: "20px", opacity: 0.5 }} />
            <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "20px", fontWeight: 700, color: "#e0e2ed", marginBottom: "8px" }}>Connect Your Wallet</h3>
            <p style={{ fontSize: "14px", color: "#c3c6d6", marginBottom: "24px" }}>Connect your wallet to manage your issued bonds and distribute yield</p>
            <ConnectButton />
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section style={{ background: "#10131b", minHeight: "100vh", paddingTop: "120px", paddingBottom: "48px" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "12px" }}>
            <Loader2 style={{ width: "20px", height: "20px", color: "#b3c5ff" }} className="animate-spin" />
            <span style={{ fontSize: "14px", color: "#c3c6d6" }}>Loading bonds...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: "#10131b", minHeight: "100vh", paddingTop: "120px", paddingBottom: "48px" }}>
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 32px" }}>
        
        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#c3c6d6", fontWeight: 500, marginBottom: "8px" }}>Issuer Dashboard</p>
          <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "36px", fontWeight: 800, color: "#e0e2ed", letterSpacing: "-0.02em", marginBottom: "8px" }}>Manage Offerings</h1>
          <p style={{ fontSize: "14px", color: "#8d909f" }}>Distribute yield to bondholders and manage your debt obligations</p>
        </div>

        {bonds.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center", background: "#181c23", borderRadius: "12px" }}>
            <Shield style={{ width: "56px", height: "56px", color: "#434654", marginBottom: "20px", opacity: 0.4 }} />
            <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#e0e2ed", marginBottom: "8px" }}>No bonds issued yet</h3>
            <p style={{ fontSize: "14px", color: "#c3c6d6" }}>This wallet hasn't issued any bonds</p>
          </div>
        ) : (
          <div>
            {/* Bonds Table */}
            <div style={{ background: "#181c23", borderRadius: "12px", overflow: "hidden", marginBottom: "32px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(67,70,84,0.2)" }}>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Bond</th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>APY</th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Price</th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Maturity</th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c3c6d6" }}>Yield Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {bonds.map((bond) => {
                    const flow = getFlow(bond.symbol);
                    const btnState = getButtonState(bond.symbol);
                    return (
                      <tr key={bond.id} style={{ borderBottom: "1px solid rgba(67,70,84,0.1)" }}>
                        {/* Bond Column */}
                        <td style={{ padding: "20px 24px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: flow === 'done' ? "#00bd85" : flow === 'approved' ? "#b3c5ff" : "#434654", flexShrink: 0 }} />
                            <div>
                              <Link href={`/bond/${bond.symbol}`} style={{ textDecoration: "none" }}>
                                <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, color: "#e0e2ed", marginBottom: "2px" }}>{bond.symbol}</p>
                              </Link>
                              <p style={{ fontSize: "12px", color: "#8d909f" }}>{bond.issuer_name}</p>
                            </div>
                          </div>
                        </td>

                        {/* APY Column */}
                        <td style={{ padding: "20px 24px" }}>
                          <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 600, color: "#00bd85" }}>{bond.apy}%</p>
                        </td>

                        {/* Price Column */}
                        <td style={{ padding: "20px 24px" }}>
                          <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 600, color: "#e0e2ed" }}>{fmtCurrency(bond.price_per_token)}</p>
                        </td>

                        {/* Maturity Column */}
                        <td style={{ padding: "20px 24px" }}>
                          <p style={{ fontSize: "13px", color: "#c3c6d6" }}>{bond.maturity_months} months</p>
                        </td>

                        {/* Yield Distribution Column */}
                        <td style={{ padding: "20px 24px" }}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", minWidth: "320px" }}>
                            <input
                              type="number" min="0" step="0.01" placeholder="0.00"
                              value={yieldInputs[bond.symbol] || ""}
                              onChange={(e) => handleInputChange(bond.symbol, e.target.value)}
                              disabled={flow !== 'idle'}
                              style={{
                                flex: 1,
                                padding: "10px 14px",
                                borderRadius: "6px",
                                background: "#0a0e16",
                                border: "1px solid rgba(67,70,84,0.2)",
                                color: "#e0e2ed",
                                fontSize: "13px",
                                outline: "none",
                                opacity: flow !== 'idle' ? 0.5 : 1
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(179,197,255,0.5)"; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(67,70,84,0.2)"; }}
                            />
                            <button
                              onClick={() => btnState.action()}
                              disabled={btnState.disabled}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "10px 18px",
                                borderRadius: "6px",
                                background: flow === 'approved' ? "linear-gradient(135deg, #00e0a1 0%, #00bd85 100%)" : "linear-gradient(135deg, #b3c5ff 0%, #5e8bff 100%)",
                                color: flow === 'approved' ? "#00291a" : "#001849",
                                fontSize: "12px",
                                fontWeight: 700,
                                fontFamily: "Manrope, sans-serif",
                                border: "none",
                                cursor: btnState.disabled ? "not-allowed" : "pointer",
                                opacity: btnState.disabled ? 0.4 : 1,
                                whiteSpace: "nowrap",
                                boxShadow: btnState.disabled ? "none" : flow === 'approved' ? "0 4px 12px rgba(0,189,133,0.15)" : "0 4px 12px rgba(179,197,255,0.15)"
                              }}
                            >
                              {['approving', 'depositing'].includes(flow) ? (
                                <><Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" />{btnState.text}</>
                              ) : (
                                btnState.text
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Info box */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", padding: "20px 24px", borderRadius: "12px", background: "rgba(179,197,255,0.05)", border: "1px solid rgba(179,197,255,0.1)" }}>
              <Info style={{ width: "18px", height: "18px", flexShrink: 0, marginTop: "2px", color: "#b3c5ff" }} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#e0e2ed", marginBottom: "6px" }}>How Yield Distribution Works</p>
                <p style={{ fontSize: "13px", color: "#8d909f", lineHeight: "1.6" }}>
                  Enter the USDC amount per token. The system automatically calculates and distributes
                  yield proportionally to all investors based on their balances.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
