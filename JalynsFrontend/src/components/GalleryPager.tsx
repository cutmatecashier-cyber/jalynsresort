type GalleryPagerProps = {
  count: number;
  /** Zero-based index of the current page or photo. */
  active: number;
  onSelect?: (index: number) => void;
  /** `light` sits on photos. `dark` sits on white cards. */
  tone?: "light" | "dark";
};

/** Shared gallery indicator: active pill and idle dots. */
export function GalleryPager({ count, active, onSelect, tone = "light" }: GalleryPagerProps) {
  if (count < 2) return null;

  const safe = Math.min(Math.max(active, 0), count - 1);
  const activeDot = tone === "light" ? "bg-white" : "bg-[#0b1d33]";
  const idleDot =
    tone === "light" ? "bg-white/40 hover:bg-white/70" : "bg-[#0b1d33]/28 hover:bg-[#0b1d33]/50";

  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5" role="tablist">
      {Array.from({ length: count }, (_, index) => {
        const selected = index === safe;
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={`Show ${index + 1} of ${count}`}
            onClick={() => onSelect?.(index)}
            className={`rounded-full transition ${
              selected ? `h-2 w-7 ${activeDot}` : `h-2 w-2 ${idleDot}`
            }`}
          />
        );
      })}
    </div>
  );
}
