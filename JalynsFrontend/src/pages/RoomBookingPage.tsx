import { useEffect, useLayoutEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { scrollToTopInstant } from "../components/ScrollToTop";
import { broadcastContentChanged, refreshLocalContent } from "../components/ContentSync";
import {
  DEFAULT_ROOMS,
  DEFAULT_ROOMS_VOUCHER,
  applyVoucherToPrice,
  fetchRoomsCatalog,
  formatPesoAmount,
  roomsMediaUrl,
  submitRoomBooking,
  type Room,
  type RoomsVoucher,
} from "../lib/rooms";

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function RoomPrice({
  price,
  voucher,
  compact = false,
}: {
  price: string;
  voucher: RoomsVoucher;
  compact?: boolean;
}) {
  const priced = applyVoucherToPrice(price, voucher);
  return (
    <dd className={`mt-0.5 font-semibold text-ink ${compact ? "text-[0.8rem]" : ""}`}>
      {priced.original ? (
        <span className="mr-1.5 text-[0.75em] font-medium text-ink/40 line-through">
          {priced.original}
        </span>
      ) : null}
      <span>{priced.display}</span>
      {priced.percent != null ? (
        <span className="ml-1 text-[0.65rem] font-semibold text-amber-800">
          (−{priced.percent}%)
        </span>
      ) : null}
    </dd>
  );
}

function RoomDetails({
  room,
  voucher,
  compact = false,
}: {
  room: Room;
  voucher: RoomsVoucher;
  compact?: boolean;
}) {
  return (
    <dl
      className={`grid grid-cols-2 gap-x-3 text-sm sm:grid-cols-3 ${
        compact
          ? "mt-1.5 gap-y-1 border-t border-ink/10 pt-1.5"
          : "mt-3 gap-y-2.5 border-t border-ink/10 pt-3"
      }`}
    >
      <div>
        <dt
          className={`font-semibold tracking-wide text-ink/45 uppercase ${
            compact ? "text-[0.55rem]" : "text-[0.62rem]"
          }`}
        >
          Price per night
        </dt>
        <RoomPrice price={room.price_per_night || ""} voucher={voucher} compact={compact} />
      </div>
      <div>
        <dt
          className={`font-semibold tracking-wide text-ink/45 uppercase ${
            compact ? "text-[0.55rem]" : "text-[0.62rem]"
          }`}
        >
          Size
        </dt>
        <dd className={`mt-0.5 truncate font-medium text-ink ${compact ? "text-[0.8rem]" : ""}`}>
          {room.size || "—"}
        </dd>
      </div>
      <div>
        <dt
          className={`font-semibold tracking-wide text-ink/45 uppercase ${
            compact ? "text-[0.55rem]" : "text-[0.62rem]"
          }`}
        >
          Max capacity
        </dt>
        <dd className={`mt-0.5 truncate font-medium text-ink ${compact ? "text-[0.8rem]" : ""}`}>
          {room.max_capacity || "—"}
        </dd>
      </div>
      <div>
        <dt
          className={`font-semibold tracking-wide text-ink/45 uppercase ${
            compact ? "text-[0.55rem]" : "text-[0.62rem]"
          }`}
        >
          Beds
        </dt>
        <dd className={`mt-0.5 truncate font-medium text-ink ${compact ? "text-[0.8rem]" : ""}`}>
          {room.beds || "—"}
        </dd>
      </div>
      <div>
        <dt
          className={`font-semibold tracking-wide text-ink/45 uppercase ${
            compact ? "text-[0.55rem]" : "text-[0.62rem]"
          }`}
        >
          Extra person
        </dt>
        <dd className={`mt-0.5 truncate font-medium text-ink ${compact ? "text-[0.8rem]" : ""}`}>
          {room.extra_person_charge || "—"}
        </dd>
      </div>
      <div>
        <dt
          className={`font-semibold tracking-wide text-ink/45 uppercase ${
            compact ? "text-[0.55rem]" : "text-[0.62rem]"
          }`}
        >
          Status
        </dt>
        <dd
          className={`mt-0.5 font-medium text-ink capitalize ${compact ? "text-[0.8rem]" : ""}`}
        >
          {room.status || "available"}
        </dd>
      </div>
    </dl>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

type Step = "pick" | "form" | "review" | "done";

function formatDisplayDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function nightsBetween(checkInIso: string, checkOutIso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInIso) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOutIso)) {
    return 0;
  }
  const start = new Date(`${checkInIso}T12:00:00`).getTime();
  const end = new Date(`${checkOutIso}T12:00:00`).getTime();
  const ms = end - start;
  if (ms <= 0) return 0;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Full-page room booking — choose a room first, then guest & stay details. */
export function RoomBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetRoomId = searchParams.get("room");

  const minCheckIn = todayIso();
  const [catalog, setCatalog] = useState<Room[]>(() =>
    DEFAULT_ROOMS.map((r) => ({ ...r, amenities: [...r.amenities], images: [...r.images] })),
  );
  const [voucher, setVoucher] = useState<RoomsVoucher>({ ...DEFAULT_ROOMS_VOUCHER });
  const [loading, setLoading] = useState(true);
  const [pickedId, setPickedId] = useState<string | null>(presetRoomId);
  const [step, setStep] = useState<Step>("pick");
  const [checkIn, setCheckIn] = useState(minCheckIn);
  const [checkOut, setCheckOut] = useState(addDaysIso(minCheckIn, 1));
  const [guests, setGuests] = useState("2");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookable = useMemo(
    () => catalog.filter((r) => r.status !== "unavailable"),
    [catalog],
  );

  const selectedRoom = useMemo(
    () => bookable.find((r) => r.id === pickedId) ?? null,
    [bookable, pickedId],
  );

  const staySummary = useMemo(() => {
    const nights = nightsBetween(checkIn, checkOut);
    if (!selectedRoom) {
      return { nights, priced: null as ReturnType<typeof applyVoucherToPrice> | null, total: null as number | null };
    }
    const priced = applyVoucherToPrice(selectedRoom.price_per_night || "", voucher);
    const total =
      priced.discountedAmount != null && nights > 0
        ? priced.discountedAmount * nights
        : null;
    return { nights, priced, total };
  }, [selectedRoom, voucher, checkIn, checkOut]);

  useEffect(() => {
    let cancelled = false;
    void fetchRoomsCatalog().then((data) => {
      if (cancelled) return;
      if (data.rooms.length) setCatalog(data.rooms);
      setVoucher(data.voucher);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!presetRoomId) return;
    const match = bookable.find((r) => r.id === presetRoomId);
    if (match) {
      setPickedId(match.id);
      setStep("form");
    }
  }, [loading, presetRoomId, bookable]);

  useLayoutEffect(() => {
    if (step !== "form" && step !== "review" && step !== "done") return;
    scrollToTopInstant();
    const frame = requestAnimationFrame(() => scrollToTopInstant());
    return () => cancelAnimationFrame(frame);
  }, [step]);

  function continueToForm() {
    setError(null);
    if (!pickedId || !bookable.some((r) => r.id === pickedId)) {
      setError("Please choose a room first.");
      return;
    }
    setStep("form");
  }

  function validateForm(): boolean {
    if (!selectedRoom) {
      setError("Please choose a room first.");
      setStep("pick");
      return false;
    }
    const guestCount = Number(guests);
    if (!checkIn || !checkOut) {
      setError("Check-in and check-out dates are required.");
      return false;
    }
    if (checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return false;
    }
    if (!Number.isFinite(guestCount) || guestCount < 1) {
      setError("Enter the number of guests.");
      return false;
    }
    if (!fullName.trim()) {
      setError("Full name is required.");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    if (!phone.trim()) {
      setError("Contact number is required.");
      return false;
    }
    return true;
  }

  function goToReview(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setStep("review");
  }

  async function confirmSubmit() {
    setError(null);
    if (!validateForm() || !selectedRoom) return;

    const guestCount = Number(guests);
    setBusy(true);
    try {
      const priceDisplay = staySummary.priced?.display ?? selectedRoom.price_per_night ?? null;
      const totalDisplay =
        staySummary.total != null ? formatPesoAmount(staySummary.total) : null;
      await submitRoomBooking({
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        checkIn,
        checkOut,
        guests: guestCount,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        nights: staySummary.nights > 0 ? staySummary.nights : undefined,
        pricePerNight: priceDisplay,
        estimatedTotal: totalDisplay,
        voucherPercent: staySummary.priced?.percent ?? null,
      });
      setStep("done");
      // Live admin update — don't block the success screen.
      broadcastContentChanged();
      void refreshLocalContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-foam text-ink">
      <section className="relative overflow-hidden bg-[#07101c] text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#07101c]/80 to-foam" />
        <Navbar />
        <div className="relative z-10 mx-auto max-w-[90rem] px-4 pt-[7rem] pb-12 sm:px-6 sm:pt-36 sm:pb-16 md:px-8 lg:px-10 xl:px-12">
          <p className="animate-fade-up text-[0.62rem] font-semibold tracking-[0.22em] text-white/70 uppercase">
            Rooms only
          </p>
          <h1 className="animate-fade-up mt-2 font-display text-3xl leading-tight text-white sm:text-5xl md:text-6xl">
            {step === "pick"
              ? "Choose your room"
              : step === "review"
                ? "Review booking"
                : step === "done"
                  ? "Request sent"
                  : "Complete your booking"}
          </h1>
          <p className="animate-fade-up mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
            {step === "pick"
              ? "Pick an available room first. Next you’ll enter stay dates and guest details."
              : step === "review"
                ? "Check everything carefully, then confirm to send your booking request."
                : step === "done"
                  ? "We’ve received your request and will get back to you soon."
                  : "Confirm your dates and how we can reach you."}
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-[90rem] px-4 pb-16 sm:px-6 sm:pb-20 md:px-8 lg:px-10 xl:px-12">
        {step === "done" && selectedRoom ? (
          <Reveal variant="up">
            <div className="-mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:-mt-8 sm:p-8">
              <p className="font-display text-2xl text-emerald-950 sm:text-3xl">Thank you</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-950/85 sm:text-base">
                {fullName.trim()}, your booking request for <strong>{selectedRoom.name}</strong>{" "}
                is in. We’ll contact you at <strong>{email.trim()}</strong>.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to="/rooms"
                  className="btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-sky-deep px-5 text-sm font-semibold text-white transition hover:bg-sky"
                >
                  Back to rooms
                </Link>
                <Link
                  to="/"
                  className="btn-press inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 text-sm font-semibold text-ink"
                >
                  Home
                </Link>
              </div>
            </div>
          </Reveal>
        ) : null}

        {step === "pick" ? (
          <div className="-mt-6 sm:-mt-8">
            {loading ? (
              <p className="rounded-3xl border border-ink/8 bg-white p-6 text-sm text-stone shadow-sm">
                Loading rooms…
              </p>
            ) : bookable.length === 0 ? (
              <p className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm">
                No rooms are available to book right now.{" "}
                <Link to="/contact" className="font-semibold text-sky-deep hover:underline">
                  Contact us
                </Link>{" "}
                for help.
              </p>
            ) : (
              <>
                <div className="grid gap-2 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {bookable.map((room, i) => {
                    const selected = pickedId === room.id;
                    const cover = roomsMediaUrl(room.images[0] ?? "");
                    return (
                      <Reveal key={room.id} delay={Math.min(i * 50, 200)} variant="up">
                        <button
                          type="button"
                          onClick={() => {
                            setPickedId(room.id);
                            setError(null);
                          }}
                          className={`btn-press group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition sm:rounded-3xl ${
                            selected
                              ? "border-sky-deep ring-2 ring-sky-deep/30"
                              : "border-ink/8 hover:border-ink/20 hover:shadow-md"
                          }`}
                        >
                          <div className="relative aspect-[2.8/1] w-full overflow-hidden bg-mist sm:aspect-[5/4]">
                            {cover ? (
                              <img
                                src={cover}
                                alt={room.name}
                                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                              />
                            ) : null}
                            {selected ? (
                              <span className="absolute top-1.5 right-1.5 rounded-full bg-sky-deep px-1.5 py-0.5 text-[0.55rem] font-semibold tracking-wide text-white uppercase sm:top-3 sm:right-3 sm:px-2.5 sm:py-1 sm:text-[0.65rem]">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col px-3 py-2 sm:p-5">
                            <h2 className="font-display text-[0.95rem] leading-tight text-ink sm:text-2xl">
                              {room.name}
                            </h2>
                            <div className="sm:hidden">
                              <RoomDetails room={room} voucher={voucher} compact />
                            </div>
                            <div className="hidden sm:block">
                              <RoomDetails room={room} voucher={voucher} />
                            </div>
                          </div>
                        </button>
                      </Reveal>
                    );
                  })}
                </div>

                {error ? (
                  <p
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                {/* Desktop / tablet actions */}
                <div className="mt-6 hidden flex-wrap items-center justify-between gap-3 sm:flex">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn-press inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 text-sm font-semibold text-ink"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={continueToForm}
                    disabled={!pickedId}
                    className="btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-sky-deep px-6 text-sm font-semibold text-white transition hover:bg-sky disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>

                {/* Mobile: spacer so floating bar doesn't cover last cards */}
                {pickedId ? <div className="h-24 sm:hidden" aria-hidden /> : null}

                {/* Mobile: floating Continue after a room is tapped */}
                {pickedId ? (
                  <div className="fixed inset-x-0 bottom-0 z-40 animate-fade-up px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2 sm:hidden">
                    <div className="mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-ink/10 bg-white/95 p-2 shadow-[0_12px_40px_rgba(8,18,28,0.22)] backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-ink/12 px-4 text-sm font-semibold text-ink"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={continueToForm}
                        className="btn-press inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-sky-deep px-5 text-sm font-semibold text-white transition hover:bg-sky"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {step === "form" && selectedRoom ? (
          <div className="-mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start sm:-mt-8">
            <Reveal variant="up">
              <aside className="overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-sm">
                <div className="aspect-[16/10] bg-mist">
                  {selectedRoom.images[0] ? (
                    <img
                      src={roomsMediaUrl(selectedRoom.images[0])}
                      alt={selectedRoom.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-5 sm:p-6">
                  <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-stone uppercase">
                    Selected room
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-ink">{selectedRoom.name}</h2>
                  <RoomDetails room={selectedRoom} voucher={voucher} />
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep("pick");
                      navigate("/book", { replace: true });
                    }}
                    className="btn-press mt-4 inline-flex text-sm font-semibold text-sky-deep hover:underline"
                  >
                    Change room
                  </button>
                </div>
              </aside>
            </Reveal>

            <Reveal variant="up" delay={80}>
              <form
                onSubmit={goToReview}
                className="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-7"
                noValidate
              >
                <section aria-labelledby="booking-info-heading">
                  <h3
                    id="booking-info-heading"
                    className="text-[0.7rem] font-semibold tracking-[0.18em] text-stone uppercase"
                  >
                    Booking Information
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-ink">
                      Check-in Date <span className="text-red-600">*</span>
                      <input
                        type="date"
                        required
                        min={minCheckIn}
                        value={checkIn}
                        onChange={(e) => {
                          const next = e.target.value;
                          setCheckIn(next);
                          if (checkOut <= next) setCheckOut(addDaysIso(next, 1));
                        }}
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      Check-out Date <span className="text-red-600">*</span>
                      <input
                        type="date"
                        required
                        min={addDaysIso(checkIn || minCheckIn, 1)}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-ink sm:col-span-2">
                      Number of Guests <span className="text-red-600">*</span>
                      <input
                        type="number"
                        required
                        min={1}
                        max={20}
                        step={1}
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </section>

                <section aria-labelledby="guest-info-heading" className="mt-7">
                  <h3
                    id="guest-info-heading"
                    className="text-[0.7rem] font-semibold tracking-[0.18em] text-stone uppercase"
                  >
                    Guest Information
                  </h3>
                  <div className="mt-3 grid gap-3">
                    <label className="block text-sm font-semibold text-ink">
                      Full Name <span className="text-red-600">*</span>
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Juan Dela Cruz"
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      Email Address <span className="text-red-600">*</span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      Contact Number <span className="text-red-600">*</span>
                      <input
                        type="tel"
                        required
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+63 9XX XXX XXXX"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </section>

                {error ? (
                  <p
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      setStep("pick");
                      navigate("/book", { replace: true });
                    }}
                    className="btn-press inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 px-5 text-sm font-semibold disabled:opacity-60"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-sky-deep px-6 text-sm font-semibold text-white transition hover:bg-sky disabled:opacity-60"
                  >
                    Review booking
                  </button>
                </div>
              </form>
            </Reveal>
          </div>
        ) : null}

        {step === "review" && selectedRoom ? (
          <div className="-mt-6 mx-auto max-w-2xl sm:-mt-8">
            <Reveal variant="up">
              <div className="overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-sm">
                <div className="aspect-[16/9] bg-mist sm:aspect-[2.2/1]">
                  {selectedRoom.images[0] ? (
                    <img
                      src={roomsMediaUrl(selectedRoom.images[0])}
                      alt={selectedRoom.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-6 p-5 sm:p-7">
                  <div>
                    <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-stone uppercase">
                      Room
                    </p>
                    <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
                      {selectedRoom.name}
                    </h2>
                    <RoomDetails room={selectedRoom} voucher={voucher} />
                  </div>

                  <section>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[0.7rem] font-semibold tracking-[0.18em] text-stone uppercase">
                        Booking Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setStep("form");
                        }}
                        className="btn-press text-xs font-semibold text-sky-deep hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-ink/8 bg-foam px-3.5 py-3">
                        <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                          Check-in
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-ink">
                          {formatDisplayDate(checkIn)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-ink/8 bg-foam px-3.5 py-3">
                        <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                          Check-out
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-ink">
                          {formatDisplayDate(checkOut)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-ink/8 bg-foam px-3.5 py-3">
                        <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                          Nights
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-ink">
                          {staySummary.nights} {staySummary.nights === 1 ? "night" : "nights"}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-ink/8 bg-foam px-3.5 py-3">
                        <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                          Guests
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-ink">{guests}</dd>
                      </div>
                    </dl>
                  </section>

                  <section>
                    <h3 className="text-[0.7rem] font-semibold tracking-[0.18em] text-stone uppercase">
                      Payment summary
                    </h3>
                    <div className="mt-3 space-y-2.5 rounded-2xl border border-ink/8 bg-foam px-3.5 py-3.5 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-ink/65">Price per night</span>
                        <span className="text-right font-semibold text-ink">
                          {staySummary.priced?.original ? (
                            <span className="mr-1.5 text-[0.75em] font-medium text-ink/40 line-through">
                              {staySummary.priced.original}
                            </span>
                          ) : null}
                          {staySummary.priced?.display ?? "—"}
                          {staySummary.priced?.percent != null ? (
                            <span className="ml-1 text-[0.65rem] font-semibold text-amber-800">
                              (−{staySummary.priced.percent}%)
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-ink/65">
                          × {staySummary.nights}{" "}
                          {staySummary.nights === 1 ? "night" : "nights"}
                        </span>
                        <span className="font-medium text-ink/70">
                          {staySummary.total != null
                            ? formatPesoAmount(staySummary.total)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 border-t border-ink/10 pt-2.5">
                        <span className="font-semibold text-ink">Estimated total</span>
                        <span className="font-display text-xl text-ink">
                          {staySummary.total != null
                            ? formatPesoAmount(staySummary.total)
                            : staySummary.priced?.display ?? "Contact for rates"}
                        </span>
                      </div>
                      {staySummary.total == null ? (
                        <p className="text-xs leading-relaxed text-stone">
                          This room has no fixed nightly rate. Final amount will be confirmed by
                          the resort.
                        </p>
                      ) : (
                        <p className="text-xs leading-relaxed text-stone">
                          Estimate based on room rate
                          {staySummary.priced?.percent != null
                            ? ` with ${staySummary.priced.percent}% voucher applied`
                            : ""}
                          . Extra person charges (if any) are not included.
                        </p>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[0.7rem] font-semibold tracking-[0.18em] text-stone uppercase">
                        Guest Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setStep("form");
                        }}
                        className="btn-press text-xs font-semibold text-sky-deep hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <dl className="mt-3 space-y-2.5 rounded-2xl border border-ink/8 bg-foam px-3.5 py-3.5 text-sm">
                      <div>
                        <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                          Full name
                        </dt>
                        <dd className="mt-0.5 font-semibold text-ink">{fullName.trim()}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                          Email
                        </dt>
                        <dd className="mt-0.5 font-semibold text-ink">{email.trim()}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                          Contact number
                        </dt>
                        <dd className="mt-0.5 font-semibold text-ink">{phone.trim()}</dd>
                      </div>
                    </dl>
                  </section>

                  {error ? (
                    <p
                      className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
                      role="alert"
                    >
                      {error}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        setStep("form");
                      }}
                      className="btn-press inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 px-5 text-sm font-semibold disabled:opacity-60"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void confirmSubmit()}
                      className="btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-sky-deep px-6 text-sm font-semibold text-white transition hover:bg-sky disabled:opacity-60"
                    >
                      {busy ? "Sending…" : "Confirm & submit"}
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        ) : null}
      </div>

      <Footer />
    </main>
  );
}
