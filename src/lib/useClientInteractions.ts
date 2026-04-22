"use client";

import { useEffect } from "react";

/* ── Cursor orb ── */
export function useClientInteractions() {
  useEffect(() => {
    const orb = document.getElementById('cursor-orb');
    if (!orb) return;

    let mX = window.innerWidth / 2;
    let mY = window.innerHeight / 2;
    let oX = mX, oY = mY;
    let orbVisible = false;

    const handleMouseMove = (e: MouseEvent) => {
      mX = e.clientX; mY = e.clientY;
      if (!orbVisible) { orb.style.opacity = '1'; orbVisible = true; }
    };
    const handleMouseLeave = () => { orb.style.opacity = '0'; orbVisible = false; };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    function animateOrb() {
      if (!orb) return;
      oX += (mX - oX) * 0.07;
      oY += (mY - oY) * 0.07;
      orb.style.left = oX + 'px';
      orb.style.top  = oY + 'px';
      requestAnimationFrame(animateOrb);
    }
    animateOrb();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
}

/* ── Scroll reveal ── */
export function useScrollReveal() {
  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
        });
      },
      { threshold: 0.10, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── Animated counters ── */
export function useAnimatedCounters() {
  useEffect(() => {
    function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }

    function runCounter(el: HTMLElement) {
      const target   = parseFloat(el.dataset.target ?? '0');
      const decimals = parseInt(el.dataset.decimals ?? '0');
      const duration = 1600;
      const start    = performance.now();

      function tick(now: number) {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = (easeOutQuart(t) * target).toFixed(decimals);
        if (t < 1) requestAnimationFrame(tick);
        else {
          el.textContent = target.toFixed(decimals);
          // Subtle glow flash when counter finishes
          el.style.transition = 'color 0.3s ease';
          el.style.color = '#a5f3fc';
          setTimeout(() => { el.style.color = ''; }, 600);
        }
      }
      tick(start);
    }

    if (!('IntersectionObserver' in window)) return;
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const target = e.target as HTMLElement;
          if (e.isIntersecting && !target.dataset.ran) {
            target.dataset.ran = '1';
            runCounter(target);
            cio.unobserve(target);
          }
        });
      },
      { threshold: 0.6 }
    );
    document.querySelectorAll('.counter').forEach((el) => cio.observe(el));
    return () => cio.disconnect();
  }, []);
}

/* ── Sticky nav blur ── */
export function useStickyNav() {
  useEffect(() => {
    const header = document.getElementById('site-header');
    if (!header) return;
    const handleScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}

/* ── Live UTC clock ── */
export function useLiveClock(elementId: string) {
  useEffect(() => {
    const clockEl = document.getElementById(elementId);
    if (!clockEl) return;
    function updateClock() {
      if (!clockEl) return;
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, '0');
      const mm = String(now.getUTCMinutes()).padStart(2, '0');
      const ss = String(now.getUTCSeconds()).padStart(2, '0');
      clockEl.textContent = `${hh}:${mm}:${ss} UTC`;
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [elementId]);
}

/* ── Magnetic buttons — subtly pull toward cursor ── */
export function useMagneticButtons() {
  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLElement>('.btn-magnetic');
    const cleanups: (() => void)[] = [];

    buttons.forEach((btn) => {
      const handleMove = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width  / 2)) * 0.30;
        const dy = (e.clientY - (rect.top  + rect.height / 2)) * 0.30;
        btn.style.transform    = `translate(${dx}px, ${dy}px)`;
        btn.style.transition   = 'transform 0.15s ease-out';
      };
      const handleLeave = () => {
        btn.style.transform  = '';
        btn.style.transition = 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)';
      };

      btn.addEventListener('mousemove', handleMove);
      btn.addEventListener('mouseleave', handleLeave);
      cleanups.push(() => {
        btn.removeEventListener('mousemove', handleMove);
        btn.removeEventListener('mouseleave', handleLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);
}

/* ── Spine fade — hero spine line + dots fade out as user scrolls past hero ── */
export function useSpineFade() {
  useEffect(() => {
    const spineEls = document.querySelectorAll<HTMLElement>('.spine-fade');
    if (!spineEls.length) return;

    const handleScroll = () => {
      const vh = window.innerHeight;
      const scrolled = window.scrollY;
      // Start fading at 55vh scrolled, fully invisible by 95vh
      const opacity = Math.max(0, 1 - (scrolled - vh * 0.55) / (vh * 0.40));
      spineEls.forEach((el) => { el.style.opacity = String(opacity); });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // run once on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}

/* ── 3-D card tilt on hover ── */
export function useCardTilt() {
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('.card-tilt');
    const cleanups: (() => void)[] = [];

    cards.forEach((card) => {
      const handleMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const dx = (e.clientX - rect.left) / rect.width  - 0.5;
        const dy = (e.clientY - rect.top)  / rect.height - 0.5;
        card.style.transform  = `perspective(900px) rotateX(${-dy * 8}deg) rotateY(${dx * 8}deg) translateY(-5px)`;
        card.style.transition = 'transform 0.10s ease-out';
      };
      const handleLeave = () => {
        card.style.transform  = '';
        card.style.transition = 'transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1)';
      };

      card.addEventListener('mousemove', handleMove);
      card.addEventListener('mouseleave', handleLeave);
      cleanups.push(() => {
        card.removeEventListener('mousemove', handleMove);
        card.removeEventListener('mouseleave', handleLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);
}
