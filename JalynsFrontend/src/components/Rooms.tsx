import { useState } from "react";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { Reveal } from "./Reveal";

const rooms = [
  {
    id: "deluxe",
    name: "Deluxe Room",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "suite",
    name: "Garden Suite",
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "family",
    name: "Family Room",
    image:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "ocean",
    name: "Ocean View",
    image:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80",
  },
] as const;

export function Rooms() {
  const [active, setActive] = useState(0);

  return (
    <section id="rooms" className="bg-white px-4 pb-10 sm:px-5 sm:pb-14 md:px-8 lg:px-10">
      <Reveal variant="scale" className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[1.5rem]">
          <img
            src={rooms[active].image}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm transition duration-700"
          />
          <div className="absolute inset-0 bg-ink/70" />

          <div className="relative grid gap-6 p-5 sm:p-7 md:grid-cols-2 md:items-center md:gap-8 md:p-10">
            <div className="text-white">
              <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-white/55 uppercase">
                Our Rooms and Apartments
              </p>
              <h2 className="mt-2 font-display text-3xl leading-[1.08] sm:text-4xl md:text-5xl">
                Stay in Comfort and Style
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[0.95rem]">
                From cozy doubles to spacious suites, every room is crafted for restful nights and
                easy mornings overlooking Puerto Galera.
              </p>
              <a
                href="#book"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:gap-3 hover:bg-white/10"
              >
                View All Rooms
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                <div className="relative aspect-[5/4]">
                  {rooms.map((room, index) => (
                    <img
                      key={room.id}
                      src={room.image}
                      alt={room.name}
                      className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                        index === active
                          ? "scale-100 opacity-100"
                          : "scale-105 opacity-0"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActive((c) => (c - 1 + rooms.length) % rooms.length)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                    aria-label="Previous room"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive((c) => (c + 1) % rooms.length)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                    aria-label="Next room"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm font-medium text-white/80">
                  {active + 1} / {rooms.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
