"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useClientInteractions, useStickyNav } from "@/lib/useClientInteractions";

export default function GlobalInteractions() {
  const pathname = usePathname();

  // Cursor orb + sticky nav — run once, persist across navigation
  useClientInteractions();
  useStickyNav();

  // ── Scroll reveal ──
  // Uses IntersectionObserver for existing elements + MutationObserver for async-loaded content
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
    );

    const observe = (el: Element) => {
      if (!el.classList.contains("visible")) io.observe(el);
    };

    // Observe elements already in the DOM
    document.querySelectorAll(".reveal").forEach(observe);

    // Watch for elements added later (async data loads, conditional rendering)
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          if (el.classList?.contains("reveal")) observe(el);
          el.querySelectorAll?.(".reveal").forEach(observe);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  // ── Magnetic buttons — event delegation so new buttons are covered automatically ──
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const btn = (e.target as Element).closest<HTMLElement>(".btn-magnetic");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width  / 2)) * 0.28;
      const dy = (e.clientY - (rect.top  + rect.height / 2)) * 0.28;
      btn.style.transform  = `translate(${dx}px, ${dy}px)`;
      btn.style.transition = "transform 0.15s ease-out";
    };
    const handleOut = (e: MouseEvent) => {
      const btn = (e.target as Element).closest<HTMLElement>(".btn-magnetic");
      if (!btn) return;
      // Only reset if mouse left the button entirely
      const related = e.relatedTarget as Node | null;
      if (btn.contains(related)) return;
      btn.style.transform  = "";
      btn.style.transition = "transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)";
    };
    document.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseout",  handleOut,  { passive: true });
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseout",  handleOut);
    };
  }, []); // event delegation — only needs to run once

  // ── Card tilt — event delegation so async-loaded cards are covered ──
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const card = (e.target as Element).closest<HTMLElement>(".card-tilt");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width  - 0.5;
      const dy = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform  = `perspective(900px) rotateX(${-dy * 8}deg) rotateY(${dx * 8}deg) translateY(-5px)`;
      card.style.transition = "transform 0.10s ease-out";
    };
    const handleOut = (e: MouseEvent) => {
      const card = (e.target as Element).closest<HTMLElement>(".card-tilt");
      if (!card) return;
      const related = e.relatedTarget as Node | null;
      if (card.contains(related)) return;
      card.style.transform  = "";
      card.style.transition = "transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1)";
    };
    document.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseout",  handleOut,  { passive: true });
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseout",  handleOut);
    };
  }, []); // event delegation — only needs to run once

  return null;
}
