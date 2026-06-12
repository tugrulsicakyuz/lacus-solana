"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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

            const faceValueSOL = Number(bond.faceValue) / 1_000_000_000;
            const maxSupplyNum = Number(bond.maxSupply);
            const totalRaise = faceValueSOL * maxSupplyNum;

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
              price_per_token: faceValueSOL,
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
      // Convert SOL to lamports
      const amountInLamports = Math.floor(amount * 1_000_000_000);
      const tx = await depositYield(bondId, amountInLamports);

      toast.success('Yield deposited successfully!', {
        description: `Deposited ${amount} SOL`,
      });

      // Clear the input
      setYieldAmounts(prev => ({ ...prev, [bondId]: '' }));
    } catch (error) {
      console.error('Deposit yield failed:', error);
      toast.error('Failed to deposit yield', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDepositingYield(null);
    }
  };

  return (
    <div>
      <div className="lx-wrap">
        <div className="lx-pagehead">
          <div className="lx-kicker">Manage · Borrower view</div>
          <h1>Your obligations, in plain sight.</h1>
          <p className="lx-lede">
            Your payment record is your credit rating. Fund coupons on time and every future
            lender sees it before they subscribe.
          </p>
        </div>

        <div className="lx-statement">
          <h3 className="lx-subhead">
            Your issues{!loading && bonds.length > 0 && <span className="mgmt-count num"> · {bonds.length}</span>}
          </h3>
          <div className="lx-drule"></div>

          {loading ? (
            <div className="lx-loading">
              <Loader2 size={14} className="animate-spin" />
              <span>LOADING INSTRUMENTS...</span>
            </div>
          ) : bonds.length === 0 ? (
            <div className="lx-empty">
              <p>You have not issued a bond yet. Draft your first term sheet.</p>
              <Link href="/manage/issue" className="lx-btn lx-btn-ghost lx-btn-sm">Issue a bond</Link>
            </div>
          ) : (
            <div className="lx-scroll">
              <table className="lx-table">
                <thead>
                  <tr>
                    <th>Bond</th>
                    <th>Issuer</th>
                    <th className="r">Coupon</th>
                    <th className="r">Face value</th>
                    <th className="r">Maturity</th>
                    <th className="r">Size</th>
                    <th className="r">Pay yield</th>
                  </tr>
                </thead>
                <tbody>
                  {bonds.map((bond) => (
                    <tr key={bond.id}>
                      <td>
                        <Link href={`/bond/${bond.symbol}`} className="lx-sym mgmt-link">
                          {bond.symbol}
                        </Link>
                      </td>
                      <td><span className="lx-issuer" style={{ marginTop: 0 }}>{bond.issuer_name}</span></td>
                      <td className="r num">{bond.apy}%</td>
                      <td className="r num">{bond.price_per_token.toFixed(4)} SOL</td>
                      <td className="r num">{bond.maturity_months} mo</td>
                      <td className="r num">{bond.total_issue_size.toFixed(4)} SOL</td>
                      <td className="r">
                        {bond.source === 'onchain' ? (
                          <div className="mgmt-deposit-row">
                            <input
                              type="number"
                              placeholder="SOL"
                              value={yieldAmounts[bond.bondId!] || ''}
                              onChange={(e) => setYieldAmounts(prev => ({ ...prev, [bond.bondId!]: e.target.value }))}
                              className="lx-input-sm num"
                            />
                            <button
                              onClick={() => handleDepositYield(bond.bondId!, parseFloat(yieldAmounts[bond.bondId!] || '0'))}
                              disabled={depositingYield === bond.bondId}
                              className="lx-btn lx-btn-ghost lx-btn-sm"
                            >
                              {depositingYield === bond.bondId
                                ? <Loader2 size={11} className="animate-spin" />
                                : 'PAY'}
                            </button>
                          </div>
                        ) : (
                          <span className="num" style={{ color: "var(--ink-3)" }}>--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="lx-inkband" style={{ marginTop: 96 }}>
        <div className="lx-wrap lx-ctaband">
          <div>
            <h2>Raise your next round of debt.</h2>
            <p>Your on-time record is portable. It follows you to the next raise.</p>
          </div>
          <Link href="/manage/issue" className="lx-btn">Issue a new bond</Link>
        </div>
      </div>
    </div>
  );
}
