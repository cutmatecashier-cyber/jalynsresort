import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CONTENT_CHANGED_EVENT } from "./ContentSync";
import { HomeSectionBgEditButton } from "./HomeSectionBgEditButton";
import { ArrowRightIcon } from "./Icons";
import {
  DEFAULT_HOME_SECTIONS,
  fetchHomeSectionBackground,
  HOME_SECTION_UPDATED_EVENT,
  homeHeroMediaUrl,
  type HomeSectionKey,
} from "../lib/homeHero";

const SECTION: HomeSectionKey = "restaurant";

export function HomeRestaurant() {
  const [photo, setPhoto] = useState(DEFAULT_HOME_SECTIONS.restaurant);
  const [parallaxY, setParallaxY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchHomeSectionBackground(SECTION).then((url) => {
        if (!cancelled && url) setPhoto(url);
      });
    };
    load();
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ section?: HomeSectionKey; url?: string }>).detail;
      if (detail?.section && detail.section !== SECTION) return;
      if (detail?.url) {
        setPhoto(detail.url);
        return;
      }
      load();
    };
    window.addEventListener(HOME_SECTION_UPDATED_EVENT, onUpdated);
    window.addEventListener(CONTENT_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(HOME_SECTION_UPDATED_EVENT, onUpdated);
      window.removeEventListener(CONTENT_CHANGED_EVENT, load);
    };
  }, []);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = document.getElementById("home-restaurant");
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const factor = window.innerWidth < 768 ? 0.28 : 0.22;
        const offset = Math.min(Math.max(-rect.top * factor, -40), 120);
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

  return (
    <section id="home-restaurant" className="relative min-h-[100svh] overflow-hidden bg-ink">
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
            src={homeHeroMediaUrl(photo)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/30 to-ink/55" />
      </div>

      <div className="absolute top-4 left-5 z-20 sm:top-5 sm:left-6 md:left-8 lg:left-10 xl:left-12">
        <HomeSectionBgEditButton
          section={SECTION}
          title="Restaurant preview photo"
          description="Upload the full-width photo behind the restaurant section on the home page."
          defaultUrl={DEFAULT_HOME_SECTIONS.restaurant}
        />
      </div>

      <div className="relative z-10 flex min-h-[100svh] items-center px-5 py-24 sm:px-6 sm:py-28 md:px-8 lg:px-10 xl:px-12">
        <div className="mx-auto w-full max-w-3xl text-center text-white">
          <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-white/70 uppercase">
            Restaurant
          </p>
          <h2 className="mt-3 font-display text-[1.85rem] leading-tight sm:text-4xl md:text-5xl lg:text-[3.35rem]">
            Jalyn&apos;s Restaurant – Great food at great prices!
          </h2>
          <div className="mx-auto mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-white/80 sm:mt-5 sm:text-base">
            <p>
              Jalyn&apos;s Restaurant is consistently complimented on its food. But don&apos;t just
              take our word for it, check out some of our guest reviews and see for yourself.
            </p>
            <p>
              Our restaurant offers an excellent range of international dishes, including vegan and
              vegetarian items, at competitive prices, in our covered open-air restaurant with a
              breathtaking view and stunning sunsets over Mangrove Cove.
            </p>
          </div>
          <Link
            to="/restaurant"
            className="btn-press mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:gap-3 hover:bg-white/92"
          >
            Restaurant &amp; reviews
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
