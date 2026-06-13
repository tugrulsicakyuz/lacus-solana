'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';
import { useLacusProgram } from '@/hooks/useLacus';
import { formatDate } from '@/lib/format';
import { Loader2 } from 'lucide-react';

export default function IssueBondPage() {
  const { connected } = useWallet();
  const { issueBond } = useLacusProgram();

  // Form state: all original fields preserved
  const [bondName, setBondName] = useState('');
  const [bondSymbol, setBondSymbol] = useState('');
  const [faceValueSOL, setFaceValueSOL] = useState(0.1);
  const [couponRateBps, setCouponRateBps] = useState(800);
  const [maturityDate, setMaturityDate] = useState('');
  const [maxSupply, setMaxSupply] = useState(1000);
  const [loanAgreementUrl, setLoanAgreementUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const totalRaise = faceValueSOL * maxSupply;
  const apyDisplay = couponRateBps / 100;

  // ── Original bond issuance logic ──────────────────────────────────────────
  const handleIssueBond = async () => {
    if (!connected) { toast.error('Connect your wallet first'); return; }
    if (!bondName.trim()) { toast.error('Please enter a bond name'); return; }
    if (!bondSymbol.trim() || bondSymbol.length > 8) { toast.error('Bond symbol must be 1-8 characters'); return; }
    if (!maturityDate) { toast.error('Please select a maturity date'); return; }

    const MIN_SUPPLY = 100, MAX_SUPPLY = 1_000_000;
    if (maxSupply < MIN_SUPPLY) { toast.error('Invalid supply', { description: `Minimum supply is ${MIN_SUPPLY.toLocaleString()} tokens` }); return; }
    if (maxSupply > MAX_SUPPLY) { toast.error('Invalid supply', { description: `Maximum supply is ${MAX_SUPPLY.toLocaleString()} tokens` }); return; }
    if (couponRateBps <= 0) { toast.error('Invalid coupon rate', { description: 'Coupon rate (APY) must be greater than 0' }); return; }
    if (faceValueSOL <= 0) { toast.error('Invalid face value', { description: 'Face value must be greater than 0 SOL' }); return; }

    const maturityTimestamp = Math.floor(new Date(maturityDate).getTime() / 1000);
    if (maturityTimestamp <= Math.floor(Date.now() / 1000)) { toast.error('Maturity date must be in the future'); return; }

    setIsLoading(true);
    try {
      const hashSource = loanAgreementUrl.trim() || 'lacus-bond';
      const msgBuffer = new TextEncoder().encode(hashSource);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer as BufferSource);
      const loanAgreementHash = new Uint8Array(hashBuffer);

      const result = await issueBond({
        name: bondName,
        symbol: bondSymbol,
        faceValue: Math.round(faceValueSOL * 1_000_000_000),
        couponRateBps,
        maturityTimestamp,
        maxSupply,
        loanAgreementHash,
      });

      toast.success('Bond issued on Solana!', {
        description: `Bond ID: ${result.bondId} | TX: ${result.tx.slice(0, 8)}...`,
        action: {
          label: 'View on Explorer',
          onClick: () => window.open('https://explorer.solana.com/tx/' + result.tx + '?cluster=devnet', '_blank'),
        },
      });

      setBondName(''); setBondSymbol(''); setFaceValueSOL(0.1);
      setCouponRateBps(800); setMaxSupply(1000); setLoanAgreementUrl(''); setMaturityDate('');
    } catch (err) {
      console.error('issueBond error:', err);
      const description = err instanceof Error ? err.message : String(err);
      toast.error('Failed to issue bond', { description });
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const maturityDisplay = maturityDate
    ? formatDate(new Date(maturityDate).getTime() / 1000).toUpperCase()
    : '··· ····';

  return (
    <div className="lx-wrap">
      <div className="lx-crumb"><Link href="/manage">MANAGE</Link> / ISSUE</div>
      <div className="lx-pagehead" style={{ paddingTop: 32 }}>
        <div className="lx-kicker">Form D-1 · New issue</div>
        <h1>Draft your term sheet.</h1>
        <p className="lx-lede">
          This is a loan agreement between you and your lenders. Set the terms below. The contract
          does the collecting, and Lacus never touches the funds.
        </p>
      </div>

      <div className="iss-grid">
        {/* Form */}
        <div>
          <div className="lx-formgrid">
            <label className="lx-field full">
              <span>Bond name</span>
              <input
                type="text"
                placeholder="e.g. Acme Corp Series A"
                value={bondName}
                onChange={e => setBondName(e.target.value)}
              />
            </label>
            <label className="lx-field">
              <span>Symbol</span>
              <input
                className="num"
                type="text"
                placeholder="e.g. ACME-A (max 8 chars)"
                maxLength={8}
                value={bondSymbol}
                onChange={e => setBondSymbol(e.target.value.toUpperCase())}
              />
            </label>
            <label className="lx-field">
              <span>Units</span>
              <input
                className="num"
                type="number"
                placeholder="1000"
                min={100}
                max={1000000}
                value={maxSupply}
                onChange={e => setMaxSupply(parseInt(e.target.value) || 1000)}
              />
              <em className="help">Min 100 · Max 1,000,000</em>
            </label>
            <label className="lx-field">
              <span>Face value · SOL</span>
              <input
                className="num"
                type="number"
                placeholder="0.10"
                min="0.001"
                step="0.01"
                value={faceValueSOL}
                onChange={e => setFaceValueSOL(parseFloat(e.target.value) || 0.1)}
              />
            </label>
            <label className="lx-field">
              <span>Coupon · basis points</span>
              <input
                className="num"
                type="number"
                placeholder="800"
                min={1}
                value={couponRateBps}
                onChange={e => setCouponRateBps(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
              />
              <em className="help num">{couponRateBps} bps = {apyDisplay}% p.a.</em>
            </label>
            <label className="lx-field">
              <span>Maturity</span>
              <input
                className="num"
                type="date"
                value={maturityDate}
                onChange={e => setMaturityDate(e.target.value)}
              />
            </label>
            <label className="lx-field full">
              <span>Loan agreement URL (optional)</span>
              <input
                type="text"
                placeholder="https://..."
                value={loanAgreementUrl}
                onChange={e => setLoanAgreementUrl(e.target.value)}
              />
              <em className="help">Hashed with SHA-256 and stored immutably on Solana</em>
            </label>
          </div>

          {!connected ? (
            <div className="iss-wallet lx-wallet">
              <p className="lx-fn" style={{ marginTop: 0 }}>Connect wallet to deploy</p>
              <WalletMultiButton />
            </div>
          ) : (
            <div className="iss-actions">
              <button className="lx-btn lx-btn-solid" onClick={handleIssueBond} disabled={isLoading}>
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                    Deploying on Solana...
                  </span>
                ) : 'Sign and publish'}
              </button>
              <span className="lx-fn" style={{ marginTop: 0 }}>
                Issuance is permissionless. Your offering goes live the moment you sign, and the
                terms lock permanently.
              </span>
            </div>
          )}
        </div>

        {/* Live certificate preview */}
        <div className="lx-sticky">
          <div className="lx-cert flat">
            <div className="draft-stamp">DRAFT</div>
            <div className="row1">
              <span>No. ···· / {maxSupply ? maxSupply.toLocaleString() : '····'}</span>
              <span>SOLANA DEVNET</span>
            </div>
            <div className="lx-cert-rule"></div>
            <div className="title">CORPORATE BOND · TOKENIZED</div>
            <div className="name">{bondSymbol || '······'}</div>
            <div className="co">{bondName || 'Bond name'}</div>
            <div className="face">
              <div className="v num">{faceValueSOL} SOL</div>
              <div className="k">FACE VALUE PER UNIT</div>
            </div>
            <div className="terms">
              <span>COUPON {apyDisplay}%</span>
              <span>DUE {maturityDisplay}</span>
            </div>
            <div className="stub">
              <span className="cut">✂ ·······</span>
              <span>TOTAL RAISE · {totalRaise.toFixed(4)} SOL</span>
              <span className="pay">{maxSupply ? maxSupply.toLocaleString() : '0'} UNITS</span>
            </div>
          </div>
          <p className="lx-fn">Live preview. The certificate updates as you type.</p>
        </div>
      </div>
      <div style={{ paddingBottom: 96 }} />
    </div>
  );
}
