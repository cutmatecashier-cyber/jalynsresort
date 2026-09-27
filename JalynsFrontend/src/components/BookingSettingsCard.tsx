import { useEffect, useRef, useState, type FormEvent } from "react";
import { broadcastContentChanged } from "./ContentSync";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  formatClockLabel,
} from "../lib/roomAvailability";
import { fetchRoomAvailability, updateBookingSchedule } from "../lib/rooms";

export function BookingSettingsCard({
  onSchedule,
}: {
  onSchedule?: (schedule: { checkInTime: string; checkOutTime: string }) => void;
}) {
  const [checkInTime, setCheckInTime] = useState(DEFAULT_CHECK_IN_TIME);
  const [checkOutTime, setCheckOutTime] = useState(DEFAULT_CHECK_OUT_TIME);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const onScheduleRef = useRef(onSchedule);
  onScheduleRef.current = onSchedule;

  useEffect(() => {
    let cancelled = false;
    void fetchRoomAvailability().then((snapshot) => {
      if (cancelled || !snapshot) return;
      const next = {
        checkInTime: snapshot.checkInTime || DEFAULT_CHECK_IN_TIME,
        checkOutTime: snapshot.checkOutTime || DEFAULT_CHECK_OUT_TIME,
      };
      setCheckInTime(next.checkInTime);
      setCheckOutTime(next.checkOutTime);
      onScheduleRef.current?.(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await updateBookingSchedule({ checkInTime, checkOutTime });
      setCheckInTime(next.checkInTime);
      setCheckOutTime(next.checkOutTime);
      onSchedule?.(next);
      setSaved(true);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save booking settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-sm font-semibold text-ink">Booking settings</p>
      <p className="mt-1 text-xs leading-relaxed text-ink/55">
        Standard check-in is {formatClockLabel(checkInTime)} and check-out is{" "}
        {formatClockLabel(checkOutTime)}. Availability uses these times, so a guest can check in
        on another guest&apos;s checkout date when checkout is earlier and a room is still free.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-ink/70">Check-in time</span>
          <input
            type="time"
            required
            value={checkInTime}
            onChange={(event) => {
              setSaved(false);
              setCheckInTime(event.target.value);
            }}
            className="mt-1.5 w-full rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink/70">Check-out time</span>
          <input
            type="time"
            required
            value={checkOutTime}
            onChange={(event) => {
              setSaved(false);
              setCheckOutTime(event.target.value);
            }}
            className="mt-1.5 w-full rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15"
          />
        </label>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="mt-3 text-sm font-medium text-emerald-800">Saved.</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="btn-press mt-3 rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save booking settings"}
      </button>
    </form>
  );
}
