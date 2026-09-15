import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_HOME_SLIDES,
  fetchHomeHeroSlides,
  HOME_HERO_UPDATED_EVENT,
  homeHeroMediaUrl,
  notifyHomeHeroUpdated,
  resetAllHomeHeroSlides,
  resetHomeHeroSlide,
  uploadHomeHeroSlide,
  type HomeHeroSlide,
} from "../lib/homeHero";
import { supabase } from "../lib/supabase";
import { BookingBar } from "./BookingBar";
import { MapPinIcon } from "./Icons";
import { Navbar } from "./Navbar";

const SLIDE_MS = 7000;

const bubbles = [
  {
    className:
      "glass-bubble top-[12%] right-[5%] h-[4.5rem] w-[4.5rem] opacity-[0.12] glass-bubble-delay-1",
  },
  {
    className:
      "glass-bubble glass-bubble-soft top-[20%] right-[16%] h-9 w-9 opacity-[0.14] glass-bubble-delay-3",
  },
  {
    className:
      "glass-bubble top-[36%] right-[4%] h-32 w-32 opacity-[0.13] glass-bubble-delay-2 hidden sm:block",
  },
  {
    className:
      "glass-bubble glass-bubble-soft top-[46%] right-[20%] h-12 w-12 opacity-[0.14] glass-bubble-delay-4 hidden md:block",
  },
  {
    className:
      "glass-bubble bottom-[32%] right-[5%] h-[5.5rem] w-[5.5rem] opacity-[0.14] glass-bubble-delay-1 hidden sm:block",
  },
  {
    className:
      "glass-bubble glass-bubble-soft top-[56%] left-[4%] h-14 w-14 opacity-[0.13] glass-bubble-delay-3 hidden md:block",
  },
  {
    className:
      "glass-bubble top-[72%] left-[8%] h-10 w-10 opacity-[0.12] glass-bubble-delay-2 hidden lg:block",
  },
  {
    className:
      "glass-bubble glass-bubble-soft top-[16%] left-[38%] h-8 w-8 opacity-[0.11] glass-bubble-delay-4 hidden xl:block",
  },
  {
    className:
      "glass-bubble bottom-[16%] right-[26%] h-16 w-16 opacity-[0.13] glass-bubble-delay-3 hidden md:block",
  },
  {
    className:
      "glass-bubble glass-bubble-soft top-[8%] left-[8%] h-11 w-11 opacity-[0.12] glass-bubble-delay-2 hidden lg:block",
  },
] as const;

