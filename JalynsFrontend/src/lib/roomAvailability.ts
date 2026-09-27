/** Hotel-style inventory. Keep in sync with JalynsBackend/src/services/roomAvailability.ts */

export const DEFAULT_CHECK_IN_TIME = "14:00";
export const DEFAULT_CHECK_OUT_TIME = "11:00";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type StaySpan = {
  checkIn: string;
  checkOut: string;
};

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function formatClockLabel(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(":");
  let hours = Number(hRaw);
  const minutes = String(mRaw ?? "00").padStart(2, "0");
  if (!Number.isFinite(hours)) return hhmm;
  const suffix = hours >= 12 ? "PM" : "AM";
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function asQuantity(value: unknown, fallback = 1): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(99, Math.max(1, Math.round(n)));
}

export function dateTimeMs(isoDate: string, minutes: number): number {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return Date.UTC(y, mo - 1, d, h, m, 0, 0);
}

function stayBounds(stay: StaySpan, checkInMinutes: number, checkOutMinutes: number) {
  return {
    start: dateTimeMs(stay.checkIn, checkInMinutes),
    end: dateTimeMs(stay.checkOut, checkOutMinutes),
  };
}

export function maxConcurrent(
  stays: StaySpan[],
  start: number,
  end: number,
  checkInMinutes: number,
  checkOutMinutes: number,
): number {
  if (!(end > start)) return 0;
  const events: { t: number; delta: number }[] = [];
  for (const stay of stays) {
    if (!ISO_DATE.test(stay.checkIn) || !ISO_DATE.test(stay.checkOut)) continue;
    const bounds = stayBounds(stay, checkInMinutes, checkOutMinutes);
    if (!(bounds.end > bounds.start)) continue;
    if (bounds.end <= start || bounds.start >= end) continue;
    const clipStart = Math.max(bounds.start, start);
    const clipEnd = Math.min(bounds.end, end);
    if (!(clipEnd > clipStart)) continue;
    events.push({ t: clipStart, delta: 1 });
    events.push({ t: clipEnd, delta: -1 });
  }
  events.sort((a, b) => a.t - b.t || a.delta - b.delta);
  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    if (current > peak) peak = current;
  }
  return peak;
}

export function nightOccupancy(
  stays: StaySpan[],
  iso: string,
  checkInMinutes: number,
  checkOutMinutes: number,
): number {
  if (!ISO_DATE.test(iso)) return 0;
  const start = dateTimeMs(iso, checkInMinutes);
  const end = dateTimeMs(addDaysIso(iso, 1), checkOutMinutes);
  return maxConcurrent(stays, start, end, checkInMinutes, checkOutMinutes);
}

export function isNightFullyBooked(
  stays: StaySpan[],
  iso: string,
  quantity: number,
  checkInMinutes: number,
  checkOutMinutes: number,
): boolean {
  if (quantity < 1) return true;
  return nightOccupancy(stays, iso, checkInMinutes, checkOutMinutes) >= quantity;
}

export function stayFits(
  stays: StaySpan[],
  checkIn: string,
  checkOut: string,
  quantity: number,
  checkInMinutes: number,
  checkOutMinutes: number,
): boolean {
  if (quantity < 1) return false;
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut) || !(checkOut > checkIn)) return false;
  const start = dateTimeMs(checkIn, checkInMinutes);
  const end = dateTimeMs(checkOut, checkOutMinutes);
  if (!(end > start)) return false;
  return maxConcurrent(stays, start, end, checkInMinutes, checkOutMinutes) < quantity;
}

export function roomsRemaining(
  stays: StaySpan[],
  checkIn: string,
  checkOut: string,
  quantity: number,
  checkInMinutes: number,
  checkOutMinutes: number,
): number {
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut) || !(checkOut > checkIn)) return 0;
  const start = dateTimeMs(checkIn, checkInMinutes);
  const end = dateTimeMs(checkOut, checkOutMinutes);
  const used = maxConcurrent(stays, start, end, checkInMinutes, checkOutMinutes);
  return Math.max(0, quantity - used);
}

export function findNextOpenNight(
  stays: StaySpan[],
  fromIso: string,
  quantity: number,
  checkInMinutes: number,
  checkOutMinutes: number,
  horizon = 540,
): string | null {
  let cursor = fromIso;
  for (let i = 0; i < horizon; i += 1) {
    if (!isNightFullyBooked(stays, cursor, quantity, checkInMinutes, checkOutMinutes)) {
      return cursor;
    }
    cursor = addDaysIso(cursor, 1);
  }
  return null;
}
