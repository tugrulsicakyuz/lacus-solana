"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGrainCanvas, usePageCursor } from "@/hooks/usePageEffects";

// Sayfa başına aksan rengi/grain yoğunluğu CSS'te body[data-route] üzerinden
// verilir (globals.css → "Per-route cursor/grain accents").
// Burada null dönen route'larda (bond detayı, pitch, whitepaper…) efekt çizilmez
// ve native cursor görünür kalır.
function routeKey(pathname: string): string | null {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/manage/issue")) return "issue";
  if (pathname.startsWith("/manage")) return "manage";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/launchpad")) return "launchpad";
  if (pathname.startsWith("/primary")) return "primary";
  if (pathname.startsWith("/secondary")) return "secondary";
  if (pathname.startsWith("/about")) return "about";
  return null;
}

const HOVER_TARGETS =
  "a, button, .protocol-item, .card-tilt, .btn-magnetic, .btn-primary, .btn-ghost";

export default function PageEffects() {
  const pathname = usePathname();
  const route = routeKey(pathname);

  useEffect(() => {
    if (route) document.body.dataset.route = route;
    else delete document.body.dataset.route;
    document.body.classList.remove("cursor-hover");
  }, [route]);

  if (!route) return null;
  return <EffectsLayer />;
}

function EffectsLayer() {
  const grainRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useGrainCanvas(grainRef);
  usePageCursor(dotRef, ringRef);

  // Ring'in link/buton üzerinde büyümesi — event delegation, async içerik dahil
  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const hit = (e.target as Element).closest?.(HOVER_TARGETS);
      document.body.classList.toggle("cursor-hover", !!hit);
    };
    document.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.body.classList.remove("cursor-hover");
    };
  }, []);

  // Click ripple — rengi body[data-route] aksanından alır (.ripple CSS'i)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = document.createElement("div");
      el.className = "ripple";
      el.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:80px;height:80px;`;
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <canvas ref={grainRef} id="grain" />
      <div ref={dotRef} id="cursor-dot" />
      <div ref={ringRef} id="cursor-ring" />
    </>
  );
}
