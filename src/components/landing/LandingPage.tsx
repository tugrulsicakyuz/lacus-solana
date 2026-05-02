"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function LandingPage() {
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const depthCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);

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

  // Hero Background — Fluid Particles
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    for (let i = 0; i < 160; i++) particles.push(new Particle());

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
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(201,149,42,${((1 - d / 90) * 0.06)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        p.update(t);
        p.draw();
      });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Depth Canvas — Ripple Rings
  useEffect(() => {
    const canvas = depthCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

      requestAnimationFrame(draw);
    }

    if (parentElement) {
      const handleClick = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        addRing(e.clientX - r.left, e.clientY - r.top, false);
      };
      parentElement.addEventListener("click", handleClick);
    }

    requestAnimationFrame(draw);

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
      dot.style.left = mx + "px";
      dot.style.top = my + "px";
    };
    document.addEventListener("mousemove", handleMouseMove);

    function lerp() {
      if (!ring) return;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
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
    requestAnimationFrame(tick);

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

  // Scroll Reveal + Counter
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    const counted = new Set();

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("visible");

          // counters
          const cell = e.target.classList.contains("stat-cell")
            ? e.target
            : e.target.closest(".stat-cell");
          if (!cell) return;
          const counter = cell.querySelector(".count");
          if (counter && !counted.has(counter)) {
            counted.add(counter);
            const target = parseFloat(counter.getAttribute("data-target") || "0");
            const dec = parseInt(counter.getAttribute("data-decimal") || "0");
            const dur = 1800;
            const start = performance.now();
            (function tick(now: number) {
              const p = Math.min((now - start) / dur, 1);
              const ease = 1 - Math.pow(1 - p, 3);
              counter.textContent = (target * ease).toFixed(dec);
              if (p < 1) requestAnimationFrame(tick);
            })(start);
          }
        });
      },
      { threshold: 0.15 }
    );

    reveals.forEach((el) => obs.observe(el));

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
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:ital,wght@0,300;0,400;1,300&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&display=swap");

        *,
        *::before,
        *::after {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --bg: #0d0b08;
          --ink: #f0e8d8;
          --ink-dim: #7a6f60;
          --gold: oklch(0.72 0.14 72);
          --copper: oklch(0.52 0.13 38);
          --moss: oklch(0.48 0.09 145);
          --rule: rgba(240, 232, 216, 0.12);
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background: var(--bg);
          color: var(--ink);
          font-family: "DM Mono", monospace;
          cursor: none;
          overflow-x: hidden;
        }

        /* ── CURSOR ─────────────────────────────────────── */
        #cursor-dot {
          position: fixed;
          width: 8px;
          height: 8px;
          background: var(--gold);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          transition: transform 0.05s, opacity 0.2s;
          mix-blend-mode: difference;
        }
        #cursor-ring {
          position: fixed;
          width: 40px;
          height: 40px;
          border: 1px solid var(--gold);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9998;
          transform: translate(-50%, -50%);
          transition: width 0.3s, height 0.3s, border-color 0.3s, opacity 0.3s;
          opacity: 0.5;
        }
        body.cursor-hover #cursor-ring {
          width: 70px;
          height: 70px;
          border-color: var(--copper);
          opacity: 0.9;
        }

        /* ripple pool */
        .ripple {
          position: fixed;
          border-radius: 50%;
          border: 1px solid var(--gold);
          pointer-events: none;
          z-index: 9990;
          transform: translate(-50%, -50%) scale(0);
          opacity: 0.6;
          animation: rippleOut 1.4s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
        }
        @keyframes rippleOut {
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        /* ── GRAIN OVERLAY ─────────────────────────────── */
        #grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9000;
          opacity: 0.035;
        }

        /* ── HERO ───────────────────────────────────────── */
        #hero {
          position: relative;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 0 48px 64px;
          overflow: hidden;
        }

        .hero-bg-canvas {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .hero-title-wrap {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: flex-end;
          gap: 0;
          line-height: 0.85;
        }

        .hero-title {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(120px, 20vw, 280px);
          letter-spacing: -0.02em;
          color: var(--ink);
          display: flex;
          user-select: none;
        }

        .hero-title .letter {
          display: inline-block;
          transform-origin: bottom center;
          will-change: transform;
          transition: color 0.4s;
        }

        .hero-sub {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--rule);
        }

        .hero-tagline {
          font-family: "Cormorant Garamond", serif;
          font-style: italic;
          font-size: clamp(18px, 2.2vw, 32px);
          font-weight: 300;
          color: var(--ink-dim);
          max-width: 500px;
          line-height: 1.4;
        }

        .hero-tagline .typed-cursor {
          animation: blink 1s step-end infinite;
          color: var(--gold);
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        .hero-meta {
          text-align: right;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-dim);
          line-height: 2;
        }

        /* ── HERO BUTTONS ──────────────────────────────── */
        .hero-actions {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 40px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 16px 40px;
          border: 1px solid var(--gold);
          color: var(--ink);
          text-decoration: none;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
          cursor: none;
          will-change: transform;
        }
        .btn-primary::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--gold);
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-primary:hover {
          color: var(--bg);
        }
        .btn-primary:hover::before {
          transform: translateY(0);
        }
        .btn-primary span {
          position: relative;
          z-index: 1;
        }
        .btn-primary .btn-arrow {
          position: relative;
          z-index: 1;
          width: 16px;
          height: 1px;
          background: currentColor;
          transition: width 0.3s;
          flex-shrink: 0;
        }
        .btn-primary .btn-arrow::after {
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
        .btn-primary:hover .btn-arrow {
          width: 26px;
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 40px;
          border: 1px solid rgba(240, 232, 216, 0.18);
          color: var(--ink-dim);
          text-decoration: none;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
          cursor: none;
          transition: color 0.3s, border-color 0.3s;
        }
        .btn-ghost:hover {
          color: var(--ink);
          border-color: rgba(240, 232, 216, 0.3);
        }

        .hero-scroll-hint {
          position: absolute;
          right: 48px;
          bottom: 50%;
          transform: translateY(50%);
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          font-size: 9px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink-dim);
          writing-mode: vertical-lr;
        }
        .scroll-line {
          width: 1px;
          height: 60px;
          background: linear-gradient(to bottom, transparent, var(--gold));
          animation: scrollPulse 2s ease-in-out infinite;
        }
        @keyframes scrollPulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scaleY(0.6);
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        /* ── TICKER ─────────────────────────────────────── */
        .ticker-wrap {
          overflow: hidden;
          border-top: 1px solid var(--rule);
          border-bottom: 1px solid var(--rule);
          padding: 18px 0;
          background: var(--bg);
        }
        .ticker-track {
          display: flex;
          gap: 0;
          white-space: nowrap;
          animation: ticker 30s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 28px;
          padding: 0 28px;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-dim);
        }
        .ticker-item .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--gold);
          flex-shrink: 0;
        }
        .ticker-item .val {
          color: var(--gold);
        }

        /* ── SECTIONS COMMON ────────────────────────────── */
        section {
          position: relative;
        }

        .reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-stagger .reveal {
          transition-delay: calc(var(--i, 0) * 0.12s);
        }

        /* ── MANIFESTO ──────────────────────────────────── */
        #manifesto {
          padding: 140px 48px;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 80px;
          border-bottom: 1px solid var(--rule);
        }
        .manifesto-label {
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink-dim);
          padding-top: 8px;
        }
        .manifesto-body {
          font-family: "Cormorant Garamond", serif;
          font-size: clamp(28px, 3.5vw, 52px);
          font-weight: 300;
          line-height: 1.35;
          color: var(--ink);
        }
        .manifesto-body em {
          font-style: italic;
          color: var(--gold);
        }
        .manifesto-body strong {
          font-weight: 600;
          font-style: normal;
        }

        /* ── STATS ──────────────────────────────────────── */
        #stats {
          padding: 100px 48px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          background: var(--rule);
          border-bottom: 1px solid var(--rule);
        }
        .stat-cell {
          background: var(--bg);
          padding: 60px 48px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stat-number {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(64px, 8vw, 112px);
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--ink);
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .stat-suffix {
          font-family: "Bebas Neue", sans-serif;
          font-size: 0.4em;
          color: var(--gold);
        }
        .stat-label {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--ink-dim);
        }
        .stat-sub {
          font-size: 12px;
          color: var(--ink-dim);
          font-family: "DM Mono", monospace;
          font-style: italic;
          margin-top: auto;
          padding-top: 20px;
          border-top: 1px solid var(--rule);
          line-height: 1.6;
        }

        /* ── PROTOCOL ───────────────────────────────────── */
        #protocol {
          padding: 140px 0;
        }
        .protocol-header {
          padding: 0 48px 80px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid var(--rule);
        }
        .protocol-title {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(48px, 7vw, 100px);
          letter-spacing: -0.01em;
          line-height: 1;
        }
        .protocol-desc {
          max-width: 320px;
          font-size: 13px;
          color: var(--ink-dim);
          line-height: 1.8;
        }

        .protocol-items {
          display: flex;
          flex-direction: column;
        }
        .protocol-item {
          display: grid;
          grid-template-columns: 80px 1fr 1fr;
          gap: 0;
          padding: 56px 48px;
          border-bottom: 1px solid var(--rule);
          align-items: center;
          cursor: none;
          transition: background 0.4s;
          position: relative;
          overflow: hidden;
        }
        .protocol-item::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, oklch(0.72 0.14 72 / 0.04));
          transform: translateX(-100%);
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .protocol-item:hover::before {
          transform: translateX(0);
        }

        .protocol-num {
          font-family: "Cormorant Garamond", serif;
          font-style: italic;
          font-size: 15px;
          color: var(--gold);
          opacity: 0.8;
        }
        .protocol-name {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(36px, 5vw, 72px);
          letter-spacing: 0.02em;
          line-height: 1;
          color: var(--ink);
          transition: color 0.3s;
        }
        .protocol-item:hover .protocol-name {
          color: var(--gold);
        }
        .protocol-text {
          font-size: 13px;
          color: var(--ink-dim);
          line-height: 1.8;
          padding-left: 48px;
          border-left: 1px solid var(--rule);
        }

        /* ── DEPTH VISUAL ───────────────────────────────── */
        #depth {
          height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          border-top: 1px solid var(--rule);
          border-bottom: 1px solid var(--rule);
        }
        .depth-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .depth-text {
          position: relative;
          z-index: 2;
          text-align: center;
          font-family: "Cormorant Garamond", serif;
          font-style: italic;
          font-size: clamp(16px, 2.5vw, 28px);
          color: var(--ink);
          opacity: 0.7;
          line-height: 1.6;
          pointer-events: none;
          font-weight: 300;
          max-width: 600px;
        }

        /* ── CTA ─────────────────────────────────────────── */
        #cta {
          padding: 180px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 60px;
        }
        .cta-eyebrow {
          font-size: 10px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--ink-dim);
        }
        .cta-headline {
          font-family: "Bebas Neue", sans-serif;
          font-size: clamp(72px, 12vw, 180px);
          letter-spacing: -0.02em;
          line-height: 0.9;
          color: var(--ink);
        }
        .cta-headline .accent {
          color: var(--gold);
        }
        .cta-headline .line2 {
          display: block;
          padding-left: 2em;
          color: var(--ink-dim);
          font-size: 0.5em;
          font-family: "Cormorant Garamond", serif;
          font-style: italic;
          font-weight: 300;
          letter-spacing: 0;
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

        /* ── FOOTER ─────────────────────────────────────── */
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

        /* ── SCRAMBLE TEXT ──────────────────────────────── */
        .scramble {
          display: inline;
        }
      `}</style>

      {/* GRAIN */}
      <canvas ref={grainCanvasRef} id="grain"></canvas>

      {/* CURSOR */}
      <div ref={cursorDotRef} id="cursor-dot"></div>
      <div ref={cursorRingRef} id="cursor-ring"></div>

      {/* NAV */}
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

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">LACUS</div>
        <div className="footer-copy">© 2026 Lacus — Open credit infrastructure</div>
        <ul className="footer-links">
          <li>
            <a href="#">Docs</a>
          </li>
          <li>
            <a href="#">Github</a>
          </li>
          <li>
            <a href="#">Discord</a>
          </li>
          <li>
            <a href="#">Manifesto</a>
          </li>
        </ul>
      </footer>
    </>
  );
}