export function Hero() {
  const { role, approvalStatus, can } = useAuth();
  const canEditBg = can.canEditHomeBackground(role, approvalStatus);

  const [slides, setSlides] = useState<HomeHeroSlide[]>(DEFAULT_HOME_SLIDES);
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const [parallaxY, setParallaxY] = useState(0);

  const [bgOpen, setBgOpen] = useState(false);
  const [editorSlides, setEditorSlides] = useState<HomeHeroSlide[]>(DEFAULT_HOME_SLIDES);
  const [selected, setSelected] = useState(0);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await fetchHomeHeroSlides();
      if (alive) setSlides(next);
    })();

    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ slides?: HomeHeroSlide[] }>).detail;
      if (detail?.slides?.length) {
        setSlides(detail.slides);
        return;
      }
      void fetchHomeHeroSlides().then((next) => {
        if (alive) setSlides(next);
      });
    };

    window.addEventListener(HOME_HERO_UPDATED_EVENT, onUpdated);
    return () => {
      alive = false;
      window.removeEventListener(HOME_HERO_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
      setTick((value) => value + 1);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setParallaxY(Math.min(window.scrollY * 0.28, 140));
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!bgOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !bgBusy) setBgOpen(false);
    };
    document.body.style.overflow = "hidden";
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    lenis?.stop();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [bgOpen, bgBusy]);

  async function openBackgroundEditor() {
    setBgError(null);
    setSelected(active);
    setBgOpen(true);
    try {
      const next = await fetchHomeHeroSlides();
      setEditorSlides(next);
    } catch {
      setEditorSlides(DEFAULT_HOME_SLIDES.map((s) => ({ ...s })));
    }
  }

  async function authToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Admin session expired. Please log in again.");
    return token;
  }

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setBgBusy(true);
    setBgError(null);
    try {
      const token = await authToken();
      const data = await uploadHomeHeroSlide(selected, file, token);
      if (data.slides?.length) {
        setEditorSlides(data.slides);
        setSlides(data.slides);
        notifyHomeHeroUpdated(data.slides);
      } else {
        notifyHomeHeroUpdated();
      }
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Could not upload background.");
    } finally {
      setBgBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onResetSlide() {
    setBgBusy(true);
    setBgError(null);
    try {
      const token = await authToken();
      const data = await resetHomeHeroSlide(selected, token);
      if (data.slides?.length) {
        setEditorSlides(data.slides);
        setSlides(data.slides);
        notifyHomeHeroUpdated(data.slides);
      } else {
        notifyHomeHeroUpdated();
      }
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Could not reset slide.");
    } finally {
      setBgBusy(false);
    }
  }

  async function onResetAll() {
    if (!window.confirm("Reset all home backgrounds to the default photos?")) return;
    setBgBusy(true);
    setBgError(null);
    try {
      const token = await authToken();
      const data = await resetAllHomeHeroSlides(token);
      if (data.slides?.length) {
        setEditorSlides(data.slides);
        setSlides(data.slides);
        notifyHomeHeroUpdated(data.slides);
      } else {
        notifyHomeHeroUpdated();
      }
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Could not reset backgrounds.");
    } finally {
      setBgBusy(false);
    }
  }

  return (
    <section id="home" className="relative min-h-[100svh] overflow-hidden text-white">
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${parallaxY}px, 0) scale(1.08)` }}
      >
        {slides.map((slide, index) => (
          <img
            key={`${slide.id}-${slide.image}`}
            src={homeHeroMediaUrl(slide.image)}
            alt={slide.alt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              index === active ? "opacity-100 animate-ken-burns" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/28 to-black/50" />
        <div className="live-orb top-[16%] left-[10%] hidden h-48 w-48 bg-white/30 sm:block" />
        <div className="live-orb live-orb-delayed right-[6%] bottom-[20%] hidden h-60 w-60 bg-sea/35 sm:block" />
        <div
          className="live-orb top-[55%] left-[45%] hidden h-36 w-36 bg-white/15 lg:block"
          style={{ animationDelay: "-14s" }}
        />
        {bubbles.map((bubble, index) => (
          <span key={index} className={bubble.className} aria-hidden="true" />
        ))}
      </div>

      <Navbar />

      <div className="relative z-10 flex min-h-[100svh] w-full flex-col justify-start px-5 pt-[4.75rem] pb-5 sm:px-6 sm:pt-28 sm:pb-10 md:px-8 md:pb-14 lg:justify-end lg:px-10 xl:px-12">
        <div className="order-1 mt-16 max-w-2xl shrink-0 self-start text-left sm:mt-0">
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

        <div
          className="animate-fade-up order-3 mt-auto w-full -translate-y-24 pb-1 sm:order-2 sm:mt-8 sm:translate-y-0 sm:max-w-xl sm:pb-0 md:mt-10 md:max-w-3xl"
          style={{ animationDelay: "0.1s" }}
        >
          <BookingBar />
        </div>

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
                className={`btn-press relative h-1.5 overflow-hidden rounded-full ${
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

        {canEditBg ? (
          <div className="order-5 mt-4 flex justify-start sm:mt-6">
            <button
              type="button"
              onClick={() => void openBackgroundEditor()}
              className="btn-press inline-flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white backdrop-blur-md transition hover:bg-white/16"
            >
              Edit background
            </button>
          </div>
        ) : null}

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

      {bgOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Edit home background"
              onClick={() => !bgBusy && setBgOpen(false)}
            >
              <div
                className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white text-ink shadow-xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
                  <h2 className="font-display text-2xl">Home background</h2>
                  <p className="mt-1.5 text-sm text-stone">
                    Choose a slide, then upload a new photo. Guests will see it on the home hero.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {editorSlides.map((slide, index) => {
                      const isActive = index === selected;
                      return (
                        <button
                          key={slide.id}
                          type="button"
                          onClick={() => setSelected(index)}
                          className={`overflow-hidden rounded-xl border text-left transition ${
                            isActive
                              ? "border-sky-deep ring-2 ring-sky-deep/30"
                              : "border-ink/10 hover:border-ink/25"
                          }`}
                        >
                          <img
                            src={homeHeroMediaUrl(slide.image)}
                            alt=""
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <p className="px-2.5 py-2 text-xs font-semibold text-ink">
                            Slide {index + 1}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => void onUploadFile(e.target.files?.[0] ?? null)}
                  />

                  {bgError ? (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                      {bgError}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-2 border-t border-ink/8 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:flex-wrap sm:justify-between sm:px-6">
                  <button
                    type="button"
                    disabled={bgBusy}
                    onClick={() => void onResetAll()}
                    className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                  >
                    Reset all
                  </button>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      type="button"
                      disabled={bgBusy}
                      onClick={() => void onResetSlide()}
                      className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                    >
                      Reset slide
                    </button>
                    <button
                      type="button"
                      disabled={bgBusy}
                      onClick={() => setBgOpen(false)}
                      className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      disabled={bgBusy}
                      onClick={() => fileRef.current?.click()}
                      className="btn-press rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky disabled:opacity-60"
                    >
                      {bgBusy ? "Uploading…" : "Upload photo"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
