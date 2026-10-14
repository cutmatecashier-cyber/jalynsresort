import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CONTENT_CHANGED_EVENT } from "./ContentSync";
import { HomeSectionBgEditButton } from "./HomeSectionBgEditButton";
import { ArrowRightIcon } from "./Icons";
import { preloadMedia } from "../lib/preloadMedia";
import { FullBleedSkeleton, ReadyImage } from "./Skeleton";
import {
  DEFAULT_HOME_SECTIONS,
  fetchHomeSectionBackground,
  HOME_SECTION_UPDATED_EVENT,
  homeHeroMediaUrl,
  type HomeSectionKey,
} from "../lib/homeHero";

const SECTION: HomeSectionKey = "spa";

export function HomeSpa() {
  const [photo, setPhoto] = useState(DEFAULT_HOME_SECTIONS.spa);
  const [photoReady, setPhotoReady] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchHomeSectionBackground(SECTION).then(async (url) => {
        const next = url || DEFAULT_HOME_SECTIONS.spa;
        await preloadMedia(homeHeroMediaUrl(next));
        if (!cancelled) {
          setPhoto(next);
          setPhotoReady(true);
        }
      });
    };
    load();
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ section?: HomeSectionKey; url?: string }>).detail;
      if (detail?.section && detail.section !== SECTION) return;
      if (detail?.url) {
        void preloadMedia(homeHeroMediaUrl(detail.url)).then(() => {
          if (!cancelled) {
            setPhoto(detail.url!);
            setPhotoReady(true);
          }
        });
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
        const el = document.getElementById("home-spa");
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

  if (!photoReady) return <FullBleedSkeleton id="home-spa" />;

  return (
    <section id="home-spa" className="relative min-h-[100svh] overflow-hidden bg-ink">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: reduceMotion
              ? "scale(1.12)"
              : `translate3d(0, ${parallaxY}px, 0) scale(1.12)`,
          }}
        >
          <ReadyImage
            src={homeHeroMediaUrl(photo)}
            alt=""
            dark
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/30 to-ink/55" />
      </div>

      <div className="absolute top-4 left-5 z-20 sm:top-5 sm:left-6 md:left-8 lg:left-10 xl:left-12">
        <HomeSectionBgEditButton
          section={SECTION}
          title="Spa preview photo"
          description="Upload the full-width photo behind the spa section on the home page."
          defaultUrl={DEFAULT_HOME_SECTIONS.spa}
        />
      </div>

      <div className="relative z-10 flex min-h-[100svh] items-center px-5 py-24 sm:px-6 sm:py-28 md:px-8 lg:px-10 xl:px-12">
        <div className="mx-auto w-full max-w-3xl text-center text-white">
          <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-white/70 uppercase">
            Jalyn&apos;s SPA
          </p>
          <h2 className="mt-3 font-display text-[1.85rem] leading-tight sm:text-4xl md:text-5xl lg:text-[3.35rem]">
            Spa Treatments
          </h2>
          <div className="mx-auto mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-white/80 sm:mt-5 sm:text-base">
            <p>
              Relax, refresh, and invigorate — massage and beauty treatments arranged through our
              partner Spa Center.
            </p>
            <p>
              Message us or ask reception — we&apos;ll help you choose a treatment around diving,
              dinner, or a slow morning by the water.
            </p>
          </div>
          <Link
            to="/spa"
            className="btn-press mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:gap-3 hover:bg-white/92"
          >
            Spa treatments
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
