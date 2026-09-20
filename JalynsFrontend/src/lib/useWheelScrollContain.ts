import { useEffect, useRef, type RefObject } from "react";

/**
 * While the cursor is over a scrollable element, keep the mouse wheel on that
 * element instead of scrolling the page / Lenis (web / desktop).
 * Uses a callback-style attach so portal modals work after they mount.
 */
export function useWheelScrollContain<T extends HTMLElement>(
  enabled = true,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let el = ref.current;
    let remove: (() => void) | null = null;

    const attach = (node: T) => {
      const onWheel = (event: WheelEvent) => {
        if (node.scrollHeight <= node.clientHeight + 1) return;
        event.preventDefault();
        event.stopPropagation();
        node.scrollTop += event.deltaY;
      };
      node.addEventListener("wheel", onWheel, { passive: false });
      remove = () => node.removeEventListener("wheel", onWheel);
    };

    if (el) {
      attach(el);
      return () => remove?.();
    }

    // Portal content may mount one frame later
    const id = window.requestAnimationFrame(() => {
      el = ref.current;
      if (el) attach(el);
    });

    return () => {
      window.cancelAnimationFrame(id);
      remove?.();
    };
  }, [enabled]);

  return ref;
}
