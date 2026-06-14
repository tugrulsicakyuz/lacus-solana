'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';
import { useLacusProgram } from '@/hooks/useLacus';
import { formatDate } from '@/lib/format';
import { Loader2 } from 'lucide-react';
import { retryUpsert } from '@/lib/supabase-retry';
import { buildAndHashAgreement, AGREEMENT_TEMPLATE_VERSION, shortHash, type AgreementTerms } from '@/lib/loan-agreement';
import { requireKyc } from '@/lib/kyc';

export default function IssueBondPage() {
  const { connected, publicKey } = useWallet();
  const { issueBond } = useLacusProgram();

  // Form state: all original fields preserved
  const [bondName, setBondName] = useState('');
  const [bondSymbol, setBondSymbol] = useState('');
  const [faceValueSOL, setFaceValueSOL] = useState(0.1);
  const [couponRateBps, setCouponRateBps] = useState(800);
  const [maturityDate, setMaturityDate] = useState('');
  const [maxSupply, setMaxSupply] = useState(1000);
  const [saleDeadlineDate, setSaleDeadlineDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Loan agreement review/sign modal
  const [showAgreement, setShowAgreement] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [agreement, setAgreement] = useState<
    { text: string; hashHex: string; hashBytes: Uint8Array; terms: AgreementTerms } | null
  >(null);

  const totalRaise = faceValueSOL * maxSupply;
  const apyDisplay = couponRateBps / 100;

  // ── Step 1: validate + build the agreement, then open the review/sign modal ──
  const openAgreement = async () => {
    if (!connected || !publicKey) { toast.error('Connect your wallet first'); return; }
    if (!bondName.trim()) { toast.error('Please enter a bond name'); return; }
    if (!bondSymbol.trim() || bondSymbol.length > 8) { toast.error('Bond symbol must be 1-8 characters'); return; }
    if (!maturityDate) { toast.error('Please select a maturity date'); return; }

    const MIN_SUPPLY = 100, MAX_SUPPLY = 1_000_000;
    if (maxSupply < MIN_SUPPLY) { toast.error('Invalid supply', { description: `Minimum supply is ${MIN_SUPPLY.toLocaleString()} tokens` }); return; }
    if (maxSupply > MAX_SUPPLY) { toast.error('Invalid supply', { description: `Maximum supply is ${MAX_SUPPLY.toLocaleString()} tokens` }); return; }
    if (couponRateBps <= 0) { toast.error('Invalid coupon rate', { description: 'Coupon rate (APY) must be greater than 0' }); return; }
    if (faceValueSOL <= 0) { toast.error('Invalid face value', { description: 'Face value must be greater than 0 SOL' }); return; }

    const maturityTimestamp = Math.floor(new Date(maturityDate).getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    if (maturityTimestamp <= nowSec) { toast.error('Maturity date must be in the future'); return; }
    if (!saleDeadlineDate) { toast.error('Please select a subscription close date'); return; }
    const saleDeadline = Math.floor(new Date(saleDeadlineDate).getTime() / 1000);
    if (saleDeadline <= nowSec) { toast.error('Subscription close date must be in the future'); return; }
    if (maturityTimestamp <= saleDeadline) { toast.error('Maturity must be after the subscription close date'); return; }

    const terms: AgreementTerms = {
      issuer: publicKey.toBase58(),
      name: bondName.trim(),
      symbol: bondSymbol.trim(),
      faceValueLamports: Math.round(faceValueSOL * 1_000_000_000),
      couponRateBps,
      maturityTimestamp,
      maxSupply,
    };

    try {
      const built = await buildAndHashAgreement(terms);
      setAgreement({ ...built, terms });
      setAccepted(false);
      setShowAgreement(true);
    } catch (err) {
      toast.error('Could not prepare the agreement', { description: err instanceof Error ? err.message : String(err) });
    }
  };

  // ── Step 2: KYC gate, issue on chain with the real hash, store the text ──────
  const confirmAndPublish = async () => {
    if (!agreement || !publicKey) return;

    const kyc = await requireKyc(publicKey);
    if (!kyc.ok) {
      toast.error('KYC required', { description: `Your wallet is not approved (status: ${kyc.status}).` });
      return;
    }

    setIsLoading(true);
    try {
      const result = await issueBond({
        name: agreement.terms.name,
        symbol: agreement.terms.symbol,
        faceValue: agreement.terms.faceValueLamports,
        couponRateBps: agreement.terms.couponRateBps,
        saleDeadline: Math.floor(new Date(saleDeadlineDate).getTime() / 1000),
        maturityTimestamp: agreement.terms.maturityTimestamp,
        // Funding goal = tam raise (birim fiyat × adet). Ayrı alan yok; kapanışa
        // kadar tamamı satılmazsa lender'lar iade alır.
        fundingGoal: agreement.terms.faceValueLamports * agreement.terms.maxSupply,
        maxSupply: agreement.terms.maxSupply,
        loanAgreementHash: agreement.hashBytes,
      });

      // Zincire yalnızca hash gitti; sözleşme metnini Supabase'e kaydet (transient hatada retry).
      const agRes = await retryUpsert('agreements', {
        bond_id: result.bondId,
        template_version: AGREEMENT_TEMPLATE_VERSION,
        terms_json: agreement.terms,
        agreement_text: agreement.text,
        sha256_hex: agreement.hashHex,
        issuer_wallet: publicKey.toBase58(),
      }, 3, 'bond_id');
      if (!agRes.success) {
        toast.warning('Bond issued, but the agreement copy was not saved', { description: agRes.error });
      }

      toast.success('Bond issued on Solana!', {
        description: `Bond ID: ${result.bondId} | TX: ${result.tx.slice(0, 8)}...`,
        action: {
          label: 'View on Explorer',
          onClick: () => window.open('https://explorer.solana.com/tx/' + result.tx + '?cluster=devnet', '_blank'),
        },
      });

      setBondName(''); setBondSymbol(''); setFaceValueSOL(0.1);
      setCouponRateBps(800); setMaxSupply(1000); setMaturityDate('');
      setSaleDeadlineDate('');
      setShowAgreement(false); setAgreement(null); setAccepted(false);
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
            <label className="lx-field">
              <span>Subscription closes</span>
              <input
                className="num"
                type="date"
                value={saleDeadlineDate}
                onChange={e => setSaleDeadlineDate(e.target.value)}
              />
              <em className="help num">Funding window end (before maturity). The full raise ({(faceValueSOL * maxSupply).toFixed(4)} SOL) must fill by this date, or lenders are refunded.</em>
            </label>
            <div className="lx-field full">
              <span>Loan agreement</span>
              <em className="help" style={{ marginTop: 4 }}>
                Generated from the terms above using a fixed template. You review and sign it before
                publishing. Its SHA-256 hash is written on chain; the full text is stored off chain.
              </em>
            </div>
          </div>

          {!connected ? (
            <div className="iss-wallet lx-wallet">
              <p className="lx-fn" style={{ marginTop: 0 }}>Connect wallet to deploy</p>
              <WalletMultiButton />
            </div>
          ) : (
            <div className="iss-actions">
              <button className="lx-btn lx-btn-solid" onClick={openAgreement} disabled={isLoading}>
                Review &amp; publish
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

      {showAgreement && agreement && (
        <div
          onClick={() => !isLoading && setShowAgreement(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, background: 'var(--paper)', color: 'var(--ink)', borderRadius: 12, padding: '20px 22px', maxHeight: '85vh', overflow: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ fontSize: 18 }}>Review and publish</strong>
              <button onClick={() => setShowAgreement(false)} disabled={isLoading} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <p className="lx-fn" style={{ marginTop: 0 }}>{agreement.terms.name} · {agreement.terms.symbol}</p>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '12px 14px', maxHeight: 260, overflow: 'auto', margin: '8px 0' }}>{agreement.text}</pre>
            <p className="lx-fn" style={{ marginTop: 0, fontFamily: 'monospace' }}>on-chain hash · {shortHash(agreement.hashHex)}</p>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, margin: '10px 0' }}>
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I agree to these terms and want to publish this offering.</span>
            </label>
            <button className="lx-btn lx-btn-solid lx-btn-block" onClick={confirmAndPublish} disabled={!accepted || isLoading}>
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                  Publishing…
                </span>
              ) : 'Sign and publish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
