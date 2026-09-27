import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CONTENT_CHANGED_EVENT } from "./ContentSync";
import { ArrowRightIcon } from "./Icons";
import { scheduleHint, StayDateField } from "./StayCalendar";
import { useWheelScrollContain } from "../lib/useWheelScrollContain";
import {
  DEFAULT_ROOMS,
  DEFAULT_ROOMS_VOUCHER,
  applyVoucherToPrice,
  fetchRoomAvailability,
  fetchRoomsCatalog,
  ROOMS_UPDATED_EVENT,
  roomsMediaUrl,
  type Room,
  type RoomAvailabilitySnapshot,
  type RoomsVoucher,
} from "../lib/rooms";
import {
  addDaysIso,
  clockToMinutes,
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  formatClockLabel,
  isNightFullyBooked,
  roomsRemaining,
  stayFits,
  todayIso,
  type StaySpan,
} from "../lib/roomAvailability";

const guestOptions = ["1 Adult", "2 Adults", "3 Adults", "4 Adults"] as const;

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

function formatStayDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type AvailableRoom = {
  room: Room;
  remaining: number;
  quantity: number;
};

function inventoryFor(
  room: Room,
  snapshot: RoomAvailabilitySnapshot | null,
): { quantity: number; stays: StaySpan[] } | null {
  const row = snapshot?.rooms.find((item) => item.id === room.id);
  if (snapshot && snapshot.rooms.length > 0 && !row) return null;
  return {
    quantity: row?.quantity ?? room.quantity,
    stays: row?.stays ?? [],
  };
}

