import { useEffect, useRef, type RefObject } from "react";

/**
 * While the cursor is over a scrollable element, keep the mouse wheel on that
 * element instead of scrolling the page (web / desktop).
 */
export function useWheelScrollContain<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollHeight <= el.clientHeight + 1) return;
      event.preventDefault();
      event.stopPropagation();
      el.scrollTop += event.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return ref;
}
