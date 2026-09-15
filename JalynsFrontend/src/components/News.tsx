import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import {
  DEFAULT_HOME_SECTIONS,
  fetchHomeSectionBackground,
  HOME_SECTION_UPDATED_EVENT,
  homeHeroMediaUrl,
  type HomeSectionKey,
} from "../lib/homeHero";
import { HomeSectionBgEditButton } from "./HomeSectionBgEditButton";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

const SECTION: HomeSectionKey = "news";

const posts = [
  {
    id: "dive-season",
    category: "Scuba Diving",
    title: "Peak dive season returns to Mangrove Cove",
    excerpt:
      "Calm mornings and clear water make this month ideal for reef dives and first-time open-water guests.",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80",
    cta: "Dive In",
    href: "/scuba-diving",
  },
  {
    id: "kitchen",
    category: "Restaurant",
    title: "Fresh catch nights at Jalyn’s Restaurant",
    excerpt:
      "Our kitchen highlights local seafood and slow evenings by the water — reserve a table for sunset.",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80",
    cta: "View Menu",
    href: "/restaurant",
  },
  {
    id: "stay",
    category: "Resort",
    title: "Quiet mornings, longer stays",
    excerpt:
      "Guests are lingering longer this season — poolside breakfasts, spa hours, and unhurried afternoons.",
    image:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=900&q=80",
    cta: "Stay Here",
    href: "#rooms",
  },
  {
    id: "weekday",
    category: "Stay Offer",
    title: "Weekday escape by the cove",
    excerpt:
      "Quiet midweek stays with breakfast — perfect for a slower Puerto Galera reset.",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
    cta: "Book Stay",
    href: "#book",
  },
  {
    id: "dive-package",
    category: "Scuba Package",
    title: "Dive & dine weekends",
    excerpt:
      "Guided reef dives paired with dinner at Jalyn’s Restaurant for a full day on the water.",
    image:
      "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=900&q=80",
    cta: "Explore Package",
    href: "/scuba-diving",
  },
  {
    id: "events",
    category: "Events",
    title: "Private dinners & celebrations",
    excerpt:
      "Intimate gatherings by the shore — birthdays, small reunions, and sunset tables.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
    cta: "Enquire",
    href: "/contact",
  },
] as const;

const PAGE_SIZE = 3;

function CtaLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function News() {
  const [page, setPage] = useState(0);
  const [parallaxY, setParallaxY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [bgUrl, setBgUrl] = useState(DEFAULT_HOME_SECTIONS.news);
  const touchStartX = useRef<number | null>(null);

  const pageCount = Math.ceil(posts.length / PAGE_SIZE);
  const visible = posts.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchHomeSectionBackground(SECTION).then((url) => {
      if (alive) setBgUrl(url);
    });

    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ section?: HomeSectionKey; url?: string }>).detail;
      if (detail?.section !== SECTION) return;
      if (detail.url) {
        setBgUrl(detail.url);
        return;
      }
      void fetchHomeSectionBackground(SECTION).then((url) => {
        if (alive) setBgUrl(url);
      });
    };

    window.addEventListener(HOME_SECTION_UPDATED_EVENT, onUpdated);
    return () => {
      alive = false;
      window.removeEventListener(HOME_SECTION_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = document.getElementById("news");
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Slightly stronger parallax on smaller screens so motion is noticeable
        const factor = window.innerWidth < 768 ? 0.28 : 0.22;
        const offset = Math.min(Math.max(-rect.top * factor, 0), 120);
        setParallaxY(offset);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduceMotion]);

  function prev() {
    setPage((p) => (p - 1 + pageCount) % pageCount);
  }

  function next() {
    setPage((p) => (p + 1) % pageCount);
  }

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) next();
    else prev();
  }

  return (
    <section id="news" className="relative bg-white">
      <div className="relative">
        {/* Background clipped separately so cards are never cut off */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: reduceMotion
                ? undefined
                : `translate3d(0, ${parallaxY}px, 0) scale(1.06)`,
            }}
          >
            <img
              src={homeHeroMediaUrl(bgUrl)}
              alt=""
              className={`news-cinematic-slide news-pan-left absolute inset-0 h-full w-full object-cover ${
                reduceMotion ? "" : "is-active burn-loop"
              }`}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/30 to-ink/55" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-white via-white/90 to-transparent" />
        </div>

        <div className="relative z-10 flex min-h-[100svh] flex-col px-5 pt-24 sm:px-6 sm:pt-28 md:px-8 lg:px-10 xl:px-12">
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center gap-3 py-8 sm:gap-5 md:gap-8 md:py-10">
            <button
              type="button"
              onClick={prev}
              className="news-glass-arrow btn-press relative z-20 shrink-0"
              aria-label="Previous stories"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p
                className="news-copy-in text-[0.65rem] font-semibold tracking-[0.28em] text-white/70 uppercase"
                style={{ animationDelay: "80ms" }}
              >
                News, Offers and Events
              </p>
              <h2
                className="news-copy-in mt-3 font-display text-[1.85rem] leading-tight text-white sm:text-4xl md:text-5xl lg:text-[3.35rem]"
                style={{ animationDelay: "180ms" }}
              >
                What&apos;s happening at the resort
              </h2>
              <p
                className="news-copy-in mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/78 sm:text-base"
                style={{ animationDelay: "300ms" }}
              >
                Latest updates, seasonal offers, and gatherings by the cove.
              </p>
            </div>

            <button
              type="button"
              onClick={next}
              className="news-glass-arrow btn-press relative z-20 shrink-0"
              aria-label="Next stories"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-auto mb-2 flex w-full max-w-[90rem] justify-start">
            <HomeSectionBgEditButton
              section={SECTION}
              title="News background"
              defaultUrl={DEFAULT_HOME_SECTIONS.news}
            />
          </div>

          <div
            id="offers"
            key={page}
            className="mx-auto mt-2 grid w-full max-w-[90rem] gap-5 pb-16 sm:mt-4 sm:gap-6 sm:pb-20 md:grid-cols-3 md:items-stretch md:gap-6 md:pb-24 lg:gap-8"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {visible.map((post, index) => {
              const isCenter = index === 1;
              return (
                <article
                  key={post.id}
                  className={`card-lift news-card-in group flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_22px_48px_rgba(12,18,16,0.16)] ${
                    isCenter
                      ? "news-card-mobile-lift md:-translate-y-4 md:scale-[1.02]"
                      : ""
                  }`}
                  style={{ animationDelay: `${220 + index * 140}ms` }}
                >
                  <div className="overflow-hidden">
                    <img
                      src={post.image}
                      alt=""
                      className={`w-full object-cover transition duration-700 group-hover:scale-[1.04] ${
                        isCenter
                          ? "aspect-[5/4] min-h-[11rem] sm:min-h-[13rem] lg:min-h-[15rem]"
                          : "aspect-[4/3] min-h-[10rem] sm:min-h-[12rem] lg:min-h-[14rem]"
                      }`}
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-5 pt-5 pb-6 sm:px-6 sm:pb-7">
                    <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-stone uppercase">
                      {post.category}
                    </p>
                    <h3
                      className={`mt-2 font-display leading-snug text-ink ${
                        isCenter
                          ? "text-[1.4rem] sm:text-[1.65rem] lg:text-[1.8rem]"
                          : "text-[1.25rem] sm:text-[1.45rem] lg:text-[1.6rem]"
                      }`}
                    >
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink/65">
                      {post.excerpt}
                    </p>
                    <CtaLink
                      href={post.href}
                      className="btn-press mt-5 inline-flex w-fit items-center justify-center rounded-full bg-sea px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink"
                    >
                      {post.cta}
                    </CtaLink>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
