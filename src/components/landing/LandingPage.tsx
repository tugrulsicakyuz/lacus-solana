"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function LandingPage() {
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const depthCanvasRef = useRef<HTMLCanvasElement>(null);

  // Hero Background — Fluid Particles
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let W: number, H: number;
    const particles: any[] = [];
    const mouse = { x: -999, y: -999 };

    function resize() {
      if (!canvas) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    class Particle {
      x: number;
      y: number;
      ox: number;
      oy: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      speed: number;
      angle: number;
      wobble: number;

      constructor() {
        this.x = 0;
        this.y = 0;
        this.ox = 0;
        this.oy = 0;
        this.vx = 0;
        this.vy = 0;
        this.size = 0;
        this.opacity = 0;
        this.speed = 0;
        this.angle = 0;
        this.wobble = 0;
        this.reset();
      }
      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.ox = this.x;
        this.oy = this.y;
        this.vx = 0;
        this.vy = 0;
        this.size = Math.random() * 1.5 + 0.3;
        this.opacity = Math.random() * 0.4 + 0.05;
        this.speed = Math.random() * 0.3 + 0.05;
        this.angle = Math.random() * Math.PI * 2;
        this.wobble = Math.random() * 0.02 + 0.005;
      }
      update(t: number) {
        this.angle += this.wobble;
        this.ox += Math.cos(this.angle + t * 0.0002) * this.speed * 0.3;
        this.oy += Math.sin(this.angle * 1.3 + t * 0.0003) * this.speed * 0.2;

        const dx = mouse.x - this.x,
          dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const force = (180 - dist) / 180;
          this.vx -= (dx / dist) * force * 1.5;
          this.vy -= (dy / dist) * force * 1.5;
        }

        this.x += (this.ox - this.x) * 0.04 + this.vx * 0.3;
        this.y += (this.oy - this.y) * 0.04 + this.vy * 0.3;
        this.vx *= 0.9;
        this.vy *= 0.9;

        if (this.ox < -50) this.ox = W + 50;
        if (this.ox > W + 50) this.ox = -50;
        if (this.oy < -50) this.oy = H + 50;
        if (this.oy > H + 50) this.oy = -50;
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,149,42,${this.opacity})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle());

    const heroElement = document.getElementById("hero");
    if (heroElement) {
      const handleMouseMove = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      };
      const handleMouseLeave = () => {
        mouse.x = -999;
        mouse.y = -999;
      };
      heroElement.addEventListener("mousemove", handleMouseMove);
      heroElement.addEventListener("mouseleave", handleMouseLeave);
    }

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // subtle radial vignette
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, "rgba(13,11,8,0.6)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 8100) { // 90²
            const d = Math.sqrt(d2);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(201,149,42,${(1 - d / 90) * 0.06})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        p.update(t);
        p.draw();
      });
      heroRafId = requestAnimationFrame(draw);
    }
    let heroRafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(heroRafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Depth Canvas — Ripple Rings
  useEffect(() => {
    const canvas = depthCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let W: number, H: number;
    const rings: any[] = [];
    const mouse = { x: 0, y: 0 };

    function resize() {
      if (!canvas) return;
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      mouse.x = W / 2;
      mouse.y = H / 2;
    }
    resize();
    window.addEventListener("resize", resize);

    const parentElement = canvas.parentElement;
    if (parentElement) {
      const handleMouseMove = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      };
      parentElement.addEventListener("mousemove", handleMouseMove);
    }

    function addRing(x: number, y: number, auto: boolean) {
      rings.push({
        x,
        y,
        r: 0,
        maxR: Math.min(W, H) * 0.6,
        opacity: auto ? 0.12 : 0.22,
      });
    }

    let lastAuto = 0;
    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // auto pulse rings from center
      if (t - lastAuto > 2200) {
        addRing(W / 2, H / 2, true);
        lastAuto = t;
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        if (rings[i].opacity <= 0.001) {
          rings.splice(i, 1);
        }
      }
      rings.forEach((ring) => {
        ring.r += 1.8;
        ring.opacity *= 0.985;
        for (let i = 4; i > 0; i--) {
          const r = Math.max(0, ring.r - i * 4);
          if (r === 0) continue;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(201,149,42,${ring.opacity * (1 - i / 5) * 0.4})`;
          ctx.lineWidth = i * 0.5;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201,149,42,${ring.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // center dot
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,149,42,0.4)`;
      ctx.fill();

      depthRafId = requestAnimationFrame(draw);
    }

    if (parentElement) {
      const handleClick = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        addRing(e.clientX - r.left, e.clientY - r.top, false);
      };
      parentElement.addEventListener("click", handleClick);
    }

    let depthRafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(depthRafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Hero Letter Parallax
  useEffect(() => {
    const letters = document.querySelectorAll(".letter");
    const hero = document.getElementById("hero");
    if (!hero || !letters.length) return;

    let cx = 0,
      cy = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      cx = (e.clientX - r.left - r.width / 2) / r.width;
      cy = (e.clientY - r.top - r.height / 2) / r.height;
    };
    const handleMouseLeave = () => {
      cx = 0;
      cy = 0;
    };

    hero.addEventListener("mousemove", handleMouseMove);
    hero.addEventListener("mouseleave", handleMouseLeave);

    const targets = Array.from(letters).map((_, i) => ({
      rx: (i - 2) * 8,
      ry: (i - 2) * 4,
      s: 1,
    }));
    const current = targets.map(() => ({ rx: 0, ry: 0, s: 1 }));

    function tick() {
      letters.forEach((el, i) => {
        const tRx = cx * targets[i].rx * 1.5;
        const tRy = cy * targets[i].ry + cx * 6;
        const tS = 1 + Math.abs(cx) * 0.04;
        current[i].rx += (tRx - current[i].rx) * 0.1;
        current[i].ry += (tRy - current[i].ry) * 0.1;
        current[i].s += (tS - current[i].s) * 0.1;
        (el as HTMLElement).style.transform = `rotate(${current[i].rx}deg) translateY(${current[i].ry}px) scaleY(${current[i].s})`;
      });
      requestAnimationFrame(tick);
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(tick);
    }

    return () => {
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Typed Text
  useEffect(() => {
    const el = document.getElementById("typedText");
    if (!el) return;

    const phrases = [
      "Fixed income, open to every company.",
      "Your startup can issue a bond today.",
      "Build the portfolio CDOs never let you see.",
      "Two parties. One agreement. On-chain.",
    ];
    let pi = 0,
      ci = 0,
      deleting = false;
    let timeoutId: NodeJS.Timeout;

    function type() {
      if (!el) return;
      const txt = phrases[pi];
      if (!deleting) {
        ci++;
        el.textContent = txt.slice(0, ci);
        if (ci === txt.length) {
          deleting = true;
          timeoutId = setTimeout(type, 2800);
          return;
        }
        timeoutId = setTimeout(type, 38);
      } else {
        ci--;
        el.textContent = txt.slice(0, ci);
        if (ci === 0) {
          deleting = false;
          pi = (pi + 1) % phrases.length;
          timeoutId = setTimeout(type, 400);
          return;
        }
        timeoutId = setTimeout(type, 18);
      }
    }
    timeoutId = setTimeout(type, 1200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Ticker
  useEffect(() => {
    const data = [
      { label: "Avg. Yield", val: "14–25%" },
      { label: "Settlement", val: "T+0" },
      { label: "Structure", val: "Loan Agreement" },
      { label: "Transparency", val: "100%" },
      { label: "Secondary", val: "P2P" },
      { label: "Min. Investment", val: "Any Amount" },
      { label: "Access", val: "KYC-Gated" },
      { label: "Issuers", val: "Open to All" },
    ];
    const track = document.getElementById("ticker");
    if (!track) return;

    const html = data
      .map(
        (d) =>
          `<span class="ticker-item"><span class="dot"></span>${d.label}<span class="val">${d.val}</span></span>`
      )
      .join("");
    track.innerHTML = html.repeat(6);
  }, []);

  // Stat sayaçları — reveal görünürlüğünü GlobalInteractions yönetir
  useEffect(() => {
    const counted = new Set();

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const counter = e.target.querySelector(".count");
          if (counter && !counted.has(counter)) {
            counted.add(counter);
            const target = parseFloat(counter.getAttribute("data-target") || "0");
            const dec = parseInt(counter.getAttribute("data-decimal") || "0");
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              counter.textContent = target.toFixed(dec);
            } else {
              const dur = 1800;
              const start = performance.now();
              (function tick(now: number) {
                const p = Math.min((now - start) / dur, 1);
                const ease = 1 - Math.pow(1 - p, 3);
                counter.textContent = (target * ease).toFixed(dec);
                if (p < 1) requestAnimationFrame(tick);
              })(start);
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".stat-cell").forEach((el) => obs.observe(el));

    return () => {
      obs.disconnect();
    };
  }, []);

  // Scramble on Hover
  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_/\\|";
    document.querySelectorAll(".protocol-item").forEach((item) => {
      const el = item.querySelector(".scramble") as HTMLElement | null;
      if (!el) return;
      const orig = el.dataset.original || "";
      let frame = 0,
        active = false,
        raf: number;

      const handleMouseEnter = () => {
        if (!el || active) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        active = true;
        frame = 0;
        cancelAnimationFrame(raf);
        (function tick() {
          if (!el) return;
          frame++;
          el.textContent = orig
            .split("")
            .map((c, i) => {
              if (frame > i * 2) return c;
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("");
          if (frame < orig.length * 2 + 5) raf = requestAnimationFrame(tick);
          else {
            el.textContent = orig;
            active = false;
          }
        })();
      };

      item.addEventListener("mouseenter", handleMouseEnter);
    });
  }, []);

  // Magnetic Button
  useEffect(() => {
    document.querySelectorAll(".btn-magnetic, .btn-primary").forEach((btn) => {
      const handleMouseMove = (e: MouseEvent) => {
        const r = (btn as HTMLElement).getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        (btn as HTMLElement).style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
      };
      const handleMouseLeave = () => {
        (btn as HTMLElement).style.transform = "";
        (btn as HTMLElement).style.transition = "transform 0.5s cubic-bezier(0.16,1,0.3,1)";
        setTimeout(() => ((btn as HTMLElement).style.transition = ""), 500);
      };
      btn.addEventListener("mousemove", handleMouseMove as any);
      btn.addEventListener("mouseleave", handleMouseLeave);
    });
  }, []);

  // Parallax Sections on Scroll
  useEffect(() => {
    const hero = document.getElementById("hero");
    const title = document.querySelector(".hero-title") as HTMLElement;
    if (!hero || !title) return;

    const handleScroll = () => {
      const y = window.scrollY;
      title.style.transform = `translateY(${y * 0.25}px)`;
      hero.style.opacity = String(1 - y / (window.innerHeight * 0.9));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      {/* HERO */}
      <section id="hero">
        <canvas ref={heroCanvasRef} className="hero-bg-canvas" id="heroCanvas"></canvas>

        <div className="hero-title-wrap">
          <div className="hero-title" id="heroTitle">
            <span className="letter" data-char="L">
              L
            </span>
            <span className="letter" data-char="A">
              A
            </span>
            <span className="letter" data-char="C">
              C
            </span>
            <span className="letter" data-char="U">
              U
            </span>
            <span className="letter" data-char="S">
              S
            </span>
          </div>
        </div>

        <div className="hero-sub">
          <p className="hero-tagline">
            <span id="typedText"></span>
            <span className="typed-cursor">|</span>
          </p>
          <div className="hero-meta">
            Credit Protocol
            <br />
            v0.1 — Open Beta
            <br />
            <span style={{ color: "var(--moss)" }}>●</span> Testnet Live
          </div>
        </div>

        <div className="hero-actions reveal">
          <Link href="/manage/issue" className="btn-primary">
            <span>Issue a Bond</span>
            <div className="btn-arrow"></div>
          </Link>
          <Link href="/launchpad" className="btn-ghost">
            <span>Explore Markets</span>
          </Link>
        </div>

        <div className="hero-scroll-hint">
          <div className="scroll-line"></div>
          scroll
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-track" id="ticker"></div>
      </div>

      {/* MANIFESTO */}
      <section id="manifesto">
        <div className="manifesto-label reveal" style={{ "--i": 0 } as any}>
          §01 — The Problem
        </div>
        <div className="manifesto-body reveal" style={{ "--i": 1 } as any}>
          Startups scale at startup speed.
          <br />
          <em>Banks still laugh.</em>
          <br />
          <br />
          Bond markets have always belonged to governments and large corporations.
          <br />
          Retail investors get <em>CDOs</em> — opaque packages
          <br />
          nobody understood, until 2008.
          <br />
          <br />
          LACUS changes the equation:
          <br />
          <em>any company</em> can issue debt, <em>any investor</em> can buy it,
          <br />
          and every term is on-chain — <strong>always.</strong>
        </div>
      </section>

      {/* STATS */}
      <section id="stats">
        <div className="stat-cell reveal" style={{ "--i": 0 } as any}>
          <div className="stat-number">
            <span className="count" data-target="8" data-decimal="0">
              0
            </span>
            <span className="stat-suffix">–25%</span>
          </div>
          <div className="stat-label">Target Yield Range</div>
          <div className="stat-sub">Issuer-set rates. Market-discovered. No intermediary taking the spread.</div>
        </div>
        <div className="stat-cell reveal" style={{ "--i": 1 } as any}>
          <div className="stat-number" style={{ fontSize: "clamp(48px, 6vw, 80px)" }}>
            T+0
          </div>
          <div className="stat-label">Settlement</div>
          <div className="stat-sub">Instant finality. No valor dates. Your capital moves the moment the deal closes.</div>
        </div>
        <div className="stat-cell reveal" style={{ "--i": 2 } as any}>
          <div className="stat-number">
            <span className="count" data-target="100" data-decimal="0">
              0
            </span>
            <span className="stat-suffix">%</span>
          </div>
          <div className="stat-label">On-Chain Transparency</div>
          <div className="stat-sub">Every term, every position, every issuer document — visible to all. Not a CDO.</div>
        </div>
      </section>

      {/* PROTOCOL LAYERS */}
      <section id="protocol">
        <div className="protocol-header reveal">
          <div className="protocol-title">
            Three
            <br />
            Parties.
          </div>
          <p className="protocol-desc">
            Traditional credit markets kept issuers, investors, and liquidity in separate rooms.
            LACUS puts them on the same table.
          </p>
        </div>
        <div className="protocol-items reveal-stagger">
          <div className="protocol-item reveal" style={{ "--i": 0 } as any}>
            <div className="protocol-num">i.</div>
            <div className="protocol-name scramble" data-original="ISSUERS">
              ISSUERS
            </div>
            <div className="protocol-text">
              Startups to enterprises. Set your rate, your term, your conditions. Upload financials,
              sign the loan agreement on-chain. Capital without dilution.
            </div>
          </div>
          <div className="protocol-item reveal" style={{ "--i": 1 } as any}>
            <div className="protocol-num">ii.</div>
            <div className="protocol-name scramble" data-original="INVESTORS">
              INVESTORS
            </div>
            <div className="protocol-text">
              Retail to institutional. Browse verified issuers, build your yield portfolio, and know
              exactly what you hold — every position transparent, unlike a CDO.
            </div>
          </div>
          <div className="protocol-item reveal" style={{ "--i": 2 } as any}>
            <div className="protocol-num">iii.</div>
            <div className="protocol-name scramble" data-original="MARKETS">
              MARKETS
            </div>
            <div className="protocol-text">
              P2P secondary trading. Your position is yours to hold or transfer. No central
              counterparty, no lockups, no waiting for a fund to redeem.
            </div>
          </div>
        </div>
      </section>

      {/* DEPTH VISUAL */}
      <section id="depth">
        <canvas ref={depthCanvasRef} className="depth-canvas" id="depthCanvas"></canvas>
        <div className="depth-text reveal">
          &quot;Capital has no geography on-chain.
          <br />
          Debt has no minimum when the contract lives on a ledger.&quot;
        </div>
      </section>

      {/* CTA */}
      <section id="cta">
        <div className="cta-eyebrow reveal">Open Beta — Q2 2026</div>
        <div className="cta-headline reveal">
          <span className="accent">Issue.</span>
          <br />
          <span className="accent">Invest.</span>
          <span className="line2">finally in the same place</span>
        </div>
        <Link href="/launchpad" className="btn-magnetic reveal" id="ctaBtn">
          <span>Enter the Market</span>
          <div className="btn-arrow"></div>
        </Link>
      </section>

    </>
  );
}
