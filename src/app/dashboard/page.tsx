'use client';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useLacusProgram, type PortfolioHolding } from '@/hooks/useLacus';
import { useEffect, useState, useCallback } from 'react';
import { formatDate, formatSOL } from '@/lib/format';
import type { BondState } from '@/types/lacus';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  generateCouponSchedule,
  computeScheduleStatus,
  nextUnfundedCoupon,
  type CouponFrequencyMonths,
} from '@/lib/coupon-schedule';

export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  const {
    program, fetchPortfolioBonds, fetchMyBonds,
    claimYield, redeemBond, refund,
    depositYield, depositPrincipal, withdrawEscrow,
  } = useLacusProgram();

  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [issuedBonds, setIssuedBonds] = useState<BondState[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingClaim, setProcessingClaim] = useState<number | null>(null);
  const [processingRedeem, setProcessingRedeem] = useState<number | null>(null);
  const [processingRefund, setProcessingRefund] = useState<number | null>(null);
  const [processingDeposit, setProcessingDeposit] = useState<number | null>(null);
  const [processingPrincipal, setProcessingPrincipal] = useState<number | null>(null);
  const [processingWithdraw, setProcessingWithdraw] = useState<number | null>(null);
  const [yieldAmounts, setYieldAmounts] = useState<Record<number, string>>({});
  const [principalAmounts, setPrincipalAmounts] = useState<Record<number, string>>({});
  const [issuedFreq, setIssuedFreq] = useState<Record<number, CouponFrequencyMonths>>({});

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

      // v3 bonların kupon sıklığını çek (kupon-kupon fonlama için).
      const ids = issuedData.map((b: BondState) => Number(b.bondId));
      if (ids.length) {
        const { data: ags } = await supabase.from('agreements').select('bond_id, terms_json').in('bond_id', ids);
        const map: Record<number, CouponFrequencyMonths> = {};
        (ags || []).forEach((r: { bond_id: number; terms_json: { couponFrequencyMonths?: number } | null }) => {
          const f = r.terms_json?.couponFrequencyMonths;
          if (f === 12 || f === 6 || f === 3) map[r.bond_id] = f;
        });
        setIssuedFreq(map);
      } else {
        setIssuedFreq({});
      }
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

  // ── Lender actions
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

  const handleRefund = async (bondId: number) => {
    setProcessingRefund(bondId);
    try {
      await refund(bondId);
      toast.success('Refunded! Your contribution was returned.');
      await fetchData();
    } catch (error) {
      toast.error('Refund failed', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setProcessingRefund(null);
    }
  };

  // ── Issuer actions
  const handleDepositYield = async (bondId: number) => {
    const amount = parseFloat(yieldAmounts[bondId] || '0');
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount'); return; }
    setProcessingDeposit(bondId);
    try {
      await depositYield(bondId, Math.floor(amount * 1_000_000_000));
      toast.success('Yield deposited!', { description: `Deposited ${amount} SOL` });
      setYieldAmounts(prev => ({ ...prev, [bondId]: '' }));
      await fetchData();
    } catch (error) {
      toast.error('Failed to deposit yield', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setProcessingDeposit(null);
    }
  };

  // Takvimdeki sıradaki kuponu tam tutarıyla fonla (depositYield).
  const handleFundCoupon = async (bondId: number, lamports: number) => {
    if (lamports <= 0) { toast.error('Nothing to fund for this coupon'); return; }
    setProcessingDeposit(bondId);
    try {
      await depositYield(bondId, lamports);
      toast.success('Coupon funded!', { description: `Deposited ${(lamports / 1e9).toFixed(4)} SOL` });
      await fetchData();
    } catch (error) {
      toast.error('Failed to fund coupon', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setProcessingDeposit(null);
    }
  };

  const handleDepositPrincipal = async (bondId: number) => {
    const amount = parseFloat(principalAmounts[bondId] || '0');
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount'); return; }
    setProcessingPrincipal(bondId);
    try {
      await depositPrincipal(bondId, Math.floor(amount * 1_000_000_000));
      toast.success('Principal deposited!', { description: `Deposited ${amount} SOL` });
      setPrincipalAmounts(prev => ({ ...prev, [bondId]: '' }));
      await fetchData();
    } catch (error) {
      toast.error('Failed to deposit principal', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setProcessingPrincipal(null);
    }
  };

  const handleWithdrawEscrow = async (bondId: number) => {
    setProcessingWithdraw(bondId);
    try {
      await withdrawEscrow(bondId);
      toast.success('Escrow withdrawn! Funds released (minus 1% fee).');
      await fetchData();
    } catch (error) {
      toast.error('Withdraw failed', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setProcessingWithdraw(null);
    }
  };

  // ── Derived: portfolio total (face value × units)
  const portfolioTotalSOL = holdings.reduce(
    (sum, { bond, units }) => sum + (Number(bond.faceValue) / 1e9) * units,
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

  const now = Math.floor(Date.now() / 1000);

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
                    {holdings.map(({ bond, units, claimableYield, redeemed }, index) => {
                      const faceValueSOL  = Number(bond.faceValue) / 1e9;
                      const totalValueSOL = faceValueSOL * units;
                      const couponRate    = (bond.couponRateBps / 100).toFixed(2);
                      const isIssuer      = bond.issuer.toString() === publicKey?.toString();
                      const bondId        = Number(bond.bondId);
                      const isMatured     = Number(bond.maturityTimestamp) <= now;
                      const saleClosed    = bond.funded || Number(bond.saleDeadline) <= now;
                      const fundingFailed = !bond.funded && Number(bond.saleDeadline) <= now && Number(bond.totalRaised) < Number(bond.fundingGoal);
                      const totalYieldDeposited = Number(bond.totalYieldDeposited);
                      const hasClaimableYield   = claimableYield > 0;
                      const hasPrincipal        = bond.principalFunded;

                      return (
                        <tr key={index}>
                          <td>
                            <div className="lx-sym">{bond.symbol}</div>
                            <div className="lx-issuer">{bond.name}{isIssuer ? " · ISSUER" : ""}</div>
                          </td>
                          <td className="r num">{units.toLocaleString()}</td>
                          <td className="r num">{formatSOL(Number(bond.faceValue))} SOL</td>
                          <td className="r num">{totalValueSOL.toFixed(4)} SOL</td>
                          <td className="r num">{couponRate}%</td>
                          <td className="r num">{formatDate(Number(bond.maturityTimestamp))}</td>
                          <td className="r">
                            <div className="dash-actions">
                              {redeemed ? (
                                <span className="lx-stamp">REDEEMED</span>
                              ) : fundingFailed ? (
                                <button
                                  onClick={() => handleRefund(bondId)}
                                  disabled={processingRefund === bondId}
                                  className="lx-btn lx-btn-ghost lx-btn-sm"
                                >
                                  {processingRefund === bondId ? (
                                    <><Loader2 size={12} className="animate-spin" />Refunding...</>
                                  ) : 'Refund'}
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleClaimYield(bondId)}
                                    disabled={processingClaim === bondId || !hasClaimableYield || !saleClosed}
                                    title={
                                      !saleClosed
                                        ? 'Coupons open after the subscription closes'
                                        : !hasClaimableYield
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
                                      ) : 'Redeem Bond'}
                                    </button>
                                  )}
                                  {isMatured && !hasPrincipal && (
                                    <span className="lx-stamp">AWAITING PRINCIPAL</span>
                                  )}
                                </>
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
                      <td className="r num">{holdings.reduce((s, h) => s + h.units, 0).toLocaleString()}</td>
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
                      <th>Bond</th><th className="r">Sold</th><th className="r">Raised / Goal</th>
                      <th className="r">Status</th><th className="r">Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedBonds.map((bond, index) => {
                      const bondId = Number(bond.bondId);
                      const sold = Number(bond.tokensSold);
                      const max = Number(bond.maxSupply);
                      const soldPct = max > 0 ? (sold / max) * 100 : 0;
                      const raised = Number(bond.totalRaised) / 1e9;
                      const goal = Number(bond.fundingGoal) / 1e9;
                      const goalReached = Number(bond.totalRaised) >= Number(bond.fundingGoal);
                      const saleOver = Number(bond.saleDeadline) <= now || sold >= max;
                      const canWithdraw = !bond.funded && goalReached && saleOver;
                      const fundingFailed = !bond.funded && Number(bond.saleDeadline) <= now && !goalReached;
                      const principalDeposited = Number(bond.totalPrincipalDeposited) / 1e9;
                      const totalRaiseSOL = Number(bond.totalRaised) / 1e9;

                      // v3 bonlarda kupon takvimi → kupon-kupon fonlama.
                      const freq = issuedFreq[bondId];
                      const sched = freq
                        ? computeScheduleStatus(
                            generateCouponSchedule({
                              faceValueLamports: Number(bond.faceValue),
                              couponRateBps: bond.couponRateBps,
                              maturityTimestamp: Number(bond.maturityTimestamp),
                              saleDeadline: Number(bond.saleDeadline),
                              couponFrequencyMonths: freq,
                            }),
                            {
                              tokensSold: sold,
                              totalYieldDeposited: Number(bond.totalYieldDeposited),
                              totalPrincipalDeposited: Number(bond.totalPrincipalDeposited),
                              principalFunded: bond.principalFunded,
                              faceValueLamports: Number(bond.faceValue),
                              maturityTimestamp: Number(bond.maturityTimestamp),
                              nowSec: now,
                            }
                          )
                        : null;
                      const couponRows = sched ? sched.filter((s) => s.type === 'coupon') : [];
                      const paidCoupons = couponRows.filter((s) => s.status === 'paid').length;
                      const nextCoupon = sched ? nextUnfundedCoupon(sched) : null;
                      const nextCouponLamports = nextCoupon
                        ? Math.max(0, nextCoupon.promisedTotalLamports - nextCoupon.fundedTotalLamports)
                        : 0;

                      return (
                        <tr key={index}>
                          <td>
                            <div className="lx-sym">{bond.symbol}</div>
                            <div className="lx-issuer">{bond.name}</div>
                          </td>
                          <td className="r">
                            <span className="lx-stamp open num">{soldPct.toFixed(0)}% SOLD</span>
                            <div className="lx-issuer num">{sold.toLocaleString()} / {max.toLocaleString()}</div>
                          </td>
                          <td className="r num">{raised.toFixed(3)} / {goal.toFixed(3)} SOL</td>
                          <td className="r">
                            {bond.funded ? (
                              bond.principalFunded
                                ? <span className="lx-stamp">PRINCIPAL FUNDED</span>
                                : <span className="lx-stamp open">FUNDED</span>
                            ) : fundingFailed ? (
                              <span className="lx-stamp">FUNDING FAILED</span>
                            ) : (
                              <span className="lx-stamp open">RAISING</span>
                            )}
                          </td>
                          <td className="r">
                            {!bond.funded ? (
                              <button
                                onClick={() => handleWithdrawEscrow(bondId)}
                                disabled={!canWithdraw || processingWithdraw === bondId}
                                title={canWithdraw ? undefined : 'Available once the goal is met and the sale window closes'}
                                className="lx-btn lx-btn-solid lx-btn-sm"
                              >
                                {processingWithdraw === bondId
                                  ? <><Loader2 size={12} className="animate-spin" />Withdrawing...</>
                                  : 'Withdraw escrow'}
                              </button>
                            ) : (
                              <div className="dash-actions" style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                {sched ? (
                                  nextCoupon ? (
                                    <div className="dash-actions" style={{ flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                                      <button
                                        onClick={() => handleFundCoupon(bondId, nextCouponLamports)}
                                        disabled={processingDeposit === bondId || nextCouponLamports <= 0}
                                        className="lx-btn lx-btn-solid lx-btn-sm"
                                      >
                                        {processingDeposit === bondId
                                          ? <><Loader2 size={11} className="animate-spin" />Funding...</>
                                          : `Fund coupon ${nextCoupon.index + 1} · ${(nextCouponLamports / 1e9).toFixed(4)} SOL`}
                                      </button>
                                      <span className="lx-issuer num">{paidCoupons}/{couponRows.length} coupons funded · due {formatDate(nextCoupon.dateUnix)}</span>
                                    </div>
                                  ) : (
                                    <span className="lx-stamp" style={{ color: '#1d9e75' }}>✓ ALL COUPONS FUNDED</span>
                                  )
                                ) : (
                                  <div className="dash-deposit-row">
                                    <input
                                      type="number"
                                      placeholder="Yield SOL"
                                      value={yieldAmounts[bondId] || ''}
                                      onChange={(e) => setYieldAmounts(prev => ({ ...prev, [bondId]: e.target.value }))}
                                      className="lx-input-sm num"
                                    />
                                    <button
                                      onClick={() => handleDepositYield(bondId)}
                                      disabled={processingDeposit === bondId}
                                      className="lx-btn lx-btn-ghost lx-btn-sm"
                                    >
                                      {processingDeposit === bondId ? <Loader2 size={11} className="animate-spin" /> : 'Pay yield'}
                                    </button>
                                  </div>
                                )}
                                {!bond.principalFunded && (
                                  <div className="dash-deposit-row">
                                    <input
                                      type="number"
                                      placeholder={`Principal (≥ ${totalRaiseSOL.toFixed(3)})`}
                                      value={principalAmounts[bondId] || ''}
                                      onChange={(e) => setPrincipalAmounts(prev => ({ ...prev, [bondId]: e.target.value }))}
                                      className="lx-input-sm num"
                                    />
                                    <button
                                      onClick={() => handleDepositPrincipal(bondId)}
                                      disabled={processingPrincipal === bondId}
                                      className="lx-btn lx-btn-ghost lx-btn-sm"
                                    >
                                      {processingPrincipal === bondId ? <Loader2 size={11} className="animate-spin" /> : 'Fund principal'}
                                    </button>
                                  </div>
                                )}
                                {bond.principalFunded && (
                                  <span className="lx-issuer num">principal: {principalDeposited.toFixed(3)} SOL</span>
                                )}
                              </div>
                            )}
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
