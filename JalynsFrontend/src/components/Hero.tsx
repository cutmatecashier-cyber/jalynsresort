import { useEffect, useState } from "react";
import { BookingBar } from "./BookingBar";
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
] as const;

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="home" className="relative min-h-dvh overflow-hidden text-white">
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />
      </div>

      <Navbar />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-7xl flex-col justify-end px-5 pb-10 pt-28 md:px-8 md:pb-12 lg:px-10 lg:pb-14">
        <div className="max-w-2xl">
          <p
            className="animate-fade-up text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/80"
            style={{ animationDelay: "0.05s" }}
          >
            Welcome to Jalyn&apos;s Resort &amp; Restaurant
          </p>
          <h1
            className="animate-fade-up mt-4 font-display text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.1rem]"
            style={{ animationDelay: "0.15s" }}
          >
            Your Paradise in Puerto Galera
          </h1>
          <p
            className="animate-fade-up mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg"
            style={{ animationDelay: "0.25s" }}
          >
            Relax, dine, and explore the beauty of Puerto Galera with our comfortable rooms,
            delicious cuisine, and world-class diving experiences.
          </p>
        </div>

        <div className="mt-8 md:mt-10">
          <BookingBar />
        </div>

        <div className="mt-8 flex items-end justify-between gap-6">
          <div className="flex items-center gap-2" role="tablist" aria-label="Hero slides">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`Show slide ${index + 1}`}
                onClick={() => setActive(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === active ? "w-7 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          <p className="animate-fade-in flex max-w-[14rem] items-start gap-2 text-right text-xs leading-snug text-white/85 sm:max-w-none sm:text-sm">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold text-white">Mangrove Cove</span>
              <span className="block text-white/75">Puerto Galera, Oriental Mindoro</span>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