export function BookingBar({
  onSearchedChange,
}: {
  onSearchedChange?: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const minCheckIn = todayIso();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<(typeof guestOptions)[number]>("2 Adults");
  const [catalog, setCatalog] = useState<Room[]>(() =>
    DEFAULT_ROOMS.map((room) => ({ ...room, amenities: [...room.amenities], images: [...room.images] })),
  );
  const [voucher, setVoucher] = useState<RoomsVoucher>({ ...DEFAULT_ROOMS_VOUCHER });
  const [availability, setAvailability] = useState<RoomAvailabilitySnapshot | null>(null);
  const [results, setResults] = useState<AvailableRoom[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const onSearchedChangeRef = useRef(onSearchedChange);
  onSearchedChangeRef.current = onSearchedChange;
  const resultsScrollRef = useWheelScrollContain<HTMLDivElement>(searched && results.length > 2);

  useEffect(() => {
    onSearchedChangeRef.current?.(searched);
  }, [searched]);

  const checkInTime = availability?.checkInTime || DEFAULT_CHECK_IN_TIME;
  const checkOutTime = availability?.checkOutTime || DEFAULT_CHECK_OUT_TIME;
  const checkInMinutes = clockToMinutes(checkInTime);
  const checkOutMinutes = clockToMinutes(checkOutTime);

  const bookable = useMemo(
    () => catalog.filter((room) => room.status !== "unavailable"),
    [catalog],
  );

  useEffect(() => {
    let alive = true;
    const load = () => {
      void Promise.all([fetchRoomsCatalog(), fetchRoomAvailability()]).then(([catalogData, snapshot]) => {
        if (!alive) return;
        if (catalogData.rooms.length) {
          setCatalog(catalogData.rooms);
          setVoucher(catalogData.voucher);
        }
        if (snapshot) setAvailability(snapshot);
      });
    };
    load();
    window.addEventListener(CONTENT_CHANGED_EVENT, load);
    window.addEventListener(ROOMS_UPDATED_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(CONTENT_CHANGED_EVENT, load);
      window.removeEventListener(ROOMS_UPDATED_EVENT, load);
    };
  }, []);

  useEffect(() => {
    if (!searched) return;
    const narrow = window.matchMedia("(max-width: 1023px)").matches;
    if (!narrow) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [searched, results]);

  function roomFits(room: Room, start: string, end: string, snapshot: RoomAvailabilitySnapshot | null) {
    const inventory = inventoryFor(room, snapshot);
    if (!inventory) return false;
    return stayFits(
      inventory.stays,
      start,
      end,
      inventory.quantity,
      checkInMinutes,
      checkOutMinutes,
    );
  }

  function anyRoomFits(start: string, end: string) {
    if (!availability) return true;
    if (bookable.length === 0) return false;
    return bookable.some((room) => roomFits(room, start, end, availability));
  }

  function nightClosed(iso: string) {
    if (!availability) return false;
    if (bookable.length === 0) return true;
    return bookable.every((room) => {
      const inventory = inventoryFor(room, availability);
      if (!inventory) return true;
      return isNightFullyBooked(
        inventory.stays,
        iso,
        inventory.quantity,
        checkInMinutes,
        checkOutMinutes,
      );
    });
  }

  function clearSearch() {
    setSearched(false);
    setResults([]);
    setError(null);
  }

  function onCheckIn(next: string) {
    setCheckIn(next);
    setCheckOut((current) => {
      if (!current || current <= next) return "";
      return anyRoomFits(next, current) ? current : "";
    });
    clearSearch();
  }

  function onCheckOut(next: string) {
    if (!checkIn || next <= checkIn) return;
    if (!anyRoomFits(checkIn, next)) return;
    setCheckOut(next);
    clearSearch();
  }

  function matchesFor(
    start: string,
    end: string,
    rooms: Room[],
    snapshot: RoomAvailabilitySnapshot,
    inMinutes: number,
    outMinutes: number,
  ): AvailableRoom[] {
    return rooms.flatMap((room) => {
      if (room.status === "unavailable") return [];
      const inventory = inventoryFor(room, snapshot);
      if (!inventory) return [];
      if (
        !stayFits(inventory.stays, start, end, inventory.quantity, inMinutes, outMinutes)
      ) {
        return [];
      }
      const remaining = roomsRemaining(
        inventory.stays,
        start,
        end,
        inventory.quantity,
        inMinutes,
        outMinutes,
      );
      if (remaining < 1) return [];
      return [{ room, remaining, quantity: inventory.quantity }];
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!checkIn || !checkOut) {
      setSearched(false);
      setResults([]);
      setError("Select a check-in date and a check-out date before searching.");
      return;
    }
    if (checkOut <= checkIn) {
      setSearched(false);
      setResults([]);
      setError("Check-out must be after check-in.");
      return;
    }

    setBusy(true);
    try {
      const [catalogData, snapshot] = await Promise.all([
        fetchRoomsCatalog(),
        fetchRoomAvailability(),
      ]);
      if (catalogData.rooms.length) {
        setCatalog(catalogData.rooms);
        setVoucher(catalogData.voucher);
      }
      if (!snapshot) {
        setSearched(false);
        setResults([]);
        setError("Could not check room availability. Please try again.");
        return;
      }
      setAvailability(snapshot);
      const inMinutes = clockToMinutes(snapshot.checkInTime || DEFAULT_CHECK_IN_TIME);
      const outMinutes = clockToMinutes(snapshot.checkOutTime || DEFAULT_CHECK_OUT_TIME);
      const rooms = catalogData.rooms.length ? catalogData.rooms : catalog;
      setResults(matchesFor(checkIn, checkOut, rooms, snapshot, inMinutes, outMinutes));
      setSearched(true);
    } finally {
      setBusy(false);
    }
  }

  async function selectRoom(roomId: string) {
    if (!checkIn || !checkOut || selectingId) return;
    setSelectingId(roomId);
    setError(null);
    try {
      const snapshot = await fetchRoomAvailability();
      const room = catalog.find((item) => item.id === roomId);
      if (!snapshot || !room) {
        setError("Could not check room availability. Please try again.");
        return;
      }
      const inMinutes = clockToMinutes(snapshot.checkInTime || DEFAULT_CHECK_IN_TIME);
      const outMinutes = clockToMinutes(snapshot.checkOutTime || DEFAULT_CHECK_OUT_TIME);
      const inventory = inventoryFor(room, snapshot);
      const open =
        inventory != null &&
        stayFits(inventory.stays, checkIn, checkOut, inventory.quantity, inMinutes, outMinutes);
      if (!open) {
        setAvailability(snapshot);
        setResults(matchesFor(checkIn, checkOut, catalog, snapshot, inMinutes, outMinutes));
        setSearched(true);
        setError("That room is no longer available for these dates.");
        return;
      }
      const adults = Number(guests.match(/\d+/)?.[0] ?? "2");
      navigate(`/book?room=${encodeURIComponent(roomId)}`, {
        state: {
          checkIn,
          checkOut,
          adults: Number.isInteger(adults) && adults >= 1 ? adults : 2,
        },
      });
    } finally {
      setSelectingId(null);
    }
  }

  const checkOutMin = checkIn ? addDaysIso(checkIn, 1) : undefined;

  return (
    <div className={`w-full ${searched ? "" : "max-sm:-translate-y-24"}`}>
      <form
        id="book"
        onSubmit={(event) => void onSubmit(event)}
        className="w-full overflow-hidden rounded-2xl border border-white/50 bg-white/92 shadow-[0_16px_40px_rgba(12,18,16,0.16)] backdrop-blur-xl sm:rounded-[1.35rem] sm:bg-white/97"
      >
        <div className="flex flex-col gap-1.5 p-2 sm:hidden">
          <div className="grid grid-cols-2 gap-1">
            <StayDateField
              appearance="bar"
              compact
              short
              portal
              label="Check In"
              value={checkIn}
              rangeEnd={checkOut}
              minIso={minCheckIn}
              isDateDisabled={nightClosed}
              isRangeEndDisabled={(start, end) => !anyRoomFits(start, end)}
              onChange={onCheckIn}
              onRangeEnd={onCheckOut}
            />
            <StayDateField
              appearance="bar"
              compact
              short
              portal
              label="Check Out"
              value={checkOut}
              disabled={!checkIn}
              minIso={checkOutMin}
              isDateDisabled={(iso) => Boolean(checkIn) && !anyRoomFits(checkIn, iso)}
              onChange={onCheckOut}
              note="Check-out must be later than check-in. A date is closed when no room can cover that stay."
            />
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
            disabled={busy}
            className="btn-press animate-live-gradient relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[0.8125rem] font-semibold tracking-wide text-white disabled:opacity-60"
          >
            <span className="animate-shimmer absolute inset-0 opacity-35" />
            <span className="relative">{busy ? "Checking…" : "Check Availability"}</span>
            <ArrowRightIcon className="relative h-3.5 w-3.5" />
          </button>
        </div>

        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-stretch">
          <div className="border-r border-ink/6 px-4 py-3.5 md:px-5">
            <StayDateField
              appearance="bar"
              portal
              label="Check In"
              value={checkIn}
              rangeEnd={checkOut}
              minIso={minCheckIn}
              isDateDisabled={nightClosed}
              isRangeEndDisabled={(start, end) => !anyRoomFits(start, end)}
              onChange={onCheckIn}
              onRangeEnd={onCheckOut}
            />
          </div>
          <div className="border-r border-ink/6 px-4 py-3.5 md:px-5">
            <StayDateField
              appearance="bar"
              portal
              label="Check Out"
              value={checkOut}
              disabled={!checkIn}
              minIso={checkOutMin}
              isDateDisabled={(iso) => Boolean(checkIn) && !anyRoomFits(checkIn, iso)}
              onChange={onCheckOut}
              note="Check-out must be later than check-in. A date is closed when no room can cover that stay."
            />
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
              disabled={busy}
              className="btn-press animate-live-gradient relative inline-flex h-full min-w-44 items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-sm font-semibold tracking-wide text-white disabled:opacity-60"
            >
              <span className="animate-shimmer absolute inset-0 opacity-30" />
              <span className="relative">{busy ? "Checking…" : "Check Availability"}</span>
              <ArrowRightIcon className="relative h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      {searched ? (
        <div
          ref={resultsRef}
          className="mt-3 scroll-mt-24 overflow-hidden rounded-2xl border border-white/50 bg-white/95 text-ink shadow-[0_16px_40px_rgba(12,18,16,0.16)]"
        >
          <div className="flex flex-col gap-1 border-b border-ink/8 px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-5">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-stone uppercase">
                {results.length === 0 ? "No rooms available" : "Available rooms"}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatStayDate(checkIn)} – {formatStayDate(checkOut)}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-ink/55 sm:max-w-md sm:text-right">
              {scheduleHint(checkInTime, checkOutTime)}. A checkout morning stays open for a new
              check-in at {formatClockLabel(checkInTime)}.
            </p>
          </div>
          {results.length === 0 ? (
            <p role="status" className="px-4 py-4 text-sm leading-relaxed text-amber-950 sm:px-5">
              No rooms are available from {formatStayDate(checkIn)} to {formatStayDate(checkOut)}.
              Every room type is booked for at least part of that stay.
            </p>
          ) : (
            <div
              ref={resultsScrollRef}
              className="max-h-[min(13rem,32svh)] overflow-y-auto overscroll-contain lg:max-h-[16.75rem]"
            >
              <div className="grid grid-cols-1 divide-y divide-ink/8 lg:grid-cols-2 lg:gap-3 lg:divide-y-0 lg:p-4 xl:grid-cols-3">
                {results.map(({ room, remaining, quantity }) => {
                  const priced = applyVoucherToPrice(room.price_per_night || "", voucher);
                  const cover = roomsMediaUrl(room.images[0] ?? "");
                  return (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 px-3 py-3 sm:px-4 lg:rounded-xl lg:border lg:border-ink/8 lg:bg-white lg:px-3 lg:py-3"
                    >
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-mist lg:h-20 lg:w-28">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base leading-tight text-ink lg:text-lg lg:whitespace-normal">
                          {room.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-sky-deep sm:text-sm">
                          {remaining} of {quantity} {quantity === 1 ? "room" : "rooms"} available
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink/55 lg:whitespace-normal">
                          {room.max_capacity || "Capacity on request"}
                          {priced.display ? ` · ${priced.display} / night` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void selectRoom(room.id)}
                        disabled={selectingId != null}
                        className="btn-press inline-flex shrink-0 items-center justify-center rounded-full bg-sky-deep px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sky disabled:opacity-60 sm:px-4 sm:text-sm"
                      >
                        {selectingId === room.id ? "Opening…" : "Select"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
