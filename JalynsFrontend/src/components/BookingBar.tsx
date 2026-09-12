import { useState, type FormEvent } from "react";

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GuestsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M15.2 14.8c1.7.3 3.1 1.4 3.7 3.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const guestOptions = ["1 Adult", "2 Adults", "3 Adults", "4 Adults"] as const;

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
      className="animate-fade-up flex w-full max-w-3xl flex-col gap-3 rounded-[1.6rem] bg-white/92 p-3 shadow-[0_18px_50px_rgba(8,16,12,0.22)] backdrop-blur-md sm:flex-row sm:items-center sm:rounded-full sm:p-2 sm:pl-5"
      style={{ animationDelay: "0.35s" }}
    >
      <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 sm:rounded-none sm:py-1">
        <span className="text-ink/55">
          <CalendarIcon />
        </span>
        <span className="min-w-0">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink/45">
            Check In
          </span>
          <input
            type="date"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-ink outline-none [color-scheme:light]"
          />
        </span>
      </label>

      <div className="hidden h-8 w-px bg-ink/10 sm:block" aria-hidden="true" />

      <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 sm:rounded-none sm:py-1">
        <span className="text-ink/55">
          <CalendarIcon />
        </span>
        <span className="min-w-0">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink/45">
            Check Out
          </span>
          <input
            type="date"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-ink outline-none [color-scheme:light]"
          />
        </span>
      </label>

      <div className="hidden h-8 w-px bg-ink/10 sm:block" aria-hidden="true" />

      <label className="relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 sm:rounded-none sm:py-1">
        <span className="text-ink/55">
          <GuestsIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink/45">
            Guests
          </span>
          <span className="relative block">
            <select
              value={guests}
              onChange={(event) =>
                setGuests(event.target.value as (typeof guestOptions)[number])
              }
              className="w-full appearance-none bg-transparent pr-5 text-sm font-medium text-ink outline-none"
            >
              {guestOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-ink/45">
              <ChevronIcon />
            </span>
          </span>
        </span>
      </label>

      <button
        type="submit"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-soft sm:py-3"
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        Check Availability
      </button>
    </form>
  );
}
