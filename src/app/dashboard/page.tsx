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
      toast.error('Failed to load portfolio', { description: error instanceof Error ? error.message : undefined });
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

  // ── Derived: portfolio total (face value × balance)
  const portfolioTotalSOL = holdings.reduce(
    (sum, { bond, balance }) => sum + (Number(bond.faceValue) / 1e9) * balance,
    0
  );

  // ── Not connected state
  if (!connected) {
    return (
      <div className="lx-wrap">
        <div className="lx-pagehead">
          <div className="lx-kicker">Dashboard · Lender view</div>
          <h1>Your account, as a statement.</h1>
        </div>
        <div className="lx-empty dash-connect">
          <p>Connect a wallet to see your statement.</p>
          <div className="dash-wallet lx-wallet"><WalletMultiButton /></div>
        </div>
        <div style={{ paddingBottom: 96 }} />
      </div>
    );
  }

  // ── Connected state
  return (
    <div className="lx-wrap">
      <div className="lx-pagehead">
        <div className="lx-kicker">Dashboard · Lender view</div>
        <h1>Your account, as a statement.</h1>
      </div>
      <div className="lx-meta">
        <span><span className="k">Account</span><span className="num">{publicKey?.toBase58().slice(0, 4)}…{publicKey?.toBase58().slice(-4)}</span></span>
        <span><span className="k">Network</span>Solana Devnet</span>
      </div>

      {loading ? (
        <div className="lx-loading">
          <Loader2 size={16} className="animate-spin" />
          Fetching instruments...
        </div>
      ) : (
        <>
          <div className="lx-cards">
            <div className="lx-card">
              <div className="k">Portfolio value</div>
              <div className="v num">{portfolioTotalSOL.toFixed(4)} SOL</div>
              <div className="d num">{holdings.length} bonds held</div>
            </div>
          </div>

          {/* Statement of holdings */}
          <div className="lx-statement">
            <h3 className="lx-subhead">Statement of holdings</h3>
            <div className="lx-drule"></div>

            {holdings.length === 0 ? (
              <div className="lx-empty">
                <p>No bonds yet. Browse the primary market to make your first loan.</p>
                <Link href="/primary" className="lx-btn lx-btn-ghost lx-btn-sm">Explore bonds</Link>
              </div>
            ) : (
              <div className="lx-scroll">
                <table className="lx-table">
                  <thead>
                    <tr>
                      <th>Bond</th><th className="r">Units</th><th className="r">Face value</th>
                      <th className="r">Value</th><th className="r">Coupon</th><th className="r">Maturity</th>
                      <th className="r">Coupons</th>
                    </tr>
                  </thead>
                  <tbody>
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
                        <tr key={index}>
                          <td>
                            <div className="lx-sym">{bond.symbol}</div>
                            <div className="lx-issuer">{bond.name}{isIssuer ? " · ISSUER" : ""}</div>
                          </td>
                          <td className="r num">{balance.toLocaleString()}</td>
                          <td className="r num">{formatSOL(Number(bond.faceValue))} SOL</td>
                          <td className="r num">{totalValueSOL.toFixed(4)} SOL</td>
                          <td className="r num">{couponRate}%</td>
                          <td className="r num">{formatDate(Number(bond.maturityTimestamp))}</td>
                          <td className="r">
                            <div className="dash-actions">
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
                                className="lx-btn lx-btn-solid lx-btn-sm"
                              >
                                {processingClaim === bondId ? (
                                  <><Loader2 size={12} className="animate-spin" />Claiming...</>
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
                                  className="lx-btn lx-btn-ghost lx-btn-sm"
                                >
                                  {processingRedeem === bondId ? (
                                    <><Loader2 size={12} className="animate-spin" />Redeeming...</>
                                  ) : (
                                    'Redeem Bond'
                                  )}
                                </button>
                              )}
                              {isMatured && !hasPrincipal && (
                                <span className="lx-stamp">AWAITING PRINCIPAL</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="r num">{holdings.reduce((s, h) => s + h.balance, 0).toLocaleString()}</td>
                      <td></td>
                      <td className="r"><span className="lx-total-val num">{portfolioTotalSOL.toFixed(4)} SOL</span></td>
                      <td></td><td></td><td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Bonds issued */}
          {issuedBonds.length > 0 && (
            <div className="lx-statement">
              <h3 className="lx-subhead">Bonds issued</h3>
              <div className="lx-drule"></div>
              <div className="lx-scroll">
                <table className="lx-table">
                  <thead>
                    <tr>
                      <th>Bond</th><th className="r">Sold</th><th className="r">Face value</th>
                      <th className="r">Coupon</th><th className="r">Deposit yield</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedBonds.map((bond, index) => {
                      const soldPercentage =
                        Number(bond.maxSupply) > 0
                          ? (Number(bond.tokensSold) / Number(bond.maxSupply)) * 100
                          : 0;
                      const bondId = Number(bond.bondId);

                      return (
                        <tr key={index}>
                          <td>
                            <div className="lx-sym">{bond.symbol}</div>
                            <div className="lx-issuer">{bond.name}</div>
                          </td>
                          <td className="r">
                            <span className="lx-stamp open num">{soldPercentage.toFixed(0)}% SOLD</span>
                            <div className="lx-issuer num">{Number(bond.tokensSold).toLocaleString()} / {Number(bond.maxSupply).toLocaleString()}</div>
                          </td>
                          <td className="r num">{formatSOL(Number(bond.faceValue))} SOL</td>
                          <td className="r num">{(bond.couponRateBps / 100).toFixed(2)}%</td>
                          <td className="r">
                            <div className="dash-deposit-row">
                              <input
                                type="number"
                                placeholder="SOL amount"
                                value={yieldAmounts[bondId] || ''}
                                onChange={(e) =>
                                  setYieldAmounts(prev => ({ ...prev, [bondId]: e.target.value }))
                                }
                                className="lx-input-sm num"
                              />
                              <button
                                onClick={() => handleDepositYield(bondId)}
                                disabled={processingDeposit === bondId}
                                className="lx-btn lx-btn-ghost lx-btn-sm"
                              >
                                {processingDeposit === bondId ? (
                                  <><Loader2 size={12} className="animate-spin" />Paying...</>
                                ) : (
                                  'Pay Yield'
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
            </div>
          )}
        </>
      )}
      <div style={{ paddingBottom: 96 }} />
    </div>
  );
}
