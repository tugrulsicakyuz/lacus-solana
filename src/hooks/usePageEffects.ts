"use client";

import { type RefObject, useEffect } from "react";

// Küçük çözünürlükte çizer, CSS full-screen'e scale eder.
// 400×225 = 90.000 piksel vs 1920×1080 = 2.073.600 piksel → 23× daha az işlem.
// Opacity 0.03-0.05'te fark görülmez.
const GRAIN_W = 400;
const GRAIN_H = 225;

export function useGrainCanvas(ref: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = GRAIN_W;
    canvas.height = GRAIN_H;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let rafId: number;
    let tid: ReturnType<typeof setTimeout>;
    let destroyed = false;

    const render = () => {
      if (destroyed || !ctx) return;
      const img = ctx.createImageData(GRAIN_W, GRAIN_H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (prefersReducedMotion) return;
      frame++;
      if (frame % 3 === 0) rafId = requestAnimationFrame(render);
      else tid = setTimeout(() => { rafId = requestAnimationFrame(render); }, 60);
    };
    render();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(tid);
    };
  }, [ref]);
}

export function usePageCursor(
  dotRef: RefObject<HTMLDivElement | null>,
  ringRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx - 4}px,${my - 4}px,0)`;
    };
    document.addEventListener("mousemove", onMove, { passive: true });

    const tick = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate3d(${rx - 20}px,${ry - 20}px,0)`;
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, [dotRef, ringRef]);
}
