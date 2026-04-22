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
      <section className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--lilac)]" />
      </section>
    );
  }

  if (!isConnected) {
    return (
      <section className="min-h-screen pt-20 pb-12">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="card-luminous rounded-2xl flex flex-col items-center justify-center py-20 px-5 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--lilac)]/10">
              <Wallet className="h-7 w-7 text-[var(--lilac)]" />
            </div>
            <h3 className="font-display text-[var(--ink)] text-xl mb-2">Connect Your Wallet</h3>
            <p className="text-sm text-[var(--ink3)] max-w-md mb-6">Connect your wallet to manage your issued bonds and distribute yield</p>
            <ConnectButton />
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="min-h-screen pt-20 pb-12">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--lilac)]" />
            <span className="text-sm text-[var(--ink3)]">Loading bonds...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen pt-28 pb-12">
      <div className="max-w-[1440px] mx-auto px-8">
        
        {/* Header */}
        <div className="mb-12">
          <p className="eyebrow eyebrow-rule mb-2">Issuer Dashboard</p>
          <h1 className="font-display text-[var(--ink)] text-[2.25rem] mb-2">Manage Offerings</h1>
          <p className="text-sm text-[var(--ink3)]">Distribute yield to bondholders and manage your debt obligations</p>
        </div>

        {/* Issue New Bond Card */}
        <Link
          href="/manage/issue"
          className="block mb-8 card-luminous rounded-2xl p-6 hover:border-[var(--lilac)] transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--lilac)]/10 group-hover:bg-[var(--lilac)]/20 transition-colors">
                <TrendingUp className="h-6 w-6 text-[var(--lilac)]" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[var(--ink)] mb-1">Issue New Bond on Solana</h3>
                <p className="text-sm text-[var(--ink3)]">Create a new tokenized bond and deploy to Solana devnet</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--lilac)] opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Get Started</span>
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </Link>

        {bonds.length === 0 ? (
          <div className="card-luminous rounded-2xl flex flex-col items-center justify-center py-20 px-5 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--rule)]/40">
              <Shield className="h-7 w-7 text-[var(--ink4)]" />
            </div>
            <h3 className="font-display text-[var(--ink)] text-lg mb-2">No bonds issued yet</h3>
            <p className="text-sm text-[var(--ink3)]">This wallet hasn't issued any bonds</p>
          </div>
        ) : (
          <div>
            {/* Bonds Table */}
            <div className="card-luminous rounded-2xl overflow-hidden mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--rule)]">
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Bond</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">APY</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Price</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Maturity</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Yield Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {bonds.map((bond) => {
                    const flow = getFlow(bond.symbol);
                    const btnState = getButtonState(bond.symbol);
                    return (
                      <tr key={bond.id} className="ledger-row">
                        {/* Bond Column */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: flow === 'done' ? "var(--aqua)" : flow === 'approved' ? "var(--lilac)" : "var(--rule)" }}
                            />
                            <div>
                              <Link href={`/bond/${bond.symbol}`} className="font-semibold text-sm text-[var(--ink)] hover:text-[var(--lilac)] transition-colors">
                                {bond.symbol}
                              </Link>
                              <p className="text-xs text-[var(--ink4)] mt-0.5">{bond.issuer_name}</p>
                            </div>
                          </div>
                        </td>

                        {/* APY Column */}
                        <td className="px-6 py-5">
                          <p className="font-semibold text-sm text-[var(--aqua)]">{bond.apy}%</p>
                        </td>

                        {/* Price Column */}
                        <td className="px-6 py-5">
                          <p className="font-semibold text-sm text-[var(--ink)]">{fmtCurrency(bond.price_per_token)}</p>
                        </td>

                        {/* Maturity Column */}
                        <td className="px-6 py-5">
                          <p className="text-sm text-[var(--ink3)]">{bond.maturity_months} months</p>
                        </td>

                        {/* Yield Distribution Column */}
                        <td className="px-6 py-5">
                          <div className="flex gap-2 items-center min-w-[320px]">
                            <input
                              type="number" min="0" step="0.01" placeholder="0.00"
                              value={yieldInputs[bond.symbol] || ""}
                              onChange={(e) => handleInputChange(bond.symbol, e.target.value)}
                              disabled={flow !== 'idle'}
                              className="flex-1 bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors disabled:cursor-not-allowed"
                              style={{ opacity: flow !== 'idle' ? 0.5 : 1 }}
                            />
                            <button
                              onClick={() => btnState.action()}
                              disabled={btnState.disabled}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "10px 18px",
                                borderRadius: "8px",
                                background: flow === 'approved' ? "linear-gradient(135deg, var(--aqua) 0%, #00bd85 100%)" : "linear-gradient(135deg, var(--lilac) 0%, #5e8bff 100%)",
                                color: flow === 'approved' ? "#00291a" : "#001849",
                                fontSize: "12px",
                                fontWeight: 700,
                                border: "none",
                                cursor: btnState.disabled ? "not-allowed" : "pointer",
                                opacity: btnState.disabled ? 0.4 : 1,
                                whiteSpace: "nowrap",
                                boxShadow: btnState.disabled ? "none" : flow === 'approved' ? "0 4px 12px rgba(0,189,133,0.15)" : "0 4px 12px rgba(179,197,255,0.15)"
                              }}
                            >
                              {['approving', 'depositing'].includes(flow) ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" />{btnState.text}</>
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
            <div className="flex items-start gap-4 rounded-xl px-6 py-5 bg-[var(--lilac)]/5 border border-[var(--lilac)]/10">
              <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-[var(--lilac)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">How Yield Distribution Works</p>
                <p className="text-sm text-[var(--ink4)] leading-relaxed">
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
