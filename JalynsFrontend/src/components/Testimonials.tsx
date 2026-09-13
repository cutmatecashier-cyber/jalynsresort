import { useState } from "react";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
} from "./Icons";
import { Reveal } from "./Reveal";

const reviews = [
  {
    id: "sarah",
    name: "Sarah L.",
    source: "TripAdvisor",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    quote:
      "Beautiful cove views, kind staff, and the restaurant was a highlight of our Puerto Galera trip.",
  },
  {
    id: "james",
    name: "James C.",
    source: "Google",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    quote:
      "The diving center made our first open-water dives easy and unforgettable. We’ll be back.",
  },
  {
    id: "anna",
    name: "Anna R.",
    source: "Booking.com",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    quote:
      "Clean rooms, calm mornings by the pool, and food that felt homemade. Perfect weekend escape.",
  },
] as const;

export function Testimonials() {
  const [active, setActive] = useState(0);

  return (
    <section className="bg-white px-4 py-12 sm:px-5 sm:py-16 md:px-8 md:py-20 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex items-end justify-between gap-3">
          <h2 className="font-display text-3xl text-ink sm:text-4xl md:text-5xl">
            What Our Guests Say
          </h2>
          <a
            href="#contact"
            className="hidden items-center gap-1.5 text-sm font-semibold text-ink/70 transition hover:gap-2.5 hover:text-ink sm:inline-flex"
          >
            View All Reviews
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </a>
        </Reveal>

        <Reveal delay={120} className="relative mt-6 md:hidden">
          <article
            key={reviews[active].id}
            className="animate-fade-up rounded-2xl border border-ink/8 bg-foam p-5"
          >
            <div className="flex items-center gap-3">
              <img
                src={reviews[active].avatar}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
              <div>
                <h3 className="text-sm font-semibold text-ink">{reviews[active].name}</h3>
                <div className="mt-0.5 flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="h-3 w-3" />
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone">
              “{reviews[active].quote}”
            </p>
            <p className="mt-3 text-[0.65rem] font-semibold tracking-[0.16em] text-ink/35 uppercase">
              {reviews[active].source}
            </p>
          </article>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setActive((v) => (v - 1 + reviews.length) % reviews.length)}
              className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 transition hover:border-ink/25"
              aria-label="Previous"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActive((v) => (v + 1) % reviews.length)}
              className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 transition hover:border-ink/25"
              aria-label="Next"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        <div className="mt-8 hidden gap-4 md:grid md:grid-cols-3">
          {reviews.map((review, index) => (
            <Reveal key={review.id} delay={100 + index * 100}>
              <article className="h-full rounded-2xl border border-ink/8 bg-foam p-5 transition duration-300 hover:-translate-y-1 hover:border-ink/15 hover:shadow-[0_12px_30px_rgba(12,18,16,0.06)]">
                <div className="flex items-center gap-3">
                  <img
                    src={review.avatar}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{review.name}</h3>
                    <div className="mt-0.5 flex gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} className="h-3 w-3" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-stone">“{review.quote}”</p>
                <p className="mt-3 text-[0.65rem] font-semibold tracking-[0.16em] text-ink/35 uppercase">
                  {review.source}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
