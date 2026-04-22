export default function PrinciplesSection() {
  const principles = [
    {
      num: '01',
      label: 'Access',
      title: 'Debt capital for every company, not just the chosen few.',
      desc: 'Banks gatekeep. Bond markets price out anyone without institutional backing. Lacus removes both barriers: any company can issue, any investor can participate, on terms enforced by code.',
    },
    {
      num: '02',
      label: 'Transparency',
      title: 'Every bond. Every cashflow. No black boxes.',
      desc: 'CDOs imploded in 2008 because nobody tracked what was inside them. On Lacus, every position, covenant, and coupon distribution is readable on-chain before you invest, not after.',
    },
    {
      num: '03',
      label: 'Custody',
      title: 'Your position. Your keys. No counterparty holding either.',
      desc: 'We never touch the money. Assets settle directly through audited smart contracts. No rehypothecation, no trustee, no bilateral exposure. The protocol mediates; you own.',
    },
    {
      num: '04',
      label: 'Liquidity',
      title: 'Exit when you want. Keep what you earned.',
      desc: 'A live P2P order book lets bondholders sell before maturity. Settlement is instant: no T+2, no value date delays. Duration is tradeable; yield is yours.',
    },
  ];

  return (
    <section className="max-w-[1280px] mx-auto px-8 py-28">
      <div className="grid grid-cols-12 gap-8 mb-20">
        <div className="col-span-12 md:col-span-7 flex flex-col gap-7 reveal">
          <div className="eyebrow eyebrow-rule">Principles</div>
          <h2 className="font-display text-[var(--ink)] text-[3rem] md:text-[4rem] leading-[1.02] tracking-tight">
            The 2008 crisis didn&apos;t happen
            <br />
            <span className="italic grad-ink-interactive cursor-pointer">because of risk.</span>
          </h2>
        </div>
        <div className="col-span-12 md:col-span-5 flex items-end reveal reveal-d1">
          <p className="text-[var(--ink2)] text-[1.05rem] leading-[1.7] max-w-[40ch]">
            It happened because of opacity. Nobody could see inside the box. We put the box on-chain.
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
