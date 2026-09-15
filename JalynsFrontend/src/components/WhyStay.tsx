import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_SECTIONS,
  fetchHomeSectionBackground,
  HOME_SECTION_UPDATED_EVENT,
  homeHeroMediaUrl,
  type HomeSectionKey,
} from "../lib/homeHero";
import { HomeSectionBgEditButton } from "./HomeSectionBgEditButton";
import {
  DiveFlagIcon,
  HeartHandIcon,
  LocationIcon,
  UtensilsIcon,
} from "./Icons";
import { Reveal } from "./Reveal";

const reasons = [
  {
    title: "Prime Location",
    text: "Steps from Mangrove Cove and Puerto Galera’s shores.",
    icon: LocationIcon,
  },
  {
    title: "World-Class Scuba Diving",
    text: "Guided dives across vibrant reefs and dive sites.",
    icon: DiveFlagIcon,
  },
  {
    title: "Delicious Cuisine",
    text: "Local and international dishes prepared fresh daily.",
    icon: UtensilsIcon,
  },
  {
    title: "Warm Service",
    text: "Friendly hosts who make every stay feel personal.",
    icon: HeartHandIcon,
  },
] as const;

const SECTION: HomeSectionKey = "whystay";

export function WhyStay() {
  const [parallaxY, setParallaxY] = useState(0);
  const [bgUrl, setBgUrl] = useState(DEFAULT_HOME_SECTIONS.whystay);

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const section = document.getElementById("about");
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const mid = rect.top + rect.height / 2 - window.innerHeight / 2;
        setParallaxY(Math.max(-60, Math.min(60, mid * -0.12)));
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section
      id="about"
      className="relative overflow-hidden px-5 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-10 xl:px-12"
    >
      <img
        src={homeHeroMediaUrl(bgUrl)}
        alt="Ocean coastline"
        className="absolute inset-0 h-full w-full scale-110 object-cover will-change-transform"
        style={{ transform: `translate3d(0, ${parallaxY}px, 0) scale(1.12)` }}
      />
      <div className="absolute inset-0 bg-ink/75" />
      <div className="live-orb top-[20%] right-[15%] h-44 w-44 bg-white/15" />
      <div className="live-orb live-orb-delayed bottom-[10%] left-[10%] h-56 w-56 bg-sea/30" />

      <div className="relative z-10 w-full text-white">
        <Reveal variant="up">
          <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-white/55 uppercase">
            Experience More
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl md:text-5xl">
            Why Stay at Jalyn&apos;s?
          </h2>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-4">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <Reveal key={reason.title} delay={100 + index * 90} variant="up">
                <div className="text-center sm:text-left">
                  <span
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:scale-110 hover:bg-white/10 sm:mx-0"
                    style={{ animation: `pulse-soft 2.8s ease-in-out ${index * 0.35}s infinite` }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-3 text-[0.8rem] font-semibold tracking-wide">{reason.title}</h3>
                  <p className="mt-1 text-[0.75rem] leading-relaxed text-white/65">{reason.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={500} variant="in" className="mt-10 sm:mt-12">
          <p className="font-script animate-float text-center text-3xl leading-tight text-white/90 sm:text-4xl md:text-5xl">
            More than a stay, it&apos;s an experience.
          </p>
        </Reveal>

        <div className="mt-8 flex justify-start sm:mt-10">
          <HomeSectionBgEditButton
            section={SECTION}
            title="Why Stay background"
            defaultUrl={DEFAULT_HOME_SECTIONS.whystay}
          />
        </div>
      </div>
    </section>
  );
}
