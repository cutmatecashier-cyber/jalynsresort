import { useRef, useState, type FormEvent } from "react";
import { ArrowRightIcon } from "./Icons";

const guestOptions = ["1 Adult", "2 Adults", "3 Adults", "4 Adults"] as const;

function CalendarIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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

function GuestsIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 19c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatLabel(value: string, short = false) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: short ? undefined : "numeric",
  });
}

function DateField({
  label,
  value,
  onChange,
  short = false,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  short?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // fall through
      }
    }
    input.click();
  }

  return (
    <button
      type="button"
      onClick={openPicker}
      className={`group btn-press relative flex w-full min-w-0 items-center text-left ${
        compact ? "gap-2.5 rounded-xl px-3 py-2.5 hover:bg-mist/70" : "gap-2.5 py-1"
      }`}
    >
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
          className={`mt-1 block truncate leading-none font-semibold whitespace-nowrap text-ink ${
            compact ? "text-[0.875rem]" : "text-[0.95rem]"
          }`}
        >
          {formatLabel(value, short)}
        </span>
      </span>
      <ChevronIcon className="h-3 w-3 shrink-0 text-ink/25 transition group-hover:text-ink/45" />
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </button>
  );
}

export function BookingBar() {
  const [checkIn, setCheckIn] = useState("2026-08-30");
  const [checkOut, setCheckOut] = useState("2026-08-31");
  const [guests, setGuests] = useState<(typeof guestOptions)[number]>("2 Adults");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form
      id="book"
      onSubmit={onSubmit}
      className="w-full overflow-hidden rounded-2xl border border-white/50 bg-white/92 shadow-[0_16px_40px_rgba(12,18,16,0.16)] backdrop-blur-xl sm:rounded-[1.35rem] sm:bg-white/97"
    >
      <div className="flex flex-col gap-1.5 p-2 sm:hidden">
        <div className="grid grid-cols-2 gap-1">
          <DateField compact short label="Check In" value={checkIn} onChange={setCheckIn} />
          <DateField compact short label="Check Out" value={checkOut} onChange={setCheckOut} />
        </div>

        <label className="group flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-mist/70">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mist text-sea">
            <GuestsIcon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className="block text-[0.65rem] leading-none font-medium tracking-wide text-stone uppercase">
              Guests
            </span>
            <select
              value={guests}
              onChange={(event) =>
                setGuests(event.target.value as (typeof guestOptions)[number])
              }
              className="mt-1 w-full appearance-none bg-transparent text-[0.875rem] leading-none font-semibold text-ink outline-none"
            >
              {guestOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </span>
          <ChevronIcon className="pointer-events-none h-3 w-3 shrink-0 text-ink/25" />
        </label>

        <button
          type="submit"
          className="btn-press animate-live-gradient relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[0.8125rem] font-semibold tracking-wide text-white"
        >
          <span className="animate-shimmer absolute inset-0 opacity-35" />
          <span className="relative">Check Availability</span>
          <ArrowRightIcon className="relative h-3.5 w-3.5" />
        </button>
      </div>

      <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-stretch">
        <div className="border-r border-ink/6 px-4 py-3.5 md:px-5">
          <DateField label="Check In" value={checkIn} onChange={setCheckIn} />
        </div>
        <div className="border-r border-ink/6 px-4 py-3.5 md:px-5">
          <DateField label="Check Out" value={checkOut} onChange={setCheckOut} />
        </div>
        <label className="flex min-w-0 items-center gap-2.5 border-r border-ink/6 px-4 py-3.5 md:px-5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-sea">
            <GuestsIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.65rem] font-medium tracking-wide text-stone uppercase">
              Guests
            </span>
            <select
              value={guests}
              onChange={(event) => setGuests(event.target.value as (typeof guestOptions)[number])}
              className="mt-1 w-full appearance-none bg-transparent text-[0.95rem] font-semibold text-ink outline-none"
            >
              {guestOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </span>
          <ChevronIcon className="h-3 w-3 shrink-0 text-ink/25" />
        </label>
        <div className="flex items-center p-2.5">
          <button
            type="submit"
            className="btn-press animate-live-gradient relative inline-flex h-full min-w-[11rem] items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-sm font-semibold tracking-wide text-white"
          >
            <span className="animate-shimmer absolute inset-0 opacity-30" />
            <span className="relative">Check Availability</span>
            <ArrowRightIcon className="relative h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </form>
  );
}
