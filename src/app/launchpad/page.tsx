"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLacusProgram } from '@/hooks/useLacus';
import type { BondState } from '@/types/lacus';

interface Bond {
  bondId: number;
  issuer: string;
  issuer_name: string;
  symbol: string;
  name: string;
  apy: number;
  maturity_months: number;
  maturity_date: string;
  total_issue_size: number;
  price_per_token: number;
  filled_percentage: number;
  faceValue: number;
  couponRateBps: number;
  maxSupply: number;
  tokensSold: number;
  maturityTimestamp: number;
  description?: string;
  logo_url?: string;
  status: "live" | "ended";
}

function timestampToMonths(timestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.round((timestamp - now) / (30 * 24 * 60 * 60)));
}

function formatMaturityDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getBondStatus(bond: { filled_percentage: number; maturityTimestamp: number }): "live" | "ended" {
  const now = Math.floor(Date.now() / 1000);
  if (bond.filled_percentage >= 100 || bond.maturityTimestamp < now) return "ended";
  return "live";
}

export default function LaunchpadPage() {
  const headerCanvasRef = useRef<HTMLCanvasElement>(null);
  const featuredCanvasRef = useRef<HTMLCanvasElement>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);

  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "ended">("all");
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchAllBonds } = useLacusProgram();

  const filtered = activeFilter === "all" ? bonds : bonds.filter(b => b.status === activeFilter);

  useEffect(() => {
    async function fetchBonds() {
      setLoading(true);
      try {
        const onChainBonds = await fetchAllBonds();
        if (!onChainBonds || onChainBonds.length === 0) {
          const { data } = await supabase.from("bonds").select("*").eq("documents_complete", true).order("id", { ascending: true });
          const fallback: Bond[] = (data || []).map((b: any) => ({
            bondId: b.id, issuer: '', issuer_name: b.issuer_name || b.symbol || b.name || 'Unknown',
            symbol: b.symbol || '', name: b.name || b.issuer_name || b.symbol || 'Unnamed Bond', apy: b.apy || 0,
            maturity_months: b.maturity_months || 0, maturity_date: '',
            total_issue_size: b.total_issue_size || 0, price_per_token: b.price_per_token || 0,
            filled_percentage: b.filled_percentage || 0, faceValue: 0, couponRateBps: 0,
            maxSupply: 0, tokensSold: 0, maturityTimestamp: 0,
            description: b.description, logo_url: b.logo_url,
            status: getBondStatus({ filled_percentage: b.filled_percentage || 0, maturityTimestamp: 0 }),
          }));
          setBonds(fallback);
          return;
        }
        const { data: meta } = await supabase.from('bonds').select('symbol, issuer_name, description, logo_url');
        const merged: Bond[] = onChainBonds.map((bond: BondState, i: number) => {
          const m = meta?.find((s: any) => s.symbol?.toLowerCase() === bond.symbol?.toLowerCase()) || meta?.[i];
          const faceValueSOL = Number(bond.faceValue) / 1_000_000_000;
          const maxSupply = Number(bond.maxSupply);
          const tokensSold = Number(bond.tokensSold);
          const filled = maxSupply > 0 ? Math.min((tokensSold / maxSupply) * 100, 100) : 0;
          const maturityTimestamp = Number(bond.maturityTimestamp);
          return {
            bondId: Number(bond.bondId), issuer: bond.issuer.toString(),
            issuer_name: m?.issuer_name || bond.name || bond.symbol || bond.issuer.toString().slice(0, 8) + '...',
            symbol: bond.symbol || `BOND-${Number(bond.bondId)}`,
            name: bond.name || m?.issuer_name || bond.symbol || 'Unnamed Bond', apy: bond.couponRateBps / 100,
            maturity_months: timestampToMonths(maturityTimestamp),
            maturity_date: formatMaturityDate(maturityTimestamp),
            total_issue_size: faceValueSOL * maxSupply, price_per_token: faceValueSOL,
            filled_percentage: filled, faceValue: Number(bond.faceValue),
            couponRateBps: bond.couponRateBps, maxSupply, tokensSold, maturityTimestamp,
            description: m?.description || 'On-chain tokenized bond', logo_url: m?.logo_url || null,
            status: getBondStatus({ filled_percentage: filled, maturityTimestamp }),
          };
        });
        setBonds(merged);
      } catch (err) {
        console.error('Failed to fetch bonds:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBonds();
  }, []);

  // Grain Canvas Effect
  useEffect(() => {
    const canvas = grainCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function renderGrain() {
      if (!canvas || !ctx) return;
      const w = canvas.width,
        h = canvas.height;
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      frame++;
      if (frame % 3 === 0) requestAnimationFrame(renderGrain);
      else setTimeout(() => requestAnimationFrame(renderGrain), 60);
    }
    renderGrain();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Cursor
  useEffect(() => {
    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx - 4}px,${my - 4}px,0)`;
    };
    document.addEventListener("mousemove", handleMouseMove);

    function lerp() {
      if (!ring) return;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate3d(${rx - 20}px,${ry - 20}px,0)`;
      requestAnimationFrame(lerp);
    }
    requestAnimationFrame(lerp);

    // ripple on click
    const handleClick = (e: MouseEvent) => {
      const el = document.createElement("div");
      el.className = "ripple";
      el.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:80px;height:80px;`;
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    };
    document.addEventListener("click", handleClick);

    const handleCursorHover = () => document.body.classList.add("cursor-hover");
    const handleCursorLeave = () => document.body.classList.remove("cursor-hover");

    document
      .querySelectorAll(
        "a, button, .protocol-item, .btn-magnetic, .btn-primary, .btn-ghost, .nav-cta"
      )
      .forEach((el) => {
        el.addEventListener("mouseenter", handleCursorHover);
        el.addEventListener("mouseleave", handleCursorLeave);
      });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  // Header canvas: drifting gold lines
  useEffect(() => {
    const canvas = headerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W: number, H: number;
    let animationId: number;

    function resize() {
      if (!canvas) return;
      setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        W = canvas.width = rect.width || 800;
        H = canvas.height = rect.height || 400;
      }, 50);
    }
    resize();
    window.addEventListener("resize", resize);

    const lines: any[] = [];
    for (let i = 0; i < 20; i++)
      lines.push({
        x: Math.random() * 1.2 - 0.1,
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0002,
        vy: (Math.random() - 0.5) * 0.0001,
        opacity: Math.random() * 0.15 + 0.02,
      });

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      lines.forEach((l) => {
        l.x += l.vx;
        l.y += l.vy;
        if (l.x < -0.1) l.x = 1.1;
        if (l.x > 1.1) l.x = -0.1;
        if (l.y < -0.1) l.y = 1.1;
        if (l.y > 1.1) l.y = -0.1;
        ctx.beginPath();
        ctx.moveTo(l.x * W - W, l.y * H);
        ctx.lineTo(l.x * W + W * 2, l.y * H + Math.sin(t * 0.0003 + l.x * 4) * 30);
        ctx.strokeStyle = `rgba(201,149,42,${l.opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
      animationId = requestAnimationFrame(draw);
    }
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Featured canvas: orbital ellipses
  useEffect(() => {
    const canvas = featuredCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W: number, H: number;
    let animationId: number;

    function resize() {
      if (!canvas) return;
      setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        W = canvas.width = rect.width || 800;
        H = canvas.height = rect.height || 400;
      }, 50);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2,
        cy = H / 2;
      for (let i = 1; i <= 6; i++) {
        const rad = i * 50 + Math.sin(t * 0.001 + i) * 10;
        const a = t * 0.0004 * (i % 2 === 0 ? 1 : -1);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rad, rad * 0.3, a, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201,149,42,${0.06 + i * 0.015})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // dot on orbit
        const dx = Math.cos(a + t * 0.001 * i) * rad;
        const dy = Math.sin(a + t * 0.001 * i) * rad * 0.3;
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, Math.max(0, 2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,149,42,${0.5 + i * 0.05})`;
        ctx.fill();
      }
      animationId = requestAnimationFrame(draw);
    }
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Scroll reveal
  useEffect(() => {
    const timer = setTimeout(() => {
      const reveals = document.querySelectorAll('.launchpad-root .reveal');
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            const bar = e.target.querySelector('.launch-bar-fill');
            if (bar) setTimeout(() => bar.classList.add('animate'), 300);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(el => obs.observe(el));
      return () => obs.disconnect();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const featuredBond = bonds.find(b => b.status === "live") || bonds[0];

  return (
    <>
      <style>{`
        .launchpad-root { cursor: none; }
        #grain { position: fixed; inset: 0; pointer-events: none; z-index: 9000; opacity: 0.035; }
        #cursor-dot { position: fixed; top: 0; left: 0; width: 8px; height: 8px; background: var(--gold); border-radius: 50%; pointer-events: none; z-index: 9999; will-change: transform; mix-blend-mode: difference; }
        #cursor-ring { position: fixed; top: 0; left: 0; width: 40px; height: 40px; border: 1px solid var(--gold); border-radius: 50%; pointer-events: none; z-index: 9998; will-change: transform; transition: width 0.3s, height 0.3s, border-color 0.3s, opacity 0.3s; opacity: 0.5; }
        body.cursor-hover #cursor-ring { width: 70px; height: 70px; border-color: var(--copper); opacity: 0.9; }
        .ripple { position: fixed; border-radius: 50%; border: 1px solid var(--gold); pointer-events: none; z-index: 9990; transform: translate(-50%,-50%) scale(0); opacity: 0.6; animation: rippleOut 1.4s cubic-bezier(0.2,0.8,0.4,1) forwards; }
        @keyframes rippleOut { to { transform: translate(-50%,-50%) scale(1); opacity: 0; } }
        .launchpad-root { background: var(--bg) !important; color: var(--ink); }
        .launchpad-root * { box-sizing: border-box; }

        .reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* HEADER */
        #header {
          padding: 80px 48px 100px;
          border-bottom: 1px solid var(--rule);
          position: relative;
          overflow: hidden;
        }
        .header-canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .header-eyebrow {
          font-size: 10px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-bottom: 32px;
          position: relative;
          z-index: 2;
        }
        .header-title {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(80px, 14vw, 200px);
          letter-spacing: -0.02em;
          line-height: 0.9;
          position: relative;
          z-index: 2;
        }
        .header-title .gold {
          color: var(--gold);
        }
        .header-right {
          position: absolute;
          right: 48px;
          bottom: 100px;
          z-index: 2;
          text-align: right;
        }
        .header-right p {
          font-family: "Cormorant Garamond", serif;
          font-style: italic;
          font-size: 18px;
          font-weight: 300;
          color: var(--ink-dim);
          line-height: 1.6;
          max-width: 340px;
        }

        /* FILTER BAR */
        .filter-bar {
          padding: 28px 48px;
          border-bottom: 1px solid var(--rule);
          display: flex;
          gap: 4px;
          align-items: center;
          position: sticky;
          top: 78px;
          background: var(--bg);
          z-index: 50;
        }
        .filter-label {
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-right: 20px;
        }
        .filter-btn {
          padding: 8px 20px;
          border: 1px solid var(--rule);
          background: none;
          color: var(--ink-dim);
          font-family: "DM Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: none;
          transition: all 0.3s;
        }
        .filter-btn:hover {
          border-color: var(--gold);
          color: var(--ink);
        }
        .filter-btn.active {
          border-color: var(--gold);
          color: var(--gold);
          background: oklch(0.72 0.14 72 / 0.06);
        }
        .filter-spacer {
          flex: 1;
        }
        .filter-count {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: var(--ink-dim);
        }
        .filter-count span {
          color: var(--gold);
        }

        /* LAUNCH GRID */
        .launches-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          background: var(--rule);
          border-bottom: 1px solid var(--rule);
        }

        .launch-card {
          background: var(--bg);
          padding: 52px 44px;
          display: flex;
          flex-direction: column;
          gap: 0;
          cursor: none;
          position: relative;
          overflow: hidden;
          transition: background 0.4s;
          text-decoration: none;
          color: inherit;
        }
        .launch-card::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          transform: scaleX(0);
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .launch-card:hover::after {
          transform: scaleX(1);
        }
        .launch-card:hover {
          background: oklch(0.14 0.01 72 / 1);
        }

        .launch-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          margin-bottom: 40px;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-live .status-dot {
          background: var(--moss);
          box-shadow: 0 0 8px oklch(0.48 0.09 145 / 0.6);
          animation: pulse 2s ease-in-out infinite;
        }
        .status-upcoming .status-dot {
          background: var(--gold);
        }
        .status-ended .status-dot {
          background: var(--ink-dim);
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        .launch-num {
          font-family: "Cormorant Garamond", serif;
          font-style: italic;
          font-size: 13px;
          color: var(--ink-dim);
          margin-bottom: 16px;
        }
        .launch-name {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(40px, 4vw, 60px);
          letter-spacing: 0.02em;
          line-height: 1;
          color: var(--ink);
          margin-bottom: 8px;
          transition: color 0.3s;
        }
        .launch-card:hover .launch-name {
          color: var(--gold);
        }
        .launch-sub {
          font-size: 11px;
          color: var(--ink-dim);
          margin-bottom: 40px;
          line-height: 1.6;
        }

        .launch-bar-wrap {
          margin-bottom: 8px;
        }
        .launch-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-bottom: 10px;
        }
        .launch-bar-label span {
          color: var(--gold);
        }
        .launch-bar-track {
          width: 100%;
          height: 1px;
          background: var(--rule);
          position: relative;
        }
        .launch-bar-fill {
          height: 100%;
          background: var(--gold);
          transition: width 1.6s cubic-bezier(0.16, 1, 0.3, 1);
          width: 0;
        }
        .launch-bar-fill.animate {
          width: var(--fill);
        }

        .launch-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 36px;
          padding-top: 28px;
          border-top: 1px solid var(--rule);
        }
        .launch-meta-key {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-bottom: 6px;
        }
        .launch-meta-val {
          font-size: 14px;
          color: var(--ink);
        }

        .launch-arrow {
          position: absolute;
          right: 44px;
          bottom: 44px;
          width: 28px;
          height: 28px;
          border: 1px solid var(--rule);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .launch-arrow svg {
          width: 10px;
          height: 10px;
          fill: none;
          stroke: var(--ink-dim);
          stroke-width: 1.5;
          transition: stroke 0.3s;
        }
        .launch-card:hover .launch-arrow {
          border-color: var(--gold);
          transform: rotate(45deg);
        }
        .launch-card:hover .launch-arrow svg {
          stroke: var(--gold);
        }

        /* FEATURED */
        #featured {
          padding: 140px 48px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 120px;
          align-items: center;
          border-bottom: 1px solid var(--rule);
        }
        .featured-label {
          font-size: 10px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 28px;
        }
        .featured-title {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(60px, 7vw, 100px);
          letter-spacing: -0.01em;
          line-height: 0.9;
          margin-bottom: 36px;
        }
        .featured-body {
          font-family: "Cormorant Garamond", serif;
          font-style: italic;
          font-size: 22px;
          font-weight: 300;
          color: var(--ink-dim);
          line-height: 1.65;
          margin-bottom: 48px;
        }
        .featured-stats {
          display: flex;
          gap: 48px;
          padding-top: 36px;
          border-top: 1px solid var(--rule);
        }
        .featured-stat-num {
          font-family: "Bebas Neue", sans-serif;
          font-size: 48px;
          color: var(--ink);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .featured-stat-num .suf {
          font-size: 0.4em;
          color: var(--gold);
        }
        .featured-stat-lbl {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-top: 4px;
        }

        .featured-visual {
          position: relative;
          height: 440px;
        }
        .featured-canvas {
          width: 100%;
          height: 100%;
        }

        /* TIMELINE */
        #timeline {
          padding: 120px 48px;
          border-bottom: 1px solid var(--rule);
        }
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 80px;
        }
        .timeline-title {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(48px, 6vw, 80px);
          letter-spacing: -0.01em;
          line-height: 1;
        }
        .timeline-desc {
          max-width: 280px;
          font-size: 13px;
          color: var(--ink-dim);
          line-height: 1.8;
        }
        .timeline-track {
          position: relative;
          padding-left: 48px;
          border-left: 1px solid var(--rule);
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .timeline-item {
          padding: 40px 0 40px 48px;
          border-bottom: 1px solid var(--rule);
          display: grid;
          grid-template-columns: 200px 1fr 1fr;
          gap: 48px;
          align-items: center;
          position: relative;
          cursor: none;
          transition: background 0.3s;
        }
        .timeline-item:hover {
          background: oklch(0.14 0.01 72 / 0.6);
        }
        .timeline-dot {
          position: absolute;
          left: -25px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid var(--gold);
          background: var(--bg);
        }
        .timeline-dot.active {
          background: var(--gold);
          box-shadow: 0 0 12px oklch(0.72 0.14 72 / 0.5);
        }
        .timeline-date {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--ink-dim);
        }
        .timeline-name {
          font-family: "Bebas Neue", sans-serif;
          font-size: 36px;
          color: var(--ink);
        }
        .timeline-detail {
          font-size: 12px;
          color: var(--ink-dim);
          line-height: 1.7;
        }

        /* FOOTER */
        footer {
          padding: 48px;
          border-top: 1px solid var(--rule);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-logo {
          font-family: "Bebas Neue", sans-serif;
          font-size: 18px;
          letter-spacing: 0.2em;
        }
        .footer-copy {
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--ink-dim);
        }
        .footer-links {
          display: flex;
          gap: 28px;
          list-style: none;
        }
        .footer-links a {
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-dim);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: var(--ink);
        }

        .btn-magnetic {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          padding: 20px 48px;
          border: 1px solid var(--gold);
          color: var(--ink);
          text-decoration: none;
          font-size: 11px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          transition: background 0.3s, color 0.3s;
          position: relative;
          overflow: hidden;
          cursor: none;
          will-change: transform;
        }
        .btn-magnetic::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--gold);
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-magnetic:hover {
          color: var(--bg);
        }
        .btn-magnetic:hover::before {
          transform: translateY(0);
        }
        .btn-magnetic span {
          position: relative;
          z-index: 1;
        }
        .btn-arrow {
          position: relative;
          z-index: 1;
          width: 16px;
          height: 1px;
          background: currentColor;
          transition: width 0.3s;
          flex-shrink: 0;
        }
        .btn-arrow::after {
          content: "";
          position: absolute;
          right: 0;
          top: -3px;
          width: 6px;
          height: 6px;
          border-right: 1px solid currentColor;
          border-top: 1px solid currentColor;
          transform: rotate(45deg);
        }
        .btn-magnetic:hover .btn-arrow {
          width: 28px;
        }
      `}</style>

      <div className="launchpad-root" style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
        <canvas ref={grainCanvasRef} id="grain" />
        <div ref={cursorDotRef} id="cursor-dot"></div>
        <div ref={cursorRingRef} id="cursor-ring"></div>
        {/* HEADER */}
        <section id="header">
          <canvas ref={headerCanvasRef} className="header-canvas" />
          <div className="header-eyebrow reveal">§ Protocol — Origination Layer</div>
          <h1 className="header-title reveal">
            LAUNCH<span className="gold">PAD</span>
          </h1>
          <div className="header-right reveal">
            <p>
              Where new protocols surface.
              <br />
              Curated origination, zero-knowledge verified, depth-first.
            </p>
          </div>
        </section>

        {/* FILTER BAR */}
        <div className="filter-bar">
          <span className="filter-label">Filter</span>
          <button
            className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${activeFilter === "live" ? "active" : ""}`}
            onClick={() => setActiveFilter("live")}
          >
            Live
          </button>
          <button
            className={`filter-btn ${activeFilter === "ended" ? "active" : ""}`}
            onClick={() => setActiveFilter("ended")}
          >
            Ended
          </button>
          <div className="filter-spacer"></div>
          <div className="filter-count">
            <span>{filtered.length}</span> launches
          </div>
        </div>

        {/* BOND GRID */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "120px 0", fontFamily: "'DM Mono', monospace", fontSize: "14px", color: "var(--ink-dim)" }}>
            Loading...
          </div>
        ) : (
        <div className="launches-grid">
          {filtered.map((bond, idx) => (
            <Link
              key={bond.bondId}
              href={`/primary?bond=${bond.bondId}`}
              className="launch-card reveal"
              style={{ "--i": idx } as any}
            >
              <div className={`launch-status status-${bond.status}`}>
                <div className="status-dot"></div>
                {bond.status === "live" && "Live Now"}
                {bond.status === "ended" && "Completed"}
              </div>
              <div className="launch-num">{String(bond.bondId).padStart(3, "0")} /</div>
              <div className="launch-name">{(bond.name || bond.symbol || bond.issuer_name).split(" ")[0].toUpperCase()}</div>
              <div className="launch-sub">{bond.description}</div>
              <div className="launch-bar-wrap">
                <div className="launch-bar-label">
                  Filled <span>{bond.filled_percentage}%</span>
                </div>
                <div className="launch-bar-track">
                  <div
                    className="launch-bar-fill"
                    style={{ "--fill": `${bond.filled_percentage}%` } as any}
                  ></div>
                </div>
              </div>
              <div className="launch-meta">
                <div className="launch-meta-item">
                  <div className="launch-meta-key">Target</div>
                  <div className="launch-meta-val">${(bond.total_issue_size / 1000000).toFixed(1)}M</div>
                </div>
                <div className="launch-meta-item">
                  <div className="launch-meta-key">APY</div>
                  <div className="launch-meta-val">{bond.apy}%</div>
                </div>
                <div className="launch-meta-item">
                  <div className="launch-meta-key">Token</div>
                  <div className="launch-meta-val">{bond.symbol}</div>
                </div>
                <div className="launch-meta-item">
                  <div className="launch-meta-key">Maturity</div>
                  <div className="launch-meta-val">{bond.maturity_date}</div>
                </div>
              </div>
              <div className="launch-arrow">
                <svg viewBox="0 0 10 10">
                  <path d="M2 8L8 2M8 2H3M8 2V7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
        )}

        {/* FEATURED */}
        {featuredBond && (
          <section id="featured">
            <div>
              <div className="featured-label reveal">Featured Protocol</div>
              <h2 className="featured-title reveal">
                {featuredBond.issuer_name.split(" ")[0].toUpperCase()}
                <br />
                PRIVACY
                <br />
                MESH
              </h2>
              <p className="featured-body reveal">{featuredBond.description}</p>
              <Link href="/apply" className="btn-magnetic reveal">
                <span>Join Whitelist</span>
                <div className="btn-arrow"></div>
              </Link>
              <div className="featured-stats reveal" style={{ marginTop: "48px" }}>
                <div>
                  <div className="featured-stat-num">
                    {(featuredBond.total_issue_size / 1000000).toFixed(0)}
                    <span className="suf">M</span>
                  </div>
                  <div className="featured-stat-lbl">Target Raise</div>
                </div>
                <div>
                  <div className="featured-stat-num">2048</div>
                  <div className="featured-stat-lbl">Whitelist Spots</div>
                </div>
                <div>
                  <div className="featured-stat-num">
                    72<span className="suf">h</span>
                  </div>
                  <div className="featured-stat-lbl">Window</div>
                </div>
              </div>
            </div>
            <div className="featured-visual reveal">
              <canvas ref={featuredCanvasRef} className="featured-canvas" />
            </div>
          </section>
        )}

        {/* TIMELINE */}
        <section id="timeline">
          <div className="timeline-header">
            <div className="timeline-title reveal">
              Launch
              <br />
              Schedule.
            </div>
            <p className="timeline-desc reveal">
              Every protocol surfaces at depth. Q2 2026 — six originations, one direction.
            </p>
          </div>
          <div className="timeline-track">
            {bonds.map((bond) => (
              <div key={bond.bondId} className="timeline-item reveal">
                <div className={`timeline-dot ${bond.status === "ended" ? "active" : ""}`}></div>
                <div className="timeline-date">{bond.maturity_date}</div>
                <div className="timeline-name">{bond.issuer_name.split(" ")[0].toUpperCase()}</div>
                <div className="timeline-detail">
                  {bond.status === "ended"
                    ? `$${(bond.total_issue_size / 1000000).toFixed(1)}M raised — ${bond.filled_percentage}% filled`
                    : bond.description}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
