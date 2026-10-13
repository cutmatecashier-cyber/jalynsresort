import { useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canViewTransition() {
  return typeof document.startViewTransition === "function" && !prefersReducedMotion();
}

/**
 * Crossfade between pages. Link clicks use the View Transitions API when the
 * browser supports it; other navigations fade the incoming page in.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewTransitionNav = useRef(false);
  const firstPaint = useRef(true);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    if (viewTransitionNav.current) {
      viewTransitionNav.current = false;
      el.classList.remove("page-enter");
      return;
    }
    if (prefersReducedMotion()) return;
    el.classList.remove("page-enter");
    void el.offsetWidth;
    el.classList.add("page-enter");
  }, [location.pathname]);

  function onClickCapture(event: MouseEvent) {
    if (!canViewTransition()) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = (event.target as Element | null)?.closest?.("a");
    if (!anchor) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    let url: URL;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;

    event.preventDefault();
    const next = `${url.pathname}${url.search}${url.hash}`;
    viewTransitionNav.current = true;
    document.startViewTransition(() => {
      flushSync(() => {
        navigate(next);
      });
    });
  }

  return (
    <div ref={rootRef} onClickCapture={onClickCapture}>
      {children}
    </div>
  );
}
