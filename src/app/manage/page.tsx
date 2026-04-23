"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLacusProgram } from "@/hooks/useLacus";
import { useWallet } from "@solana/wallet-adapter-react";
import type { BondState } from "@/types/lacus";
import { toast } from "sonner";

interface Bond {
  id: number; issuer_name: string; symbol: string; apy: number; price_per_token: number;
  maturity_months: number; contract_address?: string; total_issue_size: number;
  bondId?: number; issuer?: string; source?: 'onchain' | 'supabase';
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function ManagePage() {
  const { connected } = useWallet();
  const { fetchMyBonds, depositYield } = useLacusProgram();
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositingYield, setDepositingYield] = useState<number | null>(null);
  const [yieldAmounts, setYieldAmounts] = useState<Record<number, string>>({});

  useEffect(() => {
    async function fetchBonds() {
      try {
        // Fetch from both on-chain and Supabase
        const [onChainBonds, supabaseResult] = await Promise.all([
          connected ? fetchMyBonds() : Promise.resolve([]),
          supabase.from("bonds").select("*").order("id", { ascending: false })
        ]);

        const { data: supabaseData, error } = supabaseResult;

        if (error) {
          console.error("Failed to fetch Supabase bonds:", error);
        }

        // Merge on-chain and Supabase bonds
        const mergedBonds: Bond[] = [];
        const seenBondIds = new Set<number>();

        // Add on-chain bonds first
        if (onChainBonds && onChainBonds.length > 0) {
          onChainBonds.forEach((bond: BondState) => {
            const bondId = Number(bond.bondId);
            seenBondIds.add(bondId);
            
            // Try to find matching Supabase metadata
            const supabaseMeta = supabaseData?.find((s: { id: number }) => s.id === bondId);
            
            const faceValueUSDC = Number(bond.faceValue) / 1_000_000;
            const maxSupplyNum = Number(bond.maxSupply);
            const totalRaise = faceValueUSDC * maxSupplyNum;
            
            // Calculate maturity in months
            const now = Math.floor(Date.now() / 1000);
            const maturitySeconds = Number(bond.maturityTimestamp) - now;
            const maturityMonths = Math.max(0, Math.round(maturitySeconds / (30 * 24 * 60 * 60)));

            mergedBonds.push({
              id: bondId,
              bondId,
              issuer: bond.issuer.toString(),
              issuer_name: supabaseMeta?.issuer_name || bond.issuer.toString().slice(0, 8) + '...',
              symbol: bond.symbol || supabaseMeta?.symbol || `BOND-${bondId}`,
              apy: bond.couponRateBps / 100,
              price_per_token: faceValueUSDC,
              maturity_months: maturityMonths,
              total_issue_size: totalRaise,
              contract_address: bond.issuer.toString(),
              source: 'onchain',
            });
          });
        }

        // Add Supabase-only bonds (not found on-chain)
        if (supabaseData) {
          supabaseData.forEach((bond: any) => {
            if (!seenBondIds.has(bond.id)) {
              mergedBonds.push({
                ...bond,
                source: 'supabase',
              });
            }
          });
        }

        setBonds(mergedBonds);
      } catch (err) {
        console.error("Failed to fetch bonds:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBonds();
  }, [connected, fetchMyBonds]);

  const handleDepositYield = async (bondId: number, amount: number) => {
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setDepositingYield(bondId);
    try {
      // Convert to USDC with 6 decimals
      const amountInMicroUsdc = Math.floor(amount * 1_000_000);
      const tx = await depositYield(bondId, amountInMicroUsdc);
      
      toast.success('Yield deposited successfully!', {
        description: `Deposited ${amount} USDC`,
      });
      
      // Clear the input
      setYieldAmounts(prev => ({ ...prev, [bondId]: '' }));
    } catch (error: any) {
      console.error('Deposit yield failed:', error);
      toast.error('Failed to deposit yield', {
        description: error?.message || 'Unknown error',
      });
    } finally {
      setDepositingYield(null);
    }
  };

  return (
    <section className="min-h-screen pt-28 pb-12">
      <div className="max-w-[1440px] mx-auto px-8">
        
        {/* Header */}
        <div className="mb-12">
          <p className="eyebrow eyebrow-rule mb-2">Issuer Dashboard</p>
          <h1 className="font-display text-[var(--ink)] text-[2.25rem] mb-2">Manage Offerings</h1>
          <p className="text-sm text-[var(--ink3)]">View issued bonds and create new offerings on Solana</p>
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

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--lilac)]" />
            <span className="text-sm text-[var(--ink3)]">Loading bonds...</span>
          </div>
        ) : bonds.length === 0 ? (
          <div className="card-luminous rounded-2xl flex flex-col items-center justify-center py-20 px-5 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--rule)]/40">
              <Shield className="h-7 w-7 text-[var(--ink4)]" />
            </div>
            <h3 className="font-display text-[var(--ink)] text-lg mb-2">No bonds issued yet</h3>
            <p className="text-sm text-[var(--ink3)]">No bonds have been issued on Solana devnet</p>
          </div>
        ) : (
          <div className="card-luminous rounded-2xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--rule)]">
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Bond</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Issuer</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">APY</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Price</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Maturity</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Total Size</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink3)]">Pay Yield</th>
                </tr>
              </thead>
              <tbody>
                {bonds.map((bond) => (
                  <tr key={bond.id} className="ledger-row">
                    <td className="px-6 py-5">
                      <Link href={`/bond/${bond.symbol}`} className="font-semibold text-sm text-[var(--ink)] hover:text-[var(--lilac)] transition-colors">
                        {bond.symbol}
                      </Link>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-[var(--ink3)]">{bond.issuer_name}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-sm text-[var(--aqua)]">{bond.apy}%</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-sm text-[var(--ink)]">{fmtCurrency(bond.price_per_token)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-[var(--ink3)]">{bond.maturity_months} months</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-[var(--ink)]">{fmtCurrency(bond.total_issue_size)}</p>
                    </td>
                    <td className="px-6 py-5">
                      {bond.source === 'onchain' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="USDC"
                            value={yieldAmounts[bond.bondId!] || ''}
                            onChange={(e) => setYieldAmounts(prev => ({ ...prev, [bond.bondId!]: e.target.value }))}
                            className="w-24 bg-[var(--surface)] border border-[var(--rule)] rounded-lg px-2 py-1 text-xs text-[var(--ink)] outline-none focus:border-[var(--lilac)] transition-colors"
                          />
                          <button
                            onClick={() => handleDepositYield(bond.bondId!, parseFloat(yieldAmounts[bond.bondId!] || '0'))}
                            disabled={depositingYield === bond.bondId}
                            className="btn-ghost px-3 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {depositingYield === bond.bondId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pay'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--ink4)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
