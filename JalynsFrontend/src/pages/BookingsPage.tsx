import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { CONTENT_CHANGED_EVENT, CONTENT_SYNC_CHANNEL } from "../components/ContentSync";
import { useAuth } from "../context/AuthContext";
import {
  fetchRoomBookings,
  formatRoomPrice,
  updateRoomBookingStatus,
  type RoomBooking,
  type RoomBookingStatus,
} from "../lib/rooms";

type ListFilter = "all" | "confirmed" | "completed" | "arrivals";

const filters: { id: ListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "arrivals", label: "Today's arrivals" },
];

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function formatMoneyDisplay(value: string | null | undefined) {
  if (!value?.trim()) return "—";
  return formatRoomPrice(value);
}

function formatStayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function StatusBadge({ status }: { status: RoomBookingStatus }) {
  const label = status === "pending" ? "confirmed" : status;
  const styles: Record<"confirmed" | "completed", string> = {
    confirmed: "bg-emerald-100 text-emerald-900 border-emerald-200",
    completed: "bg-[#e8f3f8] text-sky border-[#c5dde8]",
  };
  const key = label === "completed" ? "completed" : "confirmed";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[key]}`}
    >
      {label}
    </span>
  );
}

function bookingsSignature(list: RoomBooking[]) {
  return list
    .map((b) => `${b.id}:${b.status}:${b.estimated_total ?? ""}:${b.created_at}`)
    .join("|");
}

const BOOKINGS_CACHE_KEY = "jalyns-bookings-cache-v1";

function readBookingsCache(): RoomBooking[] {
  try {
    const raw = sessionStorage.getItem(BOOKINGS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RoomBooking[]) : [];
  } catch {
    return [];
  }
}

function writeBookingsCache(list: RoomBooking[]) {
  try {
    sessionStorage.setItem(BOOKINGS_CACHE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function BookingsSkeleton() {
  return (
    <div className="mt-8 space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[4.5rem] animate-pulse rounded-2xl border border-ink/6 bg-white/80"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function BookingsPage() {
  const { can, role, approvalStatus } = useAuth();
  const [bookings, setBookings] = useState<RoomBooking[]>(() => readBookingsCache());
  const [loading, setLoading] = useState(() => readBookingsCache().length === 0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const signatureRef = useRef(bookingsSignature(readBookingsCache()));

  const allowed = can.canManageBookings(role, approvalStatus);

  const loadBookings = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!opts?.quiet && bookings.length === 0) setLoading(true);
      if (!opts?.quiet) setError(null);
      try {
        const next = await fetchRoomBookings();
        const sig = bookingsSignature(next);
        if (sig !== signatureRef.current) {
          signatureRef.current = sig;
          setBookings(next);
          writeBookingsCache(next);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load bookings.");
        if (!opts?.quiet && bookings.length === 0) setBookings([]);
      } finally {
        setLoading(false);
      }
    },
    [bookings.length],
  );

  useEffect(() => {
    if (!allowed) return;
    void loadBookings();

    const refresh = () => void loadBookings({ quiet: true });
    window.addEventListener(CONTENT_CHANGED_EVENT, refresh);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const poll = window.setInterval(refresh, 2000);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CONTENT_SYNC_CHANNEL);
      channel.onmessage = () => refresh();
    } catch {
      channel = null;
    }

    return () => {
      window.removeEventListener(CONTENT_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
      channel?.close();
    };
  }, [allowed, loadBookings]);

  const filtered = useMemo(() => {
    if (filter === "all") return bookings;
    if (filter === "arrivals") {
      const today = todayIso();
      return bookings.filter((b) => b.check_in === today);
    }
    if (filter === "confirmed") {
      return bookings.filter((b) => b.status === "confirmed" || b.status === "pending");
    }
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const filterCounts = useMemo(() => {
    const today = todayIso();
    return {
      all: bookings.length,
      confirmed: bookings.filter((b) => b.status === "confirmed" || b.status === "pending")
        .length,
      completed: bookings.filter((b) => b.status === "completed").length,
      arrivals: bookings.filter((b) => b.check_in === today).length,
    };
  }, [bookings]);

  async function setStatus(id: string, status: RoomBookingStatus) {
    setBusyId(id);
    setError(null);
    try {
      const next = await updateRoomBookingStatus(id, status);
      signatureRef.current = bookingsSignature(next);
      setBookings(next);
      writeBookingsCache(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update booking.");
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col bg-foam text-ink">
        <div className="bg-[#050b12]">
          <Navbar />
        </div>
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-24 text-center">
          <p className="text-sm text-stone">Only approved admins can view bookings.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-foam text-ink">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_top,_rgba(3,105,161,0.08),_transparent_55%)]"
        aria-hidden
      />

      <div className="relative bg-[#050b12]">
        <Navbar />
      </div>

      <main className="relative mx-auto w-full max-w-[90rem] flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 sm:pb-20 md:px-8 md:pb-24 lg:px-10 xl:px-12">
        <header className="max-w-2xl animate-fade-up">
          <p className="text-[0.62rem] font-semibold tracking-[0.22em] text-sky uppercase">
            Admin only
          </p>
          <h1 className="mt-1.5 font-display text-3xl tracking-tight text-ink sm:text-4xl md:text-[2.75rem]">
            Bookings
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone sm:text-[0.95rem]">
            Guest room requests appear here live. New stays are confirmed automatically — mark
            them complete after checkout.
          </p>
        </header>

        <div
          className="animate-fade-up mt-7 flex flex-wrap gap-2"
          style={{ animationDelay: "60ms" }}
          role="tablist"
          aria-label="Filter bookings"
        >
          {filters.map((f) => {
            const count = filterCounts[f.id];
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-[background-color,color,border-color] duration-200 sm:px-4 ${
                  active
                    ? "bg-sky text-white shadow-[0_6px_18px_rgba(3,105,161,0.22)]"
                    : "border border-ink/10 bg-white/90 text-ink hover:border-ink/16 hover:bg-white"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.68rem] font-bold tabular-nums leading-none ${
                    active ? "bg-white/22 text-white" : "bg-ink/[0.07] text-ink"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <p
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {loading && bookings.length === 0 ? (
          <BookingsSkeleton />
        ) : filtered.length === 0 ? (
          <div className="animate-fade-up mt-8 rounded-2xl border border-dashed border-ink/12 bg-white/70 px-6 py-14 text-center">
            <p className="font-display text-2xl text-ink">No bookings here</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone">
              {filter === "arrivals"
                ? "No guests are checking in today."
                : filter === "completed"
                  ? "Completed stays will show up in this list."
                  : "When a guest submits a room request, it will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div
              className="animate-fade-up mt-8 hidden overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-[0_10px_40px_rgba(12,18,16,0.05)] lg:block"
              style={{ animationDelay: "100ms" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[58rem] text-left text-sm">
                  <thead className="border-b border-ink/8 bg-[#f4f7f5] text-[0.68rem] tracking-[0.08em] text-stone uppercase">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Guest</th>
                      <th className="px-5 py-3.5 font-semibold">Contact</th>
                      <th className="px-5 py-3.5 font-semibold">Room</th>
                      <th className="px-5 py-3.5 font-semibold">Stay</th>
                      <th className="px-5 py-3.5 font-semibold">Total</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 font-semibold">Requested</th>
                      <th className="px-5 py-3.5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-ink/6 transition-colors last:border-0 hover:bg-[#f7faf8]"
                      >
                        <td className="px-5 py-4 align-middle font-medium whitespace-nowrap text-ink">
                          {b.full_name}
                        </td>
                        <td className="max-w-[14rem] px-5 py-4 align-middle text-stone">
                          <span className="block truncate" title={b.email}>
                            {b.email}
                          </span>
                          <span className="mt-0.5 block text-xs whitespace-nowrap text-stone/80">
                            {b.phone}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-middle whitespace-nowrap text-ink">
                          {b.room_name}
                        </td>
                        <td className="px-5 py-4 align-middle whitespace-nowrap text-stone">
                          {formatStayDate(b.check_in)}
                          <span className="text-ink/25"> – </span>
                          {formatStayDate(b.check_out)}
                          <span className="mt-0.5 block text-xs text-stone/75">
                            {b.nights} {b.nights === 1 ? "night" : "nights"} · {b.guests}{" "}
                            {b.guests === 1 ? "guest" : "guests"}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-middle font-semibold whitespace-nowrap text-ink">
                          {formatMoneyDisplay(b.estimated_total)}
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-5 py-4 align-middle whitespace-nowrap text-stone">
                          {formatDate(b.created_at)}
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <BookingActions
                            booking={b}
                            busy={busyId === b.id}
                            onStatus={setStatus}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ul
              className="animate-fade-up mt-8 space-y-3 lg:hidden"
              style={{ animationDelay: "100ms" }}
            >
              {filtered.map((b) => (
                <li
                  key={b.id}
                  className="rounded-2xl border border-ink/8 bg-white p-4 shadow-[0_6px_24px_rgba(12,18,16,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{b.full_name}</p>
                      <p className="mt-0.5 truncate text-sm text-stone">{b.email}</p>
                      <p className="text-sm text-stone/80">{b.phone}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <dl className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                    <div>
                      <dt className="text-[0.62rem] tracking-[0.12em] text-stone uppercase">
                        Room
                      </dt>
                      <dd className="mt-0.5 text-ink">{b.room_name}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.62rem] tracking-[0.12em] text-stone uppercase">
                        Total
                      </dt>
                      <dd className="mt-0.5 font-semibold text-ink">
                        {formatMoneyDisplay(b.estimated_total)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[0.62rem] tracking-[0.12em] text-stone uppercase">
                        Stay
                      </dt>
                      <dd className="mt-0.5 text-ink">
                        {formatStayDate(b.check_in)} – {formatStayDate(b.check_out)} · {b.nights}{" "}
                        {b.nights === 1 ? "night" : "nights"} · {b.guests}{" "}
                        {b.guests === 1 ? "guest" : "guests"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[0.62rem] tracking-[0.12em] text-stone uppercase">
                        Requested
                      </dt>
                      <dd className="mt-0.5 text-stone">{formatDate(b.created_at)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3.5 border-t border-ink/6 pt-3">
                    <BookingActions booking={b} busy={busyId === b.id} onStatus={setStatus} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function BookingActions({
  booking,
  busy,
  onStatus,
}: {
  booking: RoomBooking;
  busy: boolean;
  onStatus: (id: string, status: RoomBookingStatus) => void;
}) {
  const isActive = booking.status === "confirmed" || booking.status === "pending";
  return (
    <div className="flex flex-wrap gap-1.5">
      {isActive ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus(booking.id, "completed")}
          className="rounded-full bg-sky px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-bright disabled:opacity-50"
        >
          {busy ? "Saving…" : "Complete"}
        </button>
      ) : null}
      {booking.status === "completed" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus(booking.id, "confirmed")}
          className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist disabled:opacity-50"
        >
          {busy ? "Saving…" : "Reopen"}
        </button>
      ) : null}
    </div>
  );
}
