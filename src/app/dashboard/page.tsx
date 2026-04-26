'use client';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useLacusProgram } from '@/hooks/useLacus';
import { useEffect, useState, useCallback } from 'react';
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

  const fetchData = async () => {
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
  };

  useEffect(() => {
    if (program && connected && publicKey) {
      fetchData();
    } else {
      setHoldings([]);
      setIssuedBonds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, connected, publicKey]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSOL = (lamports: number) => {
    return (lamports / 1e9).toFixed(4);
  };

  const handleClaimYield = async (bondId: number) => {
    setProcessingClaim(bondId);
    try {
      await claimYield(bondId);
      toast.success('Yield claimed!');
      await fetchData();
    } catch (error: any) {
      console.error('Claim yield failed:', error);
      toast.error('Failed to claim yield', {
        description: error?.message || 'Unknown error',
      });
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
    } catch (error: any) {
      console.error('Redeem bond failed:', error);
      toast.error('Failed to redeem bond', {
        description: error?.message || 'Unknown error',
      });
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
      toast.success('Yield deposited successfully!', {
        description: `Deposited ${amount} SOL`,
      });
      setYieldAmounts(prev => ({ ...prev, [bondId]: '' }));
      await fetchData();
    } catch (error: any) {
      console.error('Deposit yield failed:', error);
      toast.error('Failed to deposit yield', {
        description: error?.message || 'Unknown error',
      });
    } finally {
      setProcessingDeposit(null);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">📊</span>
          </div>
          <h1 className="text-2xl font-semibold mb-3">Portfolio</h1>
          <p className="text-slate-400 mb-6">Connect your Solana wallet to view your bond holdings.</p>
          <WalletMultiButton style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
          <p className="text-slate-400">
            Connected: <span className="text-slate-300 font-mono">{publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}</span>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Bond Holdings Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Bond Holdings</h2>
              {holdings.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📭</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No bond holdings yet</h3>
                  <p className="text-slate-400 mb-6">Browse the launchpad to invest in bonds.</p>
                  <Link 
                    href="/launchpad"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Browse Bonds
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {holdings.map(({ bond, balance, lastYieldSnapshot }, index) => {
                    const faceValueSOL = Number(bond.faceValue) / 1e9;
                    const totalValueSOL = faceValueSOL * balance;
                    const couponRate = (bond.couponRateBps / 100).toFixed(2);
                    const isIssuer = bond.issuer.toString() === publicKey?.toString();
                    const bondId = Number(bond.bondId);
                    const now = Math.floor(Date.now() / 1000);
                    const isMatured = bond.isMatured || Number(bond.maturityTimestamp) <= now;
                    const totalYieldDeposited = Number(bond.totalYieldDeposited);
                    const hasClaimableYield = totalYieldDeposited > lastYieldSnapshot;
                    const hasPrincipal = bond.principalDeposited;

                    return (
                      <div 
                        key={index}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{bond.name}</h3>
                            <p className="text-sm text-slate-400">{bond.symbol}</p>
                          </div>
                          {isIssuer && (
                            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
                              Issuer
                            </span>
                          )}
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Balance</span>
                            <span className="text-sm font-medium">{balance.toLocaleString()} tokens</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Face Value</span>
                            <span className="text-sm font-medium">{formatSOL(Number(bond.faceValue))} SOL</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Total Value</span>
                            <span className="text-lg font-semibold text-green-400">{totalValueSOL.toFixed(4)} SOL</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Coupon Rate</span>
                            <span className="text-sm font-medium">{couponRate}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Maturity</span>
                            <span className="text-sm font-medium">{formatDate(Number(bond.maturityTimestamp))}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
                          {/* Claim Yield */}
                          <button
                            onClick={() => handleClaimYield(bondId)}
                            disabled={processingClaim === bondId || !hasClaimableYield}
                            title={!hasClaimableYield ? (totalYieldDeposited === 0 ? 'No yield has been deposited yet' : 'No new yield since your last claim') : undefined}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            {processingClaim === bondId ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Claiming...</span>
                              </>
                            ) : hasClaimableYield ? (
                              'Claim Yield'
                            ) : totalYieldDeposited === 0 ? (
                              'No Yield Yet'
                            ) : (
                              'Yield Up to Date'
                            )}
                          </button>

                          {/* Redeem Bond — matured states */}
                          {isMatured && hasPrincipal && (
                            <button
                              onClick={() => handleRedeemBond(bondId)}
                              disabled={processingRedeem === bondId}
                              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              {processingRedeem === bondId ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Redeeming...</span>
                                </>
                              ) : (
                                'Redeem Bond'
                              )}
                            </button>
                          )}
                          {isMatured && !hasPrincipal && (
                            <div className="w-full text-center text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg py-2 px-3">
                              ⏳ Awaiting principal deposit from issuer
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Bonds You've Issued Section */}
            {issuedBonds.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4">Bonds You&apos;ve Issued</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {issuedBonds.map((bond, index) => {
                    const soldPercentage = Number(bond.maxSupply) > 0 
                      ? (Number(bond.tokensSold) / Number(bond.maxSupply)) * 100 
                      : 0;
                    const bondId = Number(bond.bondId);

                    return (
                      <div 
                        key={index}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
                      >
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold">{bond.name}</h3>
                          <p className="text-sm text-slate-400">{bond.symbol}</p>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-slate-400">Sales Progress</span>
                              <span className="text-sm font-medium">
                                {Number(bond.tokensSold).toLocaleString()} / {Number(bond.maxSupply).toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{soldPercentage.toFixed(1)}% sold</p>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Face Value</span>
                            <span className="text-sm font-medium">{formatSOL(Number(bond.faceValue))} SOL</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Coupon Rate</span>
                            <span className="text-sm font-medium">{(bond.couponRateBps / 100).toFixed(2)}%</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800">
                          <p className="text-xs text-slate-400 mb-2">Deposit Yield Payment</p>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="SOL amount"
                              value={yieldAmounts[bondId] || ''}
                              onChange={(e) => setYieldAmounts(prev => ({ ...prev, [bondId]: e.target.value }))}
                              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
                            />
                            <button
                              onClick={() => handleDepositYield(bondId)}
                              disabled={processingDeposit === bondId}
                              className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                            >
                              {processingDeposit === bondId ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Paying...</span>
                                </>
                              ) : (
                                'Pay Yield'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
