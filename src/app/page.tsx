"use client";

import HeroSection from "@/components/HeroSection";
import PrinciplesSection from "@/components/PrinciplesSection";
import MarketsRegister from "@/components/MarketsRegister";
import CTASection from "@/components/CTASection";
import { useSpineFade } from "@/lib/useClientInteractions";

export default function Home() {
  // Spine fade is hero-specific: fades fixed spine elements as user scrolls past hero
  useSpineFade();

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }}>
        <defs>
          <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="45%" stopColor="#a5f3fc" />
            <stop offset="70%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative">
        <HeroSection />
        <PrinciplesSection />
        <MarketsRegister />
        <CTASection />
      </div>
    </>
  );
}
