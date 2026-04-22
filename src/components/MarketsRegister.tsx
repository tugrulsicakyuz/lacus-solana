import Link from "next/link";

export default function MarketsRegister() {
  const markets = [
    {
      name: 'L-Treasury 10Y',
      category: 'US·Sovereign · Senior',
      issuer: 'Lacus DAO',
      apy: '4.21',
      maturity: 'Oct 2034',
      volume: '$12.4M',
      change: '+0.12',
      positive: true,
    },
    {
      name: 'SOL-Credit A',
      category: 'Validators · Senior',
      issuer: 'Solana Foundation',
      apy: '6.85',
      maturity: 'Jan 2028',
      volume: '$45.1M',
      change: '−0.04',
      positive: false,
    },
    {
      name: 'Corp-B Note',
      category: 'Corporate · Investment-Grade',
      issuer: 'Meridian Capital',
      apy: '5.38',
      maturity: 'Jun 2027',
      volume: '$8.7M',
      change: '+0.08',
      positive: true,
    },
    {
      name: 'RWA-Private I',
      category: 'Private Credit · Mezz.',
      issuer: 'Halcyon Partners',
      apy: '9.12',
      maturity: 'Mar 2029',
      volume: '$3.2M',
      change: '+0.21',
      positive: true,
    },
  ];

  return (
    <section className="max-w-[1280px] mx-auto px-8 py-28" id="markets">
      <div className="flex flex-wrap items-end justify-between gap-10 mb-14 reveal">
        <div className="flex flex-col gap-7 max-w-[54ch]">
          <div className="eyebrow eyebrow-rule">Markets</div>
          <h2 className="font-display text-[var(--ink)] text-[3rem] md:text-[4rem] leading-[1.02] tracking-tight">
            The register,
            <span className="italic grad-ink"> priced continuously.</span>
          </h2>
          <p className="text-[var(--ink2)] text-[1.05rem] leading-[1.65]">
            Every active instrument in the protocol. Settled by the block, readable on a single page.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-right reveal reveal-d1">
          <span className="eyebrow-dim">As of</span>
          <span className="font-mono text-[0.85rem] tracking-[0.08em] uppercase text-[var(--ink)] tab">
            19 Apr 2026 · 12:04:11 UTC
          </span>
          <span className="live-pill inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-[0.16em] uppercase self-end mt-1">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-[var(--aqua)] ping-ring"></span>
              <span className="relative rounded-full w-1.5 h-1.5 bg-[var(--aqua)]"></span>
            </span>
            Live · every block
          </span>
        </div>
      </div>

      <div className="card-luminous rounded-2xl overflow-hidden reveal">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--rule)]">
              <th className="py-5 pl-8 pr-4 eyebrow-dim font-medium">Instrument</th>
              <th className="py-5 px-4 eyebrow-dim font-medium">Issuer</th>
              <th className="py-5 px-4 eyebrow-dim font-medium text-right">Fixed APY</th>
              <th className="py-5 px-4 eyebrow-dim font-medium">Maturity</th>
              <th className="py-5 px-4 eyebrow-dim font-medium text-right">24h Volume</th>
              <th className="py-5 pl-4 pr-8 eyebrow-dim font-medium text-right">Δ 24h</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rule-soft)]">
            {markets.map((m, i) => (
              <tr key={i} className="ledger-row-enhanced">
                <td className="py-6 pl-8 pr-4">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full grad-bg flex items-center justify-center border border-[var(--rule)]">
                      <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                        <defs>
                          <linearGradient id={`brandGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#7dd3fc" />
                            <stop offset="45%" stopColor="#a5f3fc" />
                            <stop offset="70%" stopColor="#c4b5fd" />
                            <stop offset="100%" stopColor="#a78bfa" />
                          </linearGradient>
                        </defs>
                        <circle cx="20" cy="20" r="15" stroke={`url(#brandGrad${i})`} strokeWidth="0.8" opacity="0.4" fill="none" />
                        <ellipse
                          cx="20"
                          cy="20"
                          rx="15"
                          ry="5.5"
                          transform="rotate(28 20 20)"
                          stroke={`url(#brandGrad${i})`}
                          strokeWidth="1"
                          fill="none"
                        />
                        <circle cx="20" cy="20" r="3" fill={`url(#brandGrad${i})`} />
                      </svg>
                    </div>
                    <div>
                      <div className="font-display text-[var(--ink)] text-[1.2rem] leading-tight">{m.name}</div>
                      <div className="eyebrow-dim mt-1">{m.category}</div>
                    </div>
                  </div>
                </td>
                <td className="py-6 px-4 text-[var(--ink2)] text-[0.95rem]">{m.issuer}</td>
                <td className="py-6 px-4 font-mono text-[var(--ink)] tab text-right text-[1rem]">
                  {m.apy}<span className="text-[var(--ink3)]">%</span>
                </td>
                <td className="py-6 px-4 font-mono text-[var(--ink2)] tab text-[0.95rem]">{m.maturity}</td>
                <td className="py-6 px-4 font-mono text-[var(--ink2)] tab text-right text-[0.95rem]">{m.volume}</td>
                <td className={`py-6 pl-4 pr-8 font-mono tab text-right text-[0.95rem] ${m.positive ? 'text-[var(--sage)]' : 'text-[var(--coral)]'}`}>
                  {m.change}<span className="opacity-60">%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 reveal">
        <p className="text-[var(--ink3)] text-[0.88rem] leading-snug max-w-[56ch]">
          All quotes are settled on-chain and observable without permission. The register closes no session — only the block advances.
        </p>
        <Link href="#" className="text-[0.88rem] font-medium link-grad grad-ink">
          View complete register →
        </Link>
      </div>
    </section>
  );
}
