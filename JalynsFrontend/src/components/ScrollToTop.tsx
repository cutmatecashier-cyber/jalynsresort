import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** Jump to top instantly — ignores CSS `scroll-behavior: smooth`. */
export function scrollToTopInstant() {
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
        el.scrollIntoView();
        return;
      }
    }

    scrollToTopInstant();
  }, [pathname, hash]);

  return null;
}
