import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { GalleryPager } from "./GalleryPager";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { Reveal } from "./Reveal";

export type HomeFeatureSlide = {
  id: string;
  src: string;
  alt: string;
};

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  cta: { to: string; label: string };
  slides: HomeFeatureSlide[];
  edit?: ReactNode;
};

/** Homepage preview card — same layout as Our Rooms and Apartments. */
export function HomeFeaturePreview({ id, eyebrow, title, children, cta, slides, edit }: Props) {
  const [active, setActive] = useState(0);
  const [parallaxY, setParallaxY] = useState(0);
  const count = slides.length;
  const current = slides[active] ?? slides[0];
  const cover = current?.src ?? "";

  useEffect(() => {
    if (active >= count) setActive(Math.max(0, count - 1));
  }, [count, active]);

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((c) => (c + 1) % count);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [count]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = document.getElementById(id);
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
  }, [id]);

  function prev() {
    if (count < 2) return;
    setActive((c) => (c - 1 + count) % count);
  }

  function next() {
    if (count < 2) return;
    setActive((c) => (c + 1) % count);
  }

  return (
    <section id={id} className="bg-white px-5 py-10 sm:px-6 sm:py-14 md:px-8 lg:px-10 lg:py-16 xl:px-12">
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
                {eyebrow}
              </p>
              <h2 className="mt-2 font-display text-3xl leading-[1.08] sm:text-4xl md:text-[2.65rem] lg:text-5xl">
                {title}
              </h2>
              <div className="mt-3 max-w-xl space-y-3 text-sm leading-relaxed text-white/75 sm:text-[0.95rem]">
                {children}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to={cta.to}
                  className="btn-press inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:gap-3 hover:bg-white/92"
                >
                  {cta.label}
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right" delay={140}>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/15">
                <div className="relative aspect-[5/4] bg-ink/40">
                  {slides.map((slide, index) =>
                    slide.src ? (
                      <img
                        key={slide.id}
                        src={slide.src}
                        alt={slide.alt}
                        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          index === active ? "scale-100 opacity-100" : "scale-105 opacity-0"
                        }`}
                      />
                    ) : null,
                  )}
                </div>
              </div>

              {count > 1 ? (
                <div className="mt-3.5 flex items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={prev}
                      className="btn-press flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                      aria-label="Previous photo"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="btn-press flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                      aria-label="Next photo"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <GalleryPager count={count} active={active} tone="light" onSelect={setActive} />
                </div>
              ) : null}

              {edit ? <div className="mt-4 flex justify-end">{edit}</div> : null}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
