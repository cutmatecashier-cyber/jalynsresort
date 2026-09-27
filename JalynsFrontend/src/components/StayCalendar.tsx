import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatClockLabel } from "../lib/roomAvailability";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthCells(year: number, monthIndex: number): Array<string | null> {
  const first = new Date(year, monthIndex, 1);
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
  for (let day = 1; day <= count; day += 1) {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    cells.push(`${year}-${month}-${date}`);
  }
  return cells;
}

function parseIso(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, monthIndex: m - 1 };
}

function formatMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDayLabel(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shiftMonth(year: number, monthIndex: number, delta: number) {
  const next = new Date(year, monthIndex + delta, 1);
  return { year: next.getFullYear(), monthIndex: next.getMonth() };
}

type PanelBox = { top: number; left: number; width: number };

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 9.5h17M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StayDateField({
  label,
  required = false,
  value,
  onChange,
  minIso,
  isDateDisabled,
  hint,
  rangeEnd,
  onRangeEnd,
  isRangeEndDisabled,
  appearance = "form",
  compact = false,
  short = false,
  disabled = false,
  portal = false,
  note,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (iso: string) => void;
  minIso?: string;
  isDateDisabled?: (iso: string) => boolean;
  hint?: string;
  /** When set, the same calendar also chooses the checkout date. */
  rangeEnd?: string;
  onRangeEnd?: (iso: string) => void;
  isRangeEndDisabled?: (checkIn: string, checkOut: string) => boolean;
  /** `bar` matches the homepage booking strip. `form` is the booking page field. */
  appearance?: "form" | "bar";
  compact?: boolean;
  short?: boolean;
  disabled?: boolean;
  /** Render the calendar on document.body so hero overflow does not clip it. */
  portal?: boolean;
  note?: string;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"start" | "end">("start");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [box, setBox] = useState<PanelBox | null>(null);
  const initial = ISO_DATE_OK(value) ? parseIso(value) : parseIso(minIso || todayKey());
  const [cursor, setCursor] = useState(initial);
  const rangeMode = Boolean(onRangeEnd);

  function placePanel() {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    const height = panelRef.current?.offsetHeight || 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < height + 12 && rect.top > height + 12
        ? Math.max(8, rect.top - height - 6)
        : Math.min(rect.bottom + 6, window.innerHeight - height - 8);
    setBox((current) => {
      if (current && current.top === top && current.left === left && current.width === width) {
        return current;
      }
      return { top, left, width };
    });
  }

  function close() {
    setOpen(false);
    setPhase("start");
    setAnchor(null);
    setHover(null);
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !portal) return;
    placePanel();
    const onMove = () => placePanel();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, portal, cursor.year, cursor.monthIndex, phase]);

  const cells = monthCells(cursor.year, cursor.monthIndex);
  const start = phase === "end" && anchor ? anchor : value;
  const previewEnd =
    phase === "end" && hover && start && hover > start
      ? hover
      : rangeEnd && start && rangeEnd > start
        ? rangeEnd
        : "";

  function checkInBlocked(iso: string) {
    if (minIso && iso < minIso) return true;
    return Boolean(isDateDisabled?.(iso));
  }

  function checkOutBlocked(iso: string) {
    if (!start || iso <= start) return true;
    return Boolean(isRangeEndDisabled?.(start, iso));
  }

  function choose(iso: string) {
    if (!rangeMode) {
      if (checkInBlocked(iso)) return;
      onChange(iso);
      close();
      return;
    }
    if (phase === "start") {
      if (checkInBlocked(iso)) return;
      onChange(iso);
      setAnchor(iso);
      setPhase("end");
      return;
    }
    if (iso <= start) {
      if (checkInBlocked(iso)) return;
      onChange(iso);
      setAnchor(iso);
      return;
    }
    if (checkOutBlocked(iso)) return;
    onRangeEnd?.(iso);
    close();
  }

  function openCalendar() {
    if (disabled) return;
    if (open) {
      close();
      return;
    }
    if (ISO_DATE_OK(value)) setCursor(parseIso(value));
    else if (minIso && ISO_DATE_OK(minIso)) setCursor(parseIso(minIso));
    setPhase("start");
    setAnchor(null);
    setOpen(true);
  }

  const selectedLabel = ISO_DATE_OK(value)
    ? appearance === "bar"
      ? formatBarDate(value, short)
      : formatDayLabel(value)
    : appearance === "bar"
      ? "Select date"
      : "Select a date";

  const panel = open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          style={
            portal
              ? {
                  position: "fixed",
                  top: box?.top ?? -9999,
                  left: box?.left ?? 8,
                  width: box?.width ?? 280,
                  zIndex: 80,
                  visibility: box ? "visible" : "hidden",
                }
              : undefined
          }
          className={
            portal
              ? "min-w-70 rounded-2xl border border-ink/10 bg-white p-3 text-ink shadow-[0_16px_40px_rgba(8,18,28,0.16)]"
              : "absolute z-30 mt-1 w-full min-w-70 rounded-2xl border border-ink/10 bg-white p-3 shadow-[0_16px_40px_rgba(8,18,28,0.16)]"
          }
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCursor((c) => shiftMonth(c.year, c.monthIndex, -1))}
              className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/70 hover:bg-ink/5"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="text-sm font-semibold text-ink">
              {formatMonth(cursor.year, cursor.monthIndex)}
            </p>
            <button
              type="button"
              onClick={() => setCursor((c) => shiftMonth(c.year, c.monthIndex, 1))}
              className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/70 hover:bg-ink/5"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.62rem] font-semibold text-ink/40">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((iso, index) => {
              if (!iso) return <span key={`empty-${index}`} />;
              const blocked =
                phase === "end"
                  ? iso <= start
                    ? checkInBlocked(iso)
                    : checkOutBlocked(iso)
                  : checkInBlocked(iso);
              const isStart = iso === start;
              const isEnd = Boolean(previewEnd) && iso === previewEnd;
              const inStay = Boolean(previewEnd) && iso > start && iso < previewEnd;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={blocked}
                  onMouseEnter={() => setHover(iso)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => choose(iso)}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm font-semibold ${
                    isStart || isEnd
                      ? "bg-sky-deep text-white"
                      : inStay
                        ? "bg-sky-deep/15 text-ink"
                        : blocked
                          ? "cursor-not-allowed text-ink/25 line-through"
                          : "text-ink hover:bg-mist"
                  }`}
                  aria-label={
                    blocked ? `${formatDayLabel(iso)} unavailable` : formatDayLabel(iso)
                  }
                >
                  {Number(iso.slice(-2))}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[0.68rem] leading-relaxed text-ink/45">
            {note
              ? note
              : rangeMode && phase === "end"
                ? "Now choose the check-out date. A checkout morning can still be selected."
                : rangeMode
                  ? "Choose check-in, then check-out in this calendar."
                  : "Unavailable dates have no rooms left for that night."}
          </p>
        </div>
  ) : null;

  const calendar = panel && portal ? createPortal(panel, document.body) : panel;

  return (
    <div ref={rootRef} className="relative block text-sm font-semibold text-ink">
      {appearance === "form" ? (
        <span>
          {label} {required ? <span className="text-red-600">*</span> : null}
        </span>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title={disabled ? "Select a check-in date first" : undefined}
        onClick={openCalendar}
        className={
          appearance === "bar"
            ? `group btn-press relative flex w-full min-w-0 items-center text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                compact ? "gap-2.5 rounded-xl px-3 py-2.5 hover:bg-mist/70" : "gap-2.5 py-1"
              }`
            : "mt-1.5 flex w-full items-center justify-between rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-ink outline-none transition hover:border-sky-deep/30 focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {appearance === "bar" ? (
          <>
            <span
              className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-mist text-sea ${
                compact ? "h-8 w-8" : "h-9 w-9"
              }`}
            >
              <CalendarIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </span>
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="block text-[0.65rem] leading-none font-medium tracking-wide text-stone uppercase">
                {label}
              </span>
              <span
                className={`mt-1 block truncate leading-none font-semibold whitespace-nowrap ${
                  ISO_DATE_OK(value) ? "text-ink" : "text-ink/40"
                } ${compact ? "text-[0.875rem]" : "text-[0.95rem]"}`}
              >
                {selectedLabel}
              </span>
            </span>
            <ChevronIcon className="h-3 w-3 shrink-0 text-ink/25 transition group-hover:text-ink/45" />
          </>
        ) : (
          <>
            <span>{selectedLabel}</span>
            <span className="text-ink/35" aria-hidden>
              ▾
            </span>
          </>
        )}
      </button>
      {hint ? <span className="mt-1 block text-xs font-medium text-ink/45">{hint}</span> : null}
      {calendar}
    </div>
  );
}

function formatBarDate(iso: string, short: boolean) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: short ? undefined : "numeric",
  });
}

function ISO_DATE_OK(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function scheduleHint(checkInTime: string, checkOutTime: string) {
  return `Check-in ${formatClockLabel(checkInTime)} · Check-out ${formatClockLabel(checkOutTime)}`;
}

