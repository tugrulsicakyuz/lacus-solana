export default function PrinciplesSection() {
  const principles = [
    {
      num: '01',
      label: 'Issuance',
      title: 'Debt, issued at the speed of a block.',
      desc: "Create custom bond instruments with programmatically enforced terms — coupons, schedules, covenants, call structures. Solana's sub-second finality collapses issuance from quarters into seconds.",
    },
    {
      num: '02',
      label: 'Transparency',
      title: 'Every cashflow, auditable in daylight.',
      desc: 'Positions, exposures, and coupon distributions are legible on-chain in real time. Risk parameters are published alongside the instruments they govern — no opaque tranches, no buried dependencies.',
    },
    {
      num: '03',
      label: 'Custody',
      title: 'Governed by contracts, not counterparties.',
      desc: 'Assets remain under audited smart contracts. No rehypothecation, no trustee, no bilateral exposure. The protocol is the settlement layer; you are the sole custodian of your position.',
    },
    {
      num: '04',
      label: 'Exit',
      title: 'Liquidity, without forfeiting yield.',
      desc: 'A continuous peer-to-peer order book gives bondholders a liquid exit route at any point before maturity. Sell the duration, keep the accrual; the book clears block by block.',
    },
  ];

  return (
    <section className="max-w-[1280px] mx-auto px-8 py-28">
      <div className="grid grid-cols-12 gap-8 mb-20">
        <div className="col-span-12 md:col-span-7 flex flex-col gap-7 reveal">
          <div className="eyebrow eyebrow-rule">Principles</div>
          <h2 className="font-display text-[var(--ink)] text-[3rem] md:text-[4rem] leading-[1.02] tracking-tight">
            A protocol is the sum of
            <br />
            <span className="italic grad-ink-interactive cursor-pointer">its constraints.</span>
          </h2>
        </div>
        <div className="col-span-12 md:col-span-5 flex items-end reveal reveal-d1">
          <p className="text-[var(--ink2)] text-[1.05rem] leading-[1.7] max-w-[40ch]">
            Lacus makes four of them explicit — so that issuance, exposure, settlement, and exit can all be reasoned about from first principles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {principles.map((p, i) => (
          <article
            key={p.num}
            className={`principle-card card-luminous card-tilt rounded-2xl p-8 reveal ${i > 0 ? `reveal-d${i}` : ''}`}
          >
            <div className="flex items-start justify-between mb-8">
              <span className="font-display grad-ink text-[2.8rem] leading-none tab">{p.num}</span>
              <span className="eyebrow-dim">{p.label}</span>
            </div>
            <h3 className="font-display text-[var(--ink)] text-[1.85rem] leading-[1.12] mb-4">{p.title}</h3>
            <p className="text-[var(--ink2)] text-[0.98rem] leading-[1.7]">{p.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
