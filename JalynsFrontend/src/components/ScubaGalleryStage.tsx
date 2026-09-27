import { useEffect, useRef, useState, type TouchEvent } from "react";
import { GalleryPager } from "./GalleryPager";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

export type ScubaGallerySlide = {
  url: string;
  alt: string;
  path: string;
};

type ScubaGalleryStageProps = {
  images: ScubaGallerySlide[];
  active: number;
  onActive: (index: number) => void;
  onOpen: (index: number) => void;
  canManage?: boolean;
  busy?: boolean;
  contained?: boolean;
  onReplace?: (path: string) => void;
  onDelete?: (path: string) => void;
};

const motion =
  "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function circularOffset(index: number, active: number, total: number) {
  let offset = index - active;
  if (total <= 1) return offset;
  const half = total / 2;
  if (offset > half) offset -= total;
  if (offset < -half) offset += total;
  return offset;
}

export function ScubaGalleryStage({
  images,
  active,
  onActive,
  onOpen,
  canManage = false,
  busy = false,
  contained = false,
  onReplace,
  onDelete,
}: ScubaGalleryStageProps) {
  const count = images.length;
  const safe = count ? Math.min(Math.max(active, 0), count - 1) : 0;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const lastOffsets = useRef<Record<string, number>>({});
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  function step(direction: -1 | 1) {
    if (count < 2) return;
    onActive((safe + direction + count) % count);
  }

  useEffect(() => {
    const next: Record<string, number> = {};
    images.forEach((image, index) => {
      next[image.path] = circularOffset(index, safe, count);
    });
    lastOffsets.current = next;
  });

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const point = event.touches[0];
    if (!point) return;
    touch.current = { x: point.clientX, y: point.clientY };
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const point = event.changedTouches[0];
    if (!point) return;
    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    step(dx < 0 ? 1 : -1);
  }

  function slideTransform(offset: number, scale: number) {
    let center = 0.5;
    if (offset !== 0) {
      if (contained) {
        center = compact ? (offset < 0 ? 0.2 : 0.8) : offset === -1 ? 0.22 : offset === 1 ? 0.78 : offset < 0 ? 0 : 1;
      } else if (compact) {
        center = offset < 0 ? 0.08 : 0.92;
      } else if (offset === -1) {
        center = 0.13;
      } else if (offset === 1) {
        center = 0.87;
      } else {
        center = offset < 0 ? -0.18 : 1.18;
      }
    }
    const width = compact ? 0.78 : 0.58;
    const tx = (center / width - 0.5) * 100;
    return `translate3d(${tx}%, -50%, 0) scale(${scale})`;
  }

  if (!count) return null;

  const sideScale = contained ? (compact ? 0.42 : 0.46) : compact ? 0.52 : 0.58;

  return (
    <div
      className={`relative ${contained ? "overflow-hidden" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative w-full">
          <div
            className={`pointer-events-none mx-auto aspect-[16/10] ${compact ? "w-[78%]" : "w-[58%]"}`}
            aria-hidden
          />
        <div className="absolute inset-0">
          {images.map((image, index) => {
            const offset = circularOffset(index, safe, count);
            const previous = lastOffsets.current[image.path];
            const jumped = previous != null && Math.abs(offset - previous) > 1;
            const center = offset === 0;
            const visible = Math.abs(offset) <= 1;
            const manageable = canManage && !image.path.startsWith("fallback-");
            return (
              <div
                key={image.path}
                aria-hidden={!visible}
                className={`absolute top-1/2 left-0 overflow-hidden rounded-[22px] border border-white/20 shadow-[0_18px_40px_rgba(2,10,20,0.38)] ${
                  jumped ? "transition-none" : motion
                } ${visible ? "will-change-transform" : ""} ${compact ? "w-[78%]" : "w-[58%]"} ${
                  center ? "z-20 shadow-[0_28px_60px_rgba(2,10,20,0.5)]" : "z-10"
                }`}
                style={{
                  transform: slideTransform(offset, center ? 1 : sideScale),
                  filter: center || !visible ? "none" : "blur(4px)",
                  opacity: Math.abs(offset) > 1 ? 0 : center ? 1 : 0.92,
                  pointerEvents: visible ? "auto" : "none",
                }}
              >
                <button
                  type="button"
                  aria-label={center ? `Open ${image.alt || "photo"}` : `Show ${image.alt || "photo"}`}
                  tabIndex={visible ? 0 : -1}
                  onClick={() => {
                    if (center) onOpen(index);
                    else onActive(index);
                  }}
                  className="block w-full"
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    draggable={false}
                    loading={visible ? "eager" : "lazy"}
                    decoding="async"
                    className="aspect-[16/10] w-full object-cover"
                  />
                </button>
                {center ? null : (
                  <span className="pointer-events-none absolute inset-0 bg-[#071525]/20" />
                )}
                {center && manageable && (onReplace || onDelete) ? (
                  <div className="absolute inset-x-0 top-3 z-10 flex justify-center gap-2">
                    {onReplace ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onReplace(image.path)}
                        className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                      >
                        Replace
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(image.path)}
                        className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {count === 2
            ? images.map((image, index) => {
                const offset = circularOffset(index, safe, count);
                if (offset === 0) return null;
                const side = -offset;
                return (
                  <div
                    key={`${image.path}-side`}
                    className={`absolute top-1/2 left-0 z-10 overflow-hidden rounded-[22px] border border-white/20 shadow-[0_18px_40px_rgba(2,10,20,0.38)] transition-none ${
                      compact ? "w-[78%]" : "w-[58%]"
                    }`}
                    style={{
                      transform: slideTransform(side, sideScale),
                      filter: "blur(4px)",
                      opacity: 0.92,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`Show ${image.alt || "photo"}`}
                      onClick={() => onActive(index)}
                      className="block w-full"
                    >
                      <img
                        src={image.url}
                        alt=""
                        draggable={false}
                        className="aspect-[16/10] w-full object-cover"
                      />
                    </button>
                    <span className="pointer-events-none absolute inset-0 bg-[#071525]/20" />
                  </div>
                );
              })
            : null}

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className={`absolute top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11 ${
                  contained ? "left-[8%] sm:left-[10%]" : "left-[2%] sm:left-[4%]"
                }`}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className={`absolute top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11 ${
                  contained ? "right-[8%] sm:right-[10%]" : "right-[2%] sm:right-[4%]"
                }`}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          ) : null}

          <div className="pointer-events-auto absolute bottom-[7%] left-1/2 z-30 -translate-x-1/2">
            <GalleryPager count={count} active={safe} tone="light" onSelect={onActive} />
          </div>
        </div>
      </div>
    </div>
  );
}
