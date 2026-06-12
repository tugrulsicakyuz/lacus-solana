"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate, timestampToMonths } from "@/lib/format";
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

function getBondStatus(bond: { filled_percentage: number; maturityTimestamp: number }): "live" | "ended" {
  const now = Math.floor(Date.now() / 1000);
  if (bond.filled_percentage >= 100 || bond.maturityTimestamp < now) return "ended";
  return "live";
}

export default function LaunchpadPage() {
  const headerCanvasRef = useRef<HTMLCanvasElement>(null);
  const featuredCanvasRef = useRef<HTMLCanvasElement>(null);

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
            maturity_date: formatDate(maturityTimestamp),
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

  // Header canvas: drifting gold lines
  useEffect(() => {
    const canvas = headerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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

  // Scroll reveal: GlobalInteractions yönetir; bar dolumu CSS ile
  // (.reveal.visible .launch-bar-fill) tetiklenir

  const featuredBond = bonds.find(b => b.status === "live") || bonds[0];

  return (
      <div className="launchpad-root" style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
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
          <div style={{ textAlign: "center", padding: "120px 0", fontFamily: "var(--font-dm-mono)", fontSize: "14px", color: "var(--ink-dim)" }}>
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
  );
}
