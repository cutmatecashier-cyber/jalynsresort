import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type RevealVariant = "up" | "in" | "left" | "right" | "scale";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms (e.g. index * 100). */
  delay?: number;
  /**
   * Direction of the cinematic entrance.
   * Prefer `left` / `right` for cards; `up` for section headers.
   */
  variant?: RevealVariant;
};

/** Optional helper — prefer soft `up` for grids; use left/right only for split layouts. */
export function slideSide(index: number): "left" | "right" {
  return index % 2 === 0 ? "left" : "right";
}

/**
 * Scroll-triggered reveal — soft fade + horizontal glide (luxury / Apple-style).
 * Uses IntersectionObserver; reduced-motion users see content immediately.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      // Trigger slightly before the card is fully in view — feels intentional, not late
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style = {
    "--reveal-delay": `${delay}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      style={style}
      className={`reveal reveal-${variant} ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
