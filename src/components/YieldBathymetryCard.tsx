"use client";

import { useEffect, useState } from "react";
import { useLiveClock } from "@/lib/useClientInteractions";

interface NodeData {
  label: string;
  rate: string;
  sub: string;
  color: string;
}

export default function YieldBathymetryCard() {
  const [tooltipData, setTooltipData] = useState<NodeData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useLiveClock('clock-display');

  const nodeData: Record<string, NodeData> = {
    'node-on': { label: 'O/N · Surface', rate: '3.87%', sub: 'Overnight · Floating', color: '#7dd3fc' },
    'node-2y': { label: '2Y · Littoral', rate: '4.12%', sub: '2-Year Treasury', color: '#a5f3fc' },
    'node-5y': { label: '5Y · Thermocline', rate: '4.45%', sub: '5-Year Treasury', color: '#c4b5fd' },
    'node-10y': { label: '10Y · Bathyal', rate: '4.68%', sub: '10-Year Treasury · Live', color: '#c4b5fd' },
    'node-30y': { label: '30Y · Abyss', rate: '5.02%', sub: '30-Year Treasury', color: '#a78bfa' },
  };

  useEffect(() => {
    const chartCard = document.getElementById('chart-card');
    if (!chartCard) return;

    // Collect all cleanup fns so we can return them properly from useEffect
    const cleanups: (() => void)[] = [];

    Object.entries(nodeData).forEach(([id, data]) => {
      const node = document.getElementById(id);
      if (!node) return;

      const handleMouseEnter = () => { setTooltipData(data); };
      const handleMouseMove = (e: MouseEvent) => {
        const rect = chartCard.getBoundingClientRect();
        let x = e.clientX - rect.left + 14;
        let y = e.clientY - rect.top - 10;
        if (x + 160 > rect.width) x = e.clientX - rect.left - 160;
        setTooltipPos({ x, y });
      };
      const handleMouseLeave = () => { setTooltipData(null); };

      node.addEventListener('mouseenter', handleMouseEnter);
      node.addEventListener('mousemove', handleMouseMove as EventListener);
      node.addEventListener('mouseleave', handleMouseLeave);

      cleanups.push(() => {
        node.removeEventListener('mouseenter', handleMouseEnter);
        node.removeEventListener('mousemove', handleMouseMove as EventListener);
        node.removeEventListener('mouseleave', handleMouseLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div className="card-luminous rounded-2xl p-7 relative overflow-hidden" id="chart-card">
      <div
        className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(167,139,250,0.18), transparent 70%)',
          filter: 'blur(10px)',
        }}
      />

      <div className="relative flex items-start justify-between pb-5 border-b border-[var(--rule)]">
        <div>
          <div className="eyebrow-dim">Yield Bathymetry</div>
          <div className="font-display text-[var(--ink)] text-[1.4rem] leading-tight mt-1.5">
            The curve,<br /><span className="italic grad-ink">read by depth.</span>
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow-dim">Live</div>
          <div className="font-mono text-[0.72rem] tracking-[0.16em] uppercase text-[var(--ink2)] tab mt-1" id="clock-display">
            12:04:11 UTC
          </div>
        </div>
      </div>

      <div
        className={`chart-tooltip ${tooltipData ? 'active' : ''}`}
        style={{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }}
      >
        <div className="text-[var(--ink3)] text-[9px] uppercase tracking-[0.2em] mb-1">
          {tooltipData?.label || '—'}
        </div>
        <div className="text-[16px] tracking-[-0.01em]" style={{ color: tooltipData?.color || 'var(--ink)' }}>
          {tooltipData?.rate || '—'}
        </div>
        <div className="text-[var(--ink3)] text-[9px] mt-1 tracking-[0.1em]">
          {tooltipData?.sub || '—'}
        </div>
      </div>

      <svg
        id="yield-chart"
        viewBox="0 0 420 520"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto mt-6 relative"
        aria-label="Yield bathymetry chart"
      >
        <defs>
          <linearGradient id="waterCol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.22" />
            <stop offset="45%" stopColor="#c4b5fd" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#050614" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="yieldCurve" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="50%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="420" height="520" fill="url(#waterCol)" className="water-animated" />

        <g fontFamily="JetBrains Mono" fontSize="9" letterSpacing="1.2">
          <line x1="60" y1="40" x2="400" y2="40" stroke="rgba(125,211,252,0.35)" strokeWidth="1" />
          <text x="20" y="34" fill="#7dd3fc">O/N</text>
          <text x="20" y="46" fontSize="7" fill="#7c7d99">SURFACE</text>
          <text x="406" y="40" fill="#f0eff6" fontSize="10" textAnchor="end" dominantBaseline="middle" className="tab">3.87%</text>

          <line x1="60" y1="130" x2="400" y2="130" stroke="rgba(196,181,253,0.20)" strokeWidth="1" strokeDasharray="1,3" />
          <text x="20" y="124" fill="#a5f3fc">2Y</text>
          <text x="20" y="136" fontSize="7" fill="#7c7d99">LITTORAL</text>
          <text x="406" y="130" fill="#f0eff6" fontSize="10" textAnchor="end" dominantBaseline="middle" className="tab">4.12%</text>

          <line x1="60" y1="225" x2="400" y2="225" stroke="rgba(196,181,253,0.20)" strokeWidth="1" strokeDasharray="1,3" />
          <text x="20" y="219" fill="#c4b5fd">5Y</text>
          <text x="20" y="231" fontSize="7" fill="#7c7d99">THERMO.</text>
          <text x="406" y="225" fill="#f0eff6" fontSize="10" textAnchor="end" dominantBaseline="middle" className="tab">4.45%</text>

          <line x1="60" y1="335" x2="400" y2="335" stroke="rgba(196,181,253,0.20)" strokeWidth="1" strokeDasharray="1,3" />
          <text x="20" y="329" fill="#c4b5fd">10Y</text>
          <text x="20" y="341" fontSize="7" fill="#7c7d99">BATHYAL</text>
          <text x="406" y="335" fill="#f0eff6" fontSize="10" textAnchor="end" dominantBaseline="middle" className="tab">4.68%</text>

          <line x1="60" y1="460" x2="400" y2="460" stroke="rgba(196,181,253,0.20)" strokeWidth="1" strokeDasharray="1,3" />
          <text x="20" y="454" fill="#a78bfa">30Y</text>
          <text x="20" y="466" fontSize="7" fill="#7c7d99">ABYSS</text>
          <text x="406" y="460" fill="#f0eff6" fontSize="10" textAnchor="end" dominantBaseline="middle" className="tab">5.02%</text>
        </g>

        <path
          d="M 80,40 C 140,40 150,130 175,130 C 210,130 215,225 240,225 C 275,225 280,335 305,335 C 340,335 345,460 370,460"
          fill="none"
          stroke="url(#yieldCurve)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.25"
          style={{ filter: 'blur(4px)' }}
          className="chart-line-animated"
        />
        <path
          d="M 80,40 C 140,40 150,130 175,130 C 210,130 215,225 240,225 C 275,225 280,335 305,335 C 340,335 345,460 370,460"
          fill="none"
          stroke="url(#yieldCurve)"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="chart-line-animated"
          style={{ animationDelay: '0.2s' }}
        />

        <circle id="node-on" cx="80" cy="40" r="3.5" fill="#7dd3fc" className="chart-node" />
        <circle id="node-2y" cx="175" cy="130" r="3.5" fill="#a5f3fc" className="chart-node" />
        <circle id="node-5y" cx="240" cy="225" r="3.5" fill="#c4b5fd" className="chart-node" />
        <circle id="node-10y" cx="305" cy="335" r="3.5" fill="#c4b5fd" className="chart-node" />
        <circle id="node-30y" cx="370" cy="460" r="3.5" fill="#a78bfa" className="chart-node" />

        <circle cx="305" cy="335" r="3.5" fill="#a5f3fc" className="ping-ring" style={{ pointerEvents: 'none' }} />

        <g opacity="0.55">
          <line x1="340" y1="500" x2="400" y2="500" stroke="#c9cadb" strokeWidth="0.5" />
          <line x1="340" y1="497" x2="340" y2="503" stroke="#c9cadb" strokeWidth="0.5" />
          <line x1="400" y1="497" x2="400" y2="503" stroke="#c9cadb" strokeWidth="0.5" />
          <text x="370" y="515" textAnchor="middle" fill="#7c7d99" fontFamily="JetBrains Mono" fontSize="7" letterSpacing="1">
            30 BPS
          </text>
        </g>
      </svg>

      <p className="text-[var(--ink3)] text-[0.82rem] leading-snug mt-2 pl-1">
        Rates plotted across five tenors. The curve descends from{' '}
        <span className="text-[var(--aqua)] font-mono text-[10px] tracking-[0.16em] uppercase">surface</span> to{' '}
        <span className="text-[var(--lilac-deep)] font-mono text-[10px] tracking-[0.16em] uppercase">abyss</span>.
      </p>
    </div>
  );
}
