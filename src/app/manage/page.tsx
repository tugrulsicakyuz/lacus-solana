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
      <div className="mgmt-root">

        {/* Hero */}
        <div className="mgmt-hero">
          <p className="mgmt-eyebrow">§ Issuer — Bond Management</p>
          <h1 className="mgmt-title">
            MAN<span style={{ color: 'var(--mgmt-rose)' }}>AGE.</span>
          </h1>
          <p className="mgmt-subtitle">View and manage your issued instruments on Solana.</p>
        </div>

        <div className="mgmt-body">

          {/* Issue New Bond card */}
          <Link href="/manage/issue" className="mgmt-issue-card">
            <div className="mgmt-issue-inner">
              <div className="mgmt-issue-left">
                <div className="mgmt-issue-icon">
                  <TrendingUp size={18} color="#fb7185" />
                </div>
                <div>
                  <div className="mgmt-issue-label">ISSUE NEW BOND</div>
                  <div className="mgmt-issue-desc">Deploy a tokenized instrument to Solana devnet</div>
                </div>
              </div>
              <div className="mgmt-issue-arrow">
                <span>GET STARTED</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </Link>

          {/* Table section */}
          <div className="mgmt-table-header">
            <span className="mgmt-table-title">ACTIVE INSTRUMENTS</span>
            {!loading && bonds.length > 0 && (
              <span className="mgmt-table-count">{bonds.length} TOTAL</span>
            )}
          </div>

          {loading ? (
            <div className="mgmt-loading">
              <Loader2 size={14} className="mgmt-spinner" />
              <span>LOADING INSTRUMENTS...</span>
            </div>
          ) : bonds.length === 0 ? (
            <div className="mgmt-empty">
              <Shield size={32} style={{ color: 'rgba(245,232,236,0.15)', marginBottom: 32 }} />
              <div className="mgmt-empty-title">NO INSTRUMENTS YET</div>
              <p className="mgmt-empty-sub">No bonds have been issued on Solana devnet</p>
              <Link href="/manage/issue" className="mgmt-empty-cta">Issue Your First Bond</Link>
            </div>
          ) : (
            <div className="mgmt-table-wrap">
              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>Bond</th>
                    <th>Issuer</th>
                    <th>APY</th>
                    <th>Price</th>
                    <th>Maturity</th>
                    <th>Total Size</th>
                    <th>Pay Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {bonds.map((bond) => (
                    <tr key={bond.id}>
                      <td>
                        <Link href={`/bond/${bond.symbol}`} className="mgmt-bond-symbol">
                          {bond.symbol}
                        </Link>
                      </td>
                      <td>
                        <span className="mgmt-cell-dim">{bond.issuer_name}</span>
                      </td>
                      <td>
                        <span className="mgmt-apy">{bond.apy}%</span>
                      </td>
                      <td>
                        <span className="mgmt-cell-ink">{bond.price_per_token.toFixed(4)} SOL</span>
                      </td>
                      <td>
                        <span className="mgmt-cell-dim">{bond.maturity_months} mo</span>
                      </td>
                      <td>
                        <span className="mgmt-cell-ink">{bond.total_issue_size.toFixed(4)} SOL</span>
                      </td>
                      <td>
                        {bond.source === 'onchain' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="number"
                              placeholder="SOL"
                              value={yieldAmounts[bond.bondId!] || ''}
                              onChange={(e) => setYieldAmounts(prev => ({ ...prev, [bond.bondId!]: e.target.value }))}
                              className="mgmt-input"
                            />
                            <button
                              onClick={() => handleDepositYield(bond.bondId!, parseFloat(yieldAmounts[bond.bondId!] || '0'))}
                              disabled={depositingYield === bond.bondId}
                              className="mgmt-pay-btn"
                            >
                              {depositingYield === bond.bondId
                                ? <Loader2 size={11} className="mgmt-spinner" />
                                : 'PAY'}
                            </button>
                          </div>
                        ) : (
                          <span className="mgmt-dash">—</span>
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
  );
}
