import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import type Lenis from "lenis";

function getLenis() {
  return (window as Window & { __lenis?: Lenis }).__lenis;
}

/** Jump to top instantly — ignores CSS / Lenis smooth scrolling. */
export function scrollToTopInstant() {
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(0, { immediate: true });
    return;
  }

  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  html.scrollTop = 0;
  document.body.scrollTop = 0;
  html.style.scrollBehavior = previous;
}

/**
 * Jump to top before the browser paints the new route.
 * useLayoutEffect avoids the brief flash at the old scroll position.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    if (hash) {
      const id = decodeURIComponent(hash.replace("#", ""));
      const el = document.getElementById(id);
      if (el) {
        const lenis = getLenis();
        if (lenis) {
          lenis.scrollTo(el, { offset: -88 });
        } else {
          el.scrollIntoView();
        }
        return;
      }
    }

    scrollToTopInstant();
  }, [pathname, hash]);

  return null;
}
