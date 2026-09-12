import { useEffect, useState } from "react";
import { BookingBar } from "./BookingBar";
import { MapPinIcon } from "./Icons";
import { Navbar } from "./Navbar";

const slides = [
  {
    id: "pool",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2400&q=80",
    alt: "Infinity pool overlooking a tropical bay at Jalyn's Resort",
  },
  {
    id: "cove",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2400&q=80",
    alt: "Resort lounge chairs facing turquoise water in Puerto Galera",
  },
  {
    id: "deck",
    image:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=2400&q=80",
    alt: "Sunset view from a seaside resort terrace",
  },
  {
    id: "bay",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80",
    alt: "Turquoise bay near Puerto Galera",
  },
] as const;

const SLIDE_MS = 7000;

export function Hero() {
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
      setTick((value) => value + 1);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="home" className="relative min-h-[100svh] overflow-hidden text-white">
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <img
            key={slide.id}
            src={slide.image}
            alt={slide.alt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              index === active ? "opacity-100 animate-ken-burns" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/70" />
        <div className="live-orb top-[18%] left-[12%] hidden h-40 w-40 bg-white/25 sm:block" />
        <div className="live-orb live-orb-delayed right-[8%] bottom-[22%] hidden h-52 w-52 bg-sea/40 sm:block" />
      </div>

      <Navbar />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-start px-5 pt-[4.75rem] pb-5 sm:justify-end sm:px-6 sm:pt-28 sm:pb-10 md:px-8 md:pb-14 lg:px-10">
        {/* Copy — top on mobile */}
        <div className="order-1 mt-5 max-w-2xl sm:mt-0">
          <p className="animate-fade-up text-[0.58rem] font-semibold tracking-[0.18em] text-white/80 uppercase sm:text-[0.7rem] sm:tracking-[0.28em]">
            Welcome to Jalyn&apos;s Resort &amp; Restaurant
          </p>
          <h1
            className="animate-fade-up mt-2.5 font-display text-[1.85rem] leading-[1.08] text-white sm:mt-4 sm:text-5xl md:text-6xl lg:text-[4.5rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Your Paradise in Puerto Galera
          </h1>
          <p
            className="animate-fade-up mt-2.5 max-w-lg text-[0.8125rem] leading-relaxed text-white/85 sm:mt-4 sm:text-base md:text-lg"
            style={{ animationDelay: "0.16s" }}
          >
            <span className="sm:hidden">
              Comfortable rooms, delicious cuisine, and world-class diving in Puerto Galera.
            </span>
            <span className="hidden sm:inline">
              Relax, dine, and explore the beauty of Puerto Galera with our comfortable rooms,
              delicious cuisine, and world-class diving experiences.
            </span>
          </p>
        </div>

        {/* Location under copy on mobile; after booking on desktop */}
        <div
          className="animate-fade-up order-2 mt-3 flex flex-col items-start gap-2.5 sm:order-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          style={{ animationDelay: "0.28s" }}
        >
          <p className="flex max-w-full items-center gap-1.5 text-[0.68rem] text-white/85 sm:text-[0.8rem]">
            <span className="relative inline-flex shrink-0">
              <span className="animate-pulse-soft absolute inset-0 rounded-full bg-white/40" />
              <MapPinIcon className="relative h-3.5 w-3.5" />
            </span>
            <span className="truncate">
              <span className="sm:hidden">Mangrove Cove, Puerto Galera</span>
              <span className="hidden sm:inline">
                Mangrove Cove, Puerto Galera, Oriental Mindoro
              </span>
            </span>
          </p>

          <div className="flex items-center gap-1.5" role="tablist" aria-label="Hero slides">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`Show slide ${index + 1}`}
                onClick={() => {
                  setActive(index);
                  setTick((value) => value + 1);
                }}
                className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                  index === active ? "w-7 bg-white/30 sm:w-8" : "w-1.5 bg-white/45 hover:bg-white/70"
                }`}
              >
                {index === active ? (
                  <span
                    key={tick}
                    className="animate-progress absolute inset-y-0 left-0 w-full rounded-full bg-white"
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Booking — lower on mobile, between copy and location on desktop */}
        <div
          className="animate-fade-up order-3 mt-auto w-full pb-1 sm:order-2 sm:mt-8 sm:max-w-xl sm:pb-0 md:mt-10 md:max-w-3xl"
          style={{ animationDelay: "0.1s" }}
        >
          <BookingBar />
        </div>

        <div className="order-4 mt-4 hidden justify-center sm:mt-8 sm:flex">
          <a
            href="#rooms"
            className="animate-scroll-hint flex flex-col items-center gap-1 text-[0.65rem] tracking-[0.2em] text-white/60 uppercase"
            aria-label="Scroll to rooms"
          >
            <span>Scroll</span>
            <span className="h-6 w-px bg-white/50" />
          </a>
        </div>
      </div>
    </section>
  );
}
