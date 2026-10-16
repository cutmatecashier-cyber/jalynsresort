import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useWheelScrollContain } from "../lib/useWheelScrollContain";
import { broadcastContentChanged } from "./ContentSync";
import { Skeleton } from "./Skeleton";
import {
  fetchManagedBookingLinks,
  saveBookingLinks,
  type BookingLink,
} from "../lib/bookingLinks";

type ButtonProps = {
  links: BookingLink[];
  loading: boolean;
  canManage: boolean;
  onManage: () => void;
  className: string;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M5.5 7.5 10 12l4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MOBILE_QUERY = "(max-width: 1023px)";

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return mobile;
}

export function BookNowButton({ links, loading, canManage, onManage, className }: ButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const mobile = useIsMobile();
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open || !mobile) return;
    return stopPageScroll();
  }, [open, mobile]);

  useLayoutEffect(() => {
    if (!open || mobile) return;
    const place = () => {
      const node = buttonRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const width = Math.min(320, Math.max(rect.width, 240));
      let left = rect.right - width;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 220 && rect.top > spaceBelow;
      setBox(
        openUp
          ? { left, width, bottom: window.innerHeight - rect.top + 8 }
          : { left, width, top: rect.bottom + 8 },
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, mobile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        Book Now
        <Chevron open={open} />
      </button>
      {open && (mobile || box)
        ? createPortal(
            <div
              className={
                mobile
                  ? "fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-5 backdrop-blur-md"
                  : "contents"
              }
            >
              <div
                ref={panelRef}
                id={menuId}
                role="menu"
                aria-label="Booking platforms"
                className={`overflow-hidden rounded-2xl border border-white/70 bg-white p-2 text-ink shadow-[0_18px_50px_rgba(0,0,0,0.28)] ${
                  mobile ? "w-full max-w-xs" : "fixed z-[80]"
                }`}
                style={
                  mobile || !box
                    ? undefined
                    : { left: box.left, width: box.width, top: box.top, bottom: box.bottom }
                }
              >
                <p className="px-3 pt-1.5 pb-1 text-[0.62rem] font-semibold tracking-[0.18em] text-ink/45 uppercase">
                  Book your stay
                </p>
                <div className="max-h-72 overflow-y-auto overscroll-contain">
                  {loading ? (
                    <div className="space-y-2 px-2 py-2" aria-busy="true">
                      <span className="sr-only">Loading booking links</span>
                      <Skeleton className="h-10 rounded-xl" />
                      <Skeleton className="h-10 rounded-xl" />
                    </div>
                  ) : links.length === 0 ? (
                    <p className="px-3 py-3 text-sm leading-relaxed text-ink/60">
                      Booking links will appear here once they are added.
                    </p>
                  ) : (
                    links.map((link) => (
                      <a
                        key={link.id}
                        role="menuitem"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-sky/10"
                      >
                        <span className="min-w-0 truncate">{link.name}</span>
                        <span className="shrink-0 text-[0.65rem] font-medium tracking-wide text-sky uppercase">
                          Open
                        </span>
                      </a>
                    ))
                  )}
                </div>
                {canManage ? (
                  <div className="mt-1 border-t border-ink/10 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-sky-deep transition hover:bg-sky/10"
                      onClick={() => {
                        setOpen(false);
                        onManage();
                      }}
                    >
                      Manage booking links
                    </button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function stopPageScroll() {
  const html = document.documentElement;
  const prevBody = document.body.style.overflow;
  const prevHtml = html.style.overflow;
  const alreadyLocked = prevBody === "hidden";
  document.body.style.overflow = "hidden";
  html.style.overflow = "hidden";
  const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } }).__lenis;
  lenis?.stop();
  return () => {
    document.body.style.overflow = prevBody;
    html.style.overflow = prevHtml;
    if (!alreadyLocked) lenis?.start();
  };
}

export function BookingLinksEditor({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (links: BookingLink[]) => void;
}) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [rows, setRows] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useWheelScrollContain<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const release = stopPageScroll();
    const stopAgain = () => {
      const lenis = (window as Window & { __lenis?: { stop: () => void } }).__lenis;
      lenis?.stop();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("jalyns:lenis-ready", stopAgain);

    let removeTouch: (() => void) | null = null;
    const attachTouch = () => {
      const node = scrollRef.current;
      if (!node || removeTouch) return;
      const onTouchMove = (event: TouchEvent) => {
        event.stopPropagation();
      };
      node.addEventListener("touchmove", onTouchMove, { passive: true });
      removeTouch = () => node.removeEventListener("touchmove", onTouchMove);
    };
    attachTouch();
    const frame = window.requestAnimationFrame(attachTouch);

    return () => {
      window.cancelAnimationFrame(frame);
      removeTouch?.();
      release();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("jalyns:lenis-ready", stopAgain);
    };
  }, [open, scrollRef]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(null);
    void fetchManagedBookingLinks()
      .then((links) => {
        if (!alive) return;
        setRows(links.length ? links : [{ id: crypto.randomUUID(), name: "", url: "" }]);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setRows([]);
        setError(err instanceof Error ? err.message : "Could not load booking links.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  if (!open) return null;

  function updateRow(id: string, patch: Partial<BookingLink>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await saveBookingLinks(rows);
      onSaved(saved);
      broadcastContentChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save booking links.");
    } finally {
      setBusy(false);
    }
  }

    return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6"
      onMouseDown={() => {
        if (!busy) onCloseRef.current();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-[min(40rem,calc(100dvh-1.5rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div>
            <h2 id={titleId} className="font-display text-2xl">
              Booking links
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink/60">
              Add the sites guests can use to book. A link opens in a new tab. Leave the URL blank
              to hide a platform.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm font-semibold text-stone"
          >
            Close
          </button>
        </div>

        <form onSubmit={(event) => void onSubmit(event)} className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
          >
            {error ? (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
            {loading ? (
              <div className="space-y-3" aria-busy="true">
                <span className="sr-only">Loading booking links</span>
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            ) : (
              <ul className="space-y-3">
                {rows.map((row, index) => (
                  <li key={row.id} className="rounded-2xl border border-ink/10 bg-foam/60 p-3">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)]">
                      <label className="block">
                        <span className="text-[0.62rem] font-semibold tracking-[0.14em] text-ink/45 uppercase">
                          Platform
                        </span>
                        <input
                          value={row.name}
                          onChange={(event) => updateRow(row.id, { name: event.target.value })}
                          placeholder={index === 0 ? "Booking.com" : "Platform name"}
                          maxLength={48}
                          className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sky"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[0.62rem] font-semibold tracking-[0.14em] text-ink/45 uppercase">
                          Booking URL
                        </span>
                        <input
                          value={row.url}
                          onChange={(event) => updateRow(row.id, { url: event.target.value })}
                          placeholder="https://"
                          inputMode="url"
                          maxLength={500}
                          className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sky"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                      className="mt-2 text-sm font-semibold text-ink/50 transition hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              disabled={loading || rows.length >= 12}
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { id: crypto.randomUUID(), name: "", url: "" },
                ])
              }
              className="btn-press mt-3 inline-flex items-center rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Add platform
            </button>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || loading}
              className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save booking links"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
