'use client';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useLacusProgram } from '@/hooks/useLacus';
import { useEffect, useState, useCallback } from 'react';
import { formatDate, formatSOL } from '@/lib/format';
import type { BondState } from '@/types/lacus';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  const { program, fetchPortfolioBonds, fetchMyBonds, claimYield, redeemBond, depositYield } = useLacusProgram();
  const [holdings, setHoldings] = useState<{ bond: BondState; balance: number; lastYieldSnapshot: number }[]>([]);
  const [issuedBonds, setIssuedBonds] = useState<BondState[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingClaim, setProcessingClaim] = useState<number | null>(null);
  const [processingRedeem, setProcessingRedeem] = useState<number | null>(null);
  const [processingDeposit, setProcessingDeposit] = useState<number | null>(null);
  const [yieldAmounts, setYieldAmounts] = useState<Record<number, string>>({});

  // ── Data fetching
  const fetchData = useCallback(async () => {
    if (!program || !connected || !publicKey) {
      setHoldings([]);
      setIssuedBonds([]);
      return;
    }
    setLoading(true);
    try {
      const [portfolioData, issuedData] = await Promise.all([
        fetchPortfolioBonds(),
        fetchMyBonds(),
      ]);
      setHoldings(portfolioData);
      setIssuedBonds(issuedData);
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setLoading(false);
    }
  }, [program, connected, publicKey, fetchPortfolioBonds, fetchMyBonds]);

  useEffect(() => {
    if (program && connected && publicKey) {
      fetchData();
    } else {
      setHoldings([]);
      setIssuedBonds([]);
    }
  }, [program, connected, publicKey, fetchData]);

  const handleClaimYield = async (bondId: number) => {
    setProcessingClaim(bondId);
    try {
      await claimYield(bondId);
      toast.success('Yield claimed!');
      await fetchData();
    } catch (error) {
      toast.error('Failed to claim yield', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setProcessingClaim(null);
    }
  };

  const handleRedeemBond = async (bondId: number) => {
    setProcessingRedeem(bondId);
    try {
      await redeemBond(bondId);
      toast.success('Bond redeemed! Principal returned.');
      await fetchData();
    } catch (error) {
      toast.error('Failed to redeem bond', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setProcessingRedeem(null);
    }
  };

  const handleDepositYield = async (bondId: number) => {
    const amount = parseFloat(yieldAmounts[bondId] || '0');
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setProcessingDeposit(bondId);
    try {
      const amountInLamports = Math.floor(amount * 1_000_000_000);
      await depositYield(bondId, amountInLamports);
      toast.success('Yield deposited successfully!', { description: `Deposited ${amount} SOL` });
      setYieldAmounts(prev => ({ ...prev, [bondId]: '' }));
      await fetchData();
    } catch (error) {
      toast.error('Failed to deposit yield', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setProcessingDeposit(null);
    }
  };

  // ── Not connected state
  if (!connected) {
    return (
      <div className="dash-root">
        <div className="dash-nc-center">
          <p className="dash-nc-eyebrow">§ Solana — Portfolio Layer</p>
          <h1 className="dash-nc-title">
            PORT<span style={{ color: 'var(--dash-violet)' }}>FOLIO</span>
          </h1>
          <p className="dash-nc-sub">Connect your Solana wallet to view your bond holdings and issued instruments.</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  // ── Connected state
  return (
    <div className="dash-root">

      {/* Hero */}
      <header className="dash-hero">
        <p className="dash-eyebrow">§ Solana — Portfolio Layer</p>
        <h1 className="dash-hero-title">
          PORT<span style={{ color: 'var(--dash-violet)' }}>FOLIO</span>
        </h1>
        <p className="dash-wallet-addr">
          {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
        </p>
      </header>

      {/* Body */}
      <main className="dash-body">
        {loading ? (
          <div className="dash-loading">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--dash-violet)' }} />
            Fetching instruments...
          </div>
        ) : (
          <>
            {/* Bond Holdings */}
            <section className="dash-section">
              <h2 className="dash-section-label">Bond Holdings</h2>

              {holdings.length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-dash">—</div>
                  <p className="dash-empty-label">No bond holdings yet</p>
                  <Link href="/launchpad" className="dash-empty-cta">Browse Bonds</Link>
                </div>
              ) : (
                <div className="dash-grid">
                  {holdings.map(({ bond, balance, lastYieldSnapshot }, index) => {
                    const faceValueSOL  = Number(bond.faceValue) / 1e9;
                    const totalValueSOL = faceValueSOL * balance;
                    const couponRate    = (bond.couponRateBps / 100).toFixed(2);
                    const isIssuer      = bond.issuer.toString() === publicKey?.toString();
                    const bondId        = Number(bond.bondId);
                    const now           = Math.floor(Date.now() / 1000);
                    const isMatured     = bond.isMatured || Number(bond.maturityTimestamp) <= now;
                    const totalYieldDeposited = Number(bond.totalYieldDeposited);
                    const hasClaimableYield   = totalYieldDeposited > lastYieldSnapshot;
                    const hasPrincipal        = bond.principalDeposited;

                    return (
                      <div key={index} className="dash-card">
                        {isIssuer && <div className="dash-card-issuer-badge">Issuer</div>}
                        <div className="dash-card-name">{bond.name}</div>
                        <div className="dash-card-symbol">{bond.symbol}</div>

                        <div style={{ marginBottom: '24px' }}>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Balance</span>
                            <span className="dash-stat-value">{balance.toLocaleString()} tokens</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Face Value</span>
                            <span className="dash-stat-value">{formatSOL(Number(bond.faceValue))} SOL</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Total Value</span>
                            <span className="dash-stat-value-violet">{totalValueSOL.toFixed(4)} SOL</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Coupon Rate</span>
                            <span className="dash-stat-value">{couponRate}%</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Maturity</span>
                            <span className="dash-stat-value">{formatDate(Number(bond.maturityTimestamp))}</span>
                          </div>
                        </div>

                        <hr className="dash-card-divider" />

                        <button
                          onClick={() => handleClaimYield(bondId)}
                          disabled={processingClaim === bondId || !hasClaimableYield}
                          title={
                            !hasClaimableYield
                              ? totalYieldDeposited === 0
                                ? 'No yield has been deposited yet'
                                : 'No new yield since your last claim'
                              : undefined
                          }
                          className="dash-btn-violet"
                        >
                          {processingClaim === bondId ? (
                            <><Loader2 size={12} className="animate-spin" style={{ marginRight: 8 }} />Claiming...</>
                          ) : hasClaimableYield ? (
                            'Claim Yield'
                          ) : totalYieldDeposited === 0 ? (
                            'No Yield Yet'
                          ) : (
                            'Yield Up to Date'
                          )}
                        </button>

                        {isMatured && hasPrincipal && (
                          <button
                            onClick={() => handleRedeemBond(bondId)}
                            disabled={processingRedeem === bondId}
                            className="dash-btn-ghost"
                          >
                            {processingRedeem === bondId ? (
                              <><Loader2 size={12} className="animate-spin" style={{ marginRight: 8 }} />Redeeming...</>
                            ) : (
                              'Redeem Bond'
                            )}
                          </button>
                        )}

                        {isMatured && !hasPrincipal && (
                          <div className="dash-notice-warn">
                            Awaiting principal deposit from issuer
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Bonds Issued */}
            {issuedBonds.length > 0 && (
              <section className="dash-section">
                <h2 className="dash-section-label">Bonds Issued</h2>
                <div className="dash-grid">
                  {issuedBonds.map((bond, index) => {
                    const soldPercentage =
                      Number(bond.maxSupply) > 0
                        ? (Number(bond.tokensSold) / Number(bond.maxSupply)) * 100
                        : 0;
                    const bondId = Number(bond.bondId);

                    return (
                      <div key={index} className="dash-card">
                        <div className="dash-card-name">{bond.name}</div>
                        <div className="dash-card-symbol">{bond.symbol}</div>

                        <div style={{ marginBottom: '24px' }}>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Tokens Sold</span>
                            <span className="dash-stat-value">
                              {Number(bond.tokensSold).toLocaleString()} / {Number(bond.maxSupply).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ padding: '8px 0' }}>
                            <div className="dash-progress-track">
                              <div
                                className="dash-progress-fill"
                                style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                              />
                            </div>
                            <p className="dash-progress-label">{soldPercentage.toFixed(1)}% sold</p>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Face Value</span>
                            <span className="dash-stat-value">{formatSOL(Number(bond.faceValue))} SOL</span>
                          </div>
                          <div className="dash-stat-row">
                            <span className="dash-stat-label">Coupon Rate</span>
                            <span className="dash-stat-value">{(bond.couponRateBps / 100).toFixed(2)}%</span>
                          </div>
                        </div>

                        <hr className="dash-card-divider" />

                        <p className="dash-stat-label" style={{ marginBottom: 10 }}>Deposit Yield Payment</p>
                        <div className="dash-deposit-row">
                          <input
                            type="number"
                            placeholder="SOL amount"
                            value={yieldAmounts[bondId] || ''}
                            onChange={(e) =>
                              setYieldAmounts(prev => ({ ...prev, [bondId]: e.target.value }))
                            }
                            className="dash-input"
                          />
                          <button
                            onClick={() => handleDepositYield(bondId)}
                            disabled={processingDeposit === bondId}
                            className="dash-btn-violet-sm"
                          >
                            {processingDeposit === bondId ? (
                              <><Loader2 size={12} className="animate-spin" />Paying...</>
                            ) : (
                              'Pay Yield'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
