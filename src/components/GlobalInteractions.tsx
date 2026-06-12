"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Tek animasyon sistemi: `.reveal` sınıfına sade bir fade verir (globals.css).
// IntersectionObserver mevcut elemanlar, MutationObserver async yüklenen içerik için.
export default function GlobalInteractions() {
  const pathname = usePathname();

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

    document.querySelectorAll(".reveal").forEach(observe);

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

  return null;
}
