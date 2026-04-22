"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section className="relative max-w-[1280px] mx-auto px-8 py-36 overflow-hidden">

      {/* ── Large atmospheric orbital — lives BEHIND all text ── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <svg
          width="780"
          height="780"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ctaBgGrad" x1="0" y1="0" x2="600" y2="600" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#7dd3fc" />
              <stop offset="50%"  stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <radialGradient id="ctaCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#a5f3fc" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0"    />
            </radialGradient>
          </defs>

          {/* Outermost ring */}
          <circle cx="300" cy="300" r="285"
            stroke="url(#ctaBgGrad)" strokeWidth="0.6" fill="none" opacity="0.06" />

          {/* Spinning orbital ellipse group */}
          <g style={{ transformOrigin: '300px 300px', animation: 'orbit-slow 28s linear infinite' }}>
            <ellipse
              cx="300" cy="300" rx="285" ry="88"
              transform="rotate(28 300 300)"
              stroke="url(#ctaBgGrad)" strokeWidth="0.9" fill="none" opacity="0.20"
            />
            {/* Orbital node */}
            <circle cx="563" cy="237" r="6"   fill="#a5f3fc" opacity="0.65" />
            <circle cx="563" cy="237" r="11"  stroke="#7dd3fc" strokeWidth="0.6" fill="none" opacity="0.25" />
            {/* Trailing node — opposite side */}
            <circle cx="37"  cy="363" r="3.5" fill="#c4b5fd"  opacity="0.40" />
          </g>

          {/* Mid rings — static */}
          <circle cx="300" cy="300" r="210"
            stroke="url(#ctaBgGrad)" strokeWidth="0.5" fill="none" opacity="0.08" />
          <circle cx="300" cy="300" r="140"
            stroke="url(#ctaBgGrad)" strokeWidth="0.5" fill="none" opacity="0.10" />
          <circle cx="300" cy="300" r="72"
            stroke="url(#ctaBgGrad)" strokeWidth="0.5" fill="none" opacity="0.13" />

          {/* Center glow pool */}
          <circle cx="300" cy="300" r="100" fill="url(#ctaCenterGlow)" />
          <circle cx="300" cy="300" r="10"
            fill="url(#ctaBgGrad)" opacity="0.30" />
        </svg>
      </div>

      {/* ── Soft lilac halo behind content ── */}
      <div
        className="absolute inset-x-0 top-1/3 h-[420px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 45% 55% at 50% 50%, rgba(167,139,250,0.14), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* ── Content — floats cleanly over the orbital background ── */}
      <div className="relative text-center flex flex-col items-center reveal">

        {/* Brand eyebrow — replaces the problematic floating logo */}
        <div className="eyebrow tracking-[0.32em] mb-10 opacity-70">
          Lacus &nbsp;·&nbsp; Protocol
        </div>

        <h2 className="font-display text-[var(--ink)] text-[3.6rem] md:text-[5.2rem] leading-[0.98] tracking-tight max-w-[22ch]">
          Fixed income.
          <span className="italic grad-ink-interactive cursor-pointer"> Open, finally.</span>
        </h2>

        <p className="mt-8 text-[var(--ink2)] text-[1.05rem] leading-[1.65] max-w-[52ch]">
          Lacus is infrastructure for debt markets that work the way they should:
          transparent, accessible, and auditable by anyone. Whether you&apos;re
          raising or deploying capital.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/launchpad"
            className="btn-primary btn-magnetic px-8 py-4 text-[0.92rem] inline-flex items-center gap-3"
          >
            Launch the App
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8m0 0L7 3m4 4L7 11"
                stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link href="#" className="btn-ghost btn-magnetic px-8 py-4 text-[0.92rem]">
            Apply as Issuer
          </Link>
        </div>
      </div>
    </section>
  );
}
