import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DEFAULT_ROOMS,
  fetchRoomsCatalog,
  roomsMediaUrl,
  ROOMS_UPDATED_EVENT,
  type Room,
} from "../lib/rooms";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { Reveal } from "./Reveal";

function roomCover(room: Room) {
  return roomsMediaUrl(room.images[0] ?? "");
}

/** Homepage rooms strip — shows room photos only; full details live on /rooms. */
export function HomeRooms() {
  const [rooms, setRooms] = useState<Room[]>(() =>
    DEFAULT_ROOMS.map((r) => ({ ...r, amenities: [...r.amenities], images: [...r.images] })),
  );
  const [active, setActive] = useState(0);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchRoomsCatalog().then((data) => {
      if (!cancelled && data.rooms.length) setRooms(data.rooms);
    });
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ rooms?: Room[] }>).detail;
      if (detail?.rooms?.length) {
        setRooms(detail.rooms);
        return;
      }
      void fetchRoomsCatalog().then((data) => {
        if (!cancelled && data.rooms.length) setRooms(data.rooms);
      });
    };
    window.addEventListener(ROOMS_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(ROOMS_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    if (active >= rooms.length) setActive(Math.max(0, rooms.length - 1));
  }, [rooms.length, active]);

  useEffect(() => {
    if (rooms.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((c) => (c + 1) % rooms.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [rooms.length]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = document.getElementById("rooms");
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const progress = Math.min(Math.max(-rect.top / (rect.height + window.innerHeight), 0), 1);
        setParallaxY(progress * 40);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const current = rooms[active] ?? rooms[0];
  const cover = current ? roomCover(current) : "";

  function prev() {
    if (rooms.length < 2) return;
    setActive((c) => (c - 1 + rooms.length) % rooms.length);
  }

  function next() {
    if (rooms.length < 2) return;
    setActive((c) => (c + 1) % rooms.length);
  }

  return (
    <section id="rooms" className="bg-white px-5 py-10 sm:px-6 sm:py-14 md:px-8 lg:px-10 lg:py-16 xl:px-12">
      <div className="relative overflow-hidden rounded-[1.5rem]">
        {cover ? (
          <img
            src={cover}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm will-change-transform"
            style={{ transform: `translate3d(0, ${parallaxY}px, 0) scale(1.12)` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-ink/72" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/55 via-transparent to-ink/25" />

        <div className="relative grid gap-8 p-5 sm:gap-10 sm:p-7 md:grid-cols-2 md:items-center md:gap-10 md:p-10 lg:p-12">
          <Reveal variant="left" delay={40}>
            <div className="text-white">
              <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-white/55 uppercase">
                Our Rooms and Apartments
              </p>
              <h2 className="mt-2 font-display text-3xl leading-[1.08] sm:text-4xl md:text-5xl">
                Stay in Comfort and Style
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[0.95rem]">
                From cozy doubles to spacious suites — restful nights and easy mornings overlooking
                Puerto Galera.
              </p>

              {current ? (
                <p
                  key={current.id}
                  className="animate-fade-up mt-5 max-w-md font-display text-xl text-white sm:text-2xl"
                >
                  {current.name}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/rooms"
                  className="btn-press inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:gap-3 hover:bg-white/92"
                >
                  View all rooms
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/book"
                  className="btn-press inline-flex items-center gap-2 rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Book now
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right" delay={140}>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/15">
                <div className="relative aspect-[5/4] bg-ink/40">
                  {rooms.map((room, index) => {
                    const src = roomCover(room);
                    if (!src) return null;
                    return (
                      <img
                        key={room.id}
                        src={src}
                        alt={room.name}
                        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          index === active ? "scale-100 opacity-100" : "scale-105 opacity-0"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={prev}
                    className="btn-press flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-40"
                    aria-label="Previous room"
                    disabled={rooms.length < 2}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="btn-press flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-40"
                    aria-label="Next room"
                    disabled={rooms.length < 2}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
                    {rooms.map((room, index) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setActive(index)}
                        className={`h-1.5 rounded-full transition ${
                          index === active ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                        }`}
                        aria-label={`Show ${room.name}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium tabular-nums text-white/80">
                    {rooms.length ? `${active + 1} / ${rooms.length}` : "0 / 0"}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
