'use client';

import '@solana/wallet-adapter-react-ui/styles.css';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';
import { useLacusProgram } from '@/hooks/useLacus';
import { TrendingUp, Info, Loader2, DollarSign, Calendar, FileText, Percent } from 'lucide-react';
import Link from 'next/link';

export default function IssueBondPage() {
  const { connected } = useWallet();
  const { issueBond } = useLacusProgram();

  const [bondName, setBondName] = useState('');
  const [bondSymbol, setBondSymbol] = useState('');
  const [faceValueUSDC, setFaceValueUSDC] = useState(100);
  const [couponRateBps, setCouponRateBps] = useState(800);
  const [maturityDate, setMaturityDate] = useState('');
  const [maxSupply, setMaxSupply] = useState(1000);
  const [loanAgreementUrl, setLoanAgreementUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const totalRaise = faceValueUSDC * maxSupply;
  const apyDisplay = couponRateBps / 100;

  const handleIssueBond = async () => {
    if (!connected) {
      toast.error('Connect your wallet first');
      return;
    }

    if (!bondName.trim()) {
      toast.error('Please enter a bond name');
      return;
    }

    if (!bondSymbol.trim() || bondSymbol.length > 8) {
      toast.error('Bond symbol must be 1-8 characters');
      return;
    }

    if (!maturityDate) {
      toast.error('Please select a maturity date');
      return;
    }

    const maturityTimestamp = Math.floor(new Date(maturityDate).getTime() / 1000);
    if (maturityTimestamp <= Math.floor(Date.now() / 1000)) {
      toast.error('Maturity date must be in the future');
      return;
    }

    setIsLoading(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(loanAgreementUrl || 'placeholder-' + Date.now());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
      const hashArray = new Uint8Array(hashBuffer);

      const result = await issueBond({
        name: bondName,
        symbol: bondSymbol,
        faceValue: Math.round(faceValueUSDC * 1_000_000),
        couponRateBps: couponRateBps,
        maturityTimestamp: maturityTimestamp,
        maxSupply: maxSupply,
        loanAgreementHash: hashArray,
      });

      toast.success('Bond issued on Solana!', {
        description: `Bond ID: ${result.bondId} | TX: ${result.tx.slice(0, 8)}...`,
        action: {
          label: 'View on Explorer',
          onClick: () =>
            window.open(
              'https://explorer.solana.com/tx/' + result.tx + '?cluster=devnet',
              '_blank'
            ),
        },
      });

      setBondName('');
      setBondSymbol('');
      setFaceValueUSDC(100);
      setCouponRateBps(800);
      setMaxSupply(1000);
      setLoanAgreementUrl('');
      setMaturityDate('');
    } catch (err: any) {
      toast.error('Failed to issue bond', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <Link href="/manage" className="inline-flex items-center text-sm text-[var(--ink3)] hover:text-[var(--ink)] transition-colors mb-4">
            ← Back to Dashboard
          </Link>
          <div className="eyebrow eyebrow-rule mb-5" style={{ color: 'var(--aqua-bright)' }}>
            Issue New Bond
          </div>
          <h1
            className="font-display text-[var(--ink)] leading-[0.97] tracking-tight"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)' }}
          >
            Create Bond on{' '}
            <span className="italic grad-ink-interactive">Solana.</span>
          </h1>
          <p className="mt-4 text-[var(--ink3)] text-[0.95rem] leading-[1.65] max-w-[52ch]">
            Deploy a new tokenized bond to Solana devnet. All parameters are immutable after creation.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="card-luminous rounded-2xl p-8">
            <h2 className="text-base font-semibold text-[var(--ink)] mb-6 eyebrow">Bond Parameters</h2>

            <div className="space-y-5">
              {/* Bond Name */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink3)] mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  Bond Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp Series A"
                  value={bondName}
                  onChange={(e) => setBondName(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors"
                />
              </div>

              {/* Bond Symbol */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink3)] mb-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Bond Symbol
                </label>
                <input
                  type="text"
                  placeholder="e.g. ACME-A (max 8 chars)"
                  maxLength={8}
                  value={bondSymbol}
                  onChange={(e) => setBondSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] font-mono outline-none transition-colors"
                />
              </div>

              {/* Face Value */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink3)] mb-2">
                  <DollarSign className="w-3.5 h-3.5" />
                  Face Value per Token (USDC)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={faceValueUSDC}
                  onChange={(e) => setFaceValueUSDC(parseFloat(e.target.value) || 100)}
                  className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] font-mono outline-none transition-colors"
                />
              </div>

              {/* Coupon Rate */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink3)] mb-2">
                  <Percent className="w-3.5 h-3.5" />
                  Coupon Rate (basis points)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={couponRateBps}
                  onChange={(e) => setCouponRateBps(parseInt(e.target.value) || 800)}
                  className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] font-mono outline-none transition-colors"
                />
                <p className="mt-1 text-xs text-[var(--ink4)]">
                  {couponRateBps} bps = {apyDisplay}% APY
                </p>
              </div>

              {/* Maturity Date */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink3)] mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Maturity Date
                </label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors"
                />
              </div>

              {/* Max Supply */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink3)] mb-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Max Supply (total tokens)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={maxSupply}
                  onChange={(e) => setMaxSupply(parseInt(e.target.value) || 1000)}
                  className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] font-mono outline-none transition-colors"
                />
              </div>

              {/* Loan Agreement URL/Hash */}
              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink3)] mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  Loan Agreement URL (optional)
                </label>
                <input
                  type="text"
                  placeholder="https://... or any text to hash"
                  value={loanAgreementUrl}
                  onChange={(e) => setLoanAgreementUrl(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors"
                />
                <p className="mt-1 text-xs text-[var(--ink4)]">
                  Will be hashed with SHA-256 and stored on-chain
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              {!connected ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-[var(--ink3)]">Connect your wallet to issue bonds</p>
                  <WalletMultiButton />
                </div>
              ) : (
                <button
                  onClick={handleIssueBond}
                  disabled={isLoading}
                  className="w-full btn-primary py-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Issuing Bond on Solana...
                    </span>
                  ) : (
                    'Issue Bond on Solana'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="card-luminous rounded-2xl p-8">
            <h2 className="text-base font-semibold text-[var(--ink)] mb-6 eyebrow">Preview</h2>

            <div className="space-y-4">
              {/* Bond Name */}
              <div className="rounded-xl p-4 bg-[var(--surface)] border border-[var(--rule)]">
                <p className="text-[11px] text-[var(--ink4)] mb-1">Bond Name</p>
                <p className="text-base font-semibold text-[var(--ink)]">
                  {bondName || '—'}
                </p>
              </div>

              {/* Symbol */}
              <div className="rounded-xl p-4 bg-[var(--surface)] border border-[var(--rule)]">
                <p className="text-[11px] text-[var(--ink4)] mb-1">Symbol</p>
                <p className="text-base font-semibold text-[var(--ink)] font-mono">
                  {bondSymbol || '—'}
                </p>
              </div>

              {/* Face Value */}
              <div className="rounded-xl p-4 bg-[var(--surface)] border border-[var(--rule)]">
                <p className="text-[11px] text-[var(--ink4)] mb-1">Face Value per Token</p>
                <p className="text-base font-semibold text-[var(--ink)] font-mono">
                  ${faceValueUSDC.toLocaleString()} USDC
                </p>
              </div>

              {/* APY */}
              <div className="rounded-xl p-4 bg-[var(--surface)] border border-[var(--rule)]">
                <p className="text-[11px] text-[var(--ink4)] mb-1">Annual Percentage Yield</p>
                <p className="text-base font-semibold font-mono" style={{ color: 'var(--aqua-bright)' }}>
                  {apyDisplay}%
                </p>
              </div>

              {/* Total Supply */}
              <div className="rounded-xl p-4 bg-[var(--surface)] border border-[var(--rule)]">
                <p className="text-[11px] text-[var(--ink4)] mb-1">Total Supply</p>
                <p className="text-base font-semibold text-[var(--ink)] font-mono">
                  {maxSupply.toLocaleString()} tokens
                </p>
              </div>

              {/* Total Raise */}
              <div className="rounded-xl p-4 bg-[var(--lilac)]/5 border border-[var(--lilac)]/20">
                <p className="text-[11px] text-[var(--ink4)] mb-1">Total Raise</p>
                <p className="text-xl font-bold font-mono" style={{ color: 'var(--lilac)' }}>
                  ${totalRaise.toLocaleString()} USDC
                </p>
              </div>

              {/* Maturity Date */}
              <div className="rounded-xl p-4 bg-[var(--surface)] border border-[var(--rule)]">
                <p className="text-[11px] text-[var(--ink4)] mb-1">Maturity Date</p>
                <p className="text-base font-semibold text-[var(--ink)] font-mono">
                  {maturityDate
                    ? new Date(maturityDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </div>

            {/* Info box */}
            <div className="mt-6 flex items-start gap-3 rounded-xl px-4 py-3 bg-[var(--aqua)]/5 border border-[var(--aqua)]/20">
              <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--aqua-bright)' }} />
              <p className="text-xs text-[var(--ink3)] leading-relaxed">
                Once issued, bond parameters are <strong>immutable</strong> on the Solana blockchain. Double-check all values before submitting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
