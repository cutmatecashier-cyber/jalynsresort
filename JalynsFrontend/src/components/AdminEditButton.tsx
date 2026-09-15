import type { ButtonHTMLAttributes, ReactNode } from "react";

type Surface = "dark" | "light";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** `dark` = over photos/hero; `light` = over foam/white cards */
  surface?: Surface;
};

const baseClass =
  "btn-press inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap backdrop-blur-md transition disabled:opacity-60";

const surfaceClass: Record<Surface, string> = {
  dark: "border border-white/25 bg-white/10 text-white hover:bg-white/16",
  light: "border border-ink/20 bg-ink/10 text-ink hover:bg-ink/16",
};

/** Shared admin control for Edit photos / Edit background / Change background. */
export function AdminEditButton({
  children,
  surface = "dark",
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`${baseClass} ${surfaceClass[surface]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
