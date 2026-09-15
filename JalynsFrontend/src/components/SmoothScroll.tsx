import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

function unlockScroll() {
  const html = document.documentElement;
  const { body } = document;
  html.style.removeProperty("overflow");
  body.style.removeProperty("overflow");
  html.classList.remove("lenis", "lenis-smooth", "lenis-stopped", "lenis-scrolling");
  delete (window as Window & { __lenis?: Lenis }).__lenis;
}

/**
 * Momentum-based smooth scrolling (Lenis) — desktop only.
 * Mobile / narrow viewports use native scroll; Lenis stop() preventDefaults touch.
 */
export function SmoothScroll() {
  useEffect(() => {
    unlockScroll();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Match Tailwind `lg` — burger / mobile layout lives below this
    const desktop = window.matchMedia("(min-width: 1024px)");
    let lenis: Lenis | null = null;
    let frame = 0;

    const destroy = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (lenis) {
        lenis.destroy();
        lenis = null;
      }
      unlockScroll();
    };

    const start = () => {
      destroy();
      if (!desktop.matches) return;

      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        syncTouch: false,
        touchMultiplier: 1.1,
        wheelMultiplier: 0.95,
        anchors: true,
        autoRaf: false,
      });

      (window as Window & { __lenis?: Lenis }).__lenis = lenis;
      window.dispatchEvent(new Event("jalyns:lenis-ready"));

      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    };

    start();
    desktop.addEventListener("change", start);

    return () => {
      desktop.removeEventListener("change", start);
      destroy();
    };
  }, []);

  return null;
}
