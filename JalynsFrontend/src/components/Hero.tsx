import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdjustableFileInput } from "./AdjustableFileInput";
import { HeroMedia } from "./HeroMedia";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_HOME_SLIDES,
  fetchHomeHeroSlides,
  HOME_HERO_UPDATED_EVENT,
  homeHeroMediaUrl,
  notifyHomeHeroUpdated,
  peekHomeHeroSlides,
  resetAllHomeHeroSlides,
  resetHomeHeroSlide,
  uploadHomeHeroSlide,
  type HomeHeroSlide,
} from "../lib/homeHero";
import {
  DEFAULT_ROOMS_VOUCHER,
  fetchRoomsVoucher,
  ROOMS_UPDATED_EVENT,
  type RoomsVoucher,
} from "../lib/rooms";
import { useWheelScrollContain } from "../lib/useWheelScrollContain";
import { AdminEditButton } from "./AdminEditButton";
import { ConfirmDialog } from "./ConfirmDialog";
import { broadcastContentChanged } from "./ContentSync";
import { HERO_UPLOAD_HINT, isHeroVideoFile, isHeroVideoUrl } from "../lib/heroMedia";
import { MapPinIcon } from "./Icons";
import { Navbar } from "./Navbar";

const TICKER_TEXT = "Resort for Rent/Sale. Please contact us for details";
const TICKER_REPEAT = 8;

function NewsTickerHalf({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {Array.from({ length: TICKER_REPEAT }, (_, index) => (
        <Link
          key={index}
          to="/contact"
          tabIndex={hidden || index > 0 ? -1 : 0}
          className="px-6 text-[0.78rem] font-medium whitespace-nowrap text-[#0a335c] sm:px-8 sm:text-sm"
        >
          {TICKER_TEXT}
        </Link>
      ))}
    </div>
  );
}

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

  const [slides, setSlides] = useState<HomeHeroSlide[] | null>(() => peekHomeHeroSlides());
  const [motionReady, setMotionReady] = useState(false);
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const [playbackSlide, setPlaybackSlide] = useState(-1);
  const [parallaxY, setParallaxY] = useState(0);
  const [roomsVoucher, setRoomsVoucher] = useState<RoomsVoucher>({ ...DEFAULT_ROOMS_VOUCHER });

  const [bgOpen, setBgOpen] = useState(false);
  const [editorSlides, setEditorSlides] = useState<HomeHeroSlide[]>(() => peekHomeHeroSlides() ?? []);
  const [selected, setSelected] = useState(0);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  const [bgProgress, setBgProgress] = useState<string | null>(null);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useWheelScrollContain<HTMLDivElement>(bgOpen);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await fetchHomeHeroSlides();
      if (!alive) return;
      if (next?.length) setSlides(next);
      else setSlides((current) => current ?? DEFAULT_HOME_SLIDES.map((slide) => ({ ...slide })));
    })();

    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ slides?: HomeHeroSlide[] }>).detail;
      if (detail?.slides?.length) {
        setSlides(detail.slides);
        return;
      }
      void fetchHomeHeroSlides().then((next) => {
        if (alive && next?.length) setSlides(next);
      });
    };

    window.addEventListener(HOME_HERO_UPDATED_EVENT, onUpdated);
    return () => {
      alive = false;
      window.removeEventListener(HOME_HERO_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchRoomsVoucher().then((next) => {
      if (alive) setRoomsVoucher(next);
    });
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ voucher?: RoomsVoucher }>).detail;
      if (detail?.voucher) {
        setRoomsVoucher(detail.voucher);
        return;
      }
      void fetchRoomsVoucher().then((next) => {
        if (alive) setRoomsVoucher(next);
      });
    };
    window.addEventListener(ROOMS_UPDATED_EVENT, onUpdated);
    return () => {
      alive = false;
      window.removeEventListener(ROOMS_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    if (!slides?.length) return;
    const frame = requestAnimationFrame(() => setMotionReady(true));
    return () => cancelAnimationFrame(frame);
  }, [slides]);

  useEffect(() => {
    if (!slides?.length) return;
    const current = slides[active];
    const isVideo = current ? isHeroVideoUrl(homeHeroMediaUrl(current.image)) : false;
    const playing = playbackSlide === active;
    // Wait until a video is actually moving, then give it time to finish.
    // The longer timer is only a fallback if playback never starts.
    const delay = isVideo ? (playing ? 8000 : 12000) : SLIDE_MS;
    const timer = window.setTimeout(() => {
      setActive((index) => (index + 1) % slides.length);
      setTick((value) => value + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [slides, active, playbackSlide]);

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
      if (event.key === "Escape") closeBackgroundEditor();
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

  useEffect(() => {
    if (bgOpen || !slides?.length) return;
    setEditorSlides(slides.map((slide) => ({ ...slide })));
  }, [slides, bgOpen]);

  async function openBackgroundEditor() {
    setBgError(null);
    setSelected(active);
    const known = (slides?.length ? slides : peekHomeHeroSlides()) ?? [];
    if (known.length) setEditorSlides(known.map((slide) => ({ ...slide })));
    setBgOpen(true);
    try {
      const next = await fetchHomeHeroSlides();
      if (next?.length) setEditorSlides(next);
      else if (!known.length) setEditorSlides(DEFAULT_HOME_SLIDES.map((slide) => ({ ...slide })));
    } catch {
      if (!known.length) setEditorSlides(DEFAULT_HOME_SLIDES.map((slide) => ({ ...slide })));
    }
  }

  function closeBackgroundEditor() {
    uploadAbortRef.current?.abort();
    setPreviewVideoUrl(null);
    if (slides?.length) setEditorSlides(slides.map((slide) => ({ ...slide })));
    setBgProgress(null);
    setBgBusy(false);
    setBgOpen(false);
  }

  async function onUploadFile(file: File | null) {
    if (!file) return;
    uploadAbortRef.current?.abort();
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    const video = isHeroVideoFile(file);
    setBgBusy(true);
    setBgError(null);
    setRetryFile(file);
    const local = URL.createObjectURL(file);
    if (video) setPreviewVideoUrl(local);
    const previous = editorSlides.map((slide) => ({ ...slide }));
    const previousSlides = slides?.map((slide) => ({ ...slide })) ?? null;
    setEditorSlides((current) =>
      current.map((slide, index) =>
        index === selected ? { ...slide, image: local } : slide,
      ),
    );
    if (!video) {
      setSlides((current) =>
        (current ?? previous).map((slide, index) =>
          index === selected ? { ...slide, image: local } : slide,
        ),
      );
    }
    setBgProgress(video ? "Uploading video…" : "Optimizing image…");
    try {
      const data = await uploadHomeHeroSlide(selected, file, (percent) => {
        setBgProgress(percent >= 100 ? "Saving…" : `Uploading… ${percent}%`);
      }, controller.signal);
      if (controller.signal.aborted) {
        setEditorSlides(previous);
        if (!video && previousSlides) setSlides(previousSlides);
        setPreviewVideoUrl(null);
        return;
      }
      if (data.slides?.length) {
        setEditorSlides(data.slides);
        setSlides(data.slides);
        notifyHomeHeroUpdated(data.slides);
      } else {
        notifyHomeHeroUpdated();
      }
      setRetryFile(null);
      setPreviewVideoUrl(null);
      broadcastContentChanged();
    } catch (err) {
      if (controller.signal.aborted) {
        setEditorSlides(previous);
        if (!video && previousSlides) setSlides(previousSlides);
        setPreviewVideoUrl(null);
        return;
      }
      setEditorSlides(previous);
      if (!video && previousSlides) setSlides(previousSlides);
      setBgError(err instanceof Error ? err.message : "Could not upload background.");
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(local), 1500);
      if (uploadAbortRef.current === controller) {
        setBgProgress(null);
        setBgBusy(false);
      }
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onResetSlide() {
    setBgBusy(true);
    setBgError(null);
    try {
      const data = await resetHomeHeroSlide(selected);
      if (data.slides?.length) {
        setEditorSlides(data.slides);
        setSlides(data.slides);
        notifyHomeHeroUpdated(data.slides);
      } else {
        notifyHomeHeroUpdated();
      }
      broadcastContentChanged();
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Could not reset slide.");
    } finally {
      setBgBusy(false);
    }
  }

  async function onResetAll() {
    setConfirmResetAll(true);
  }

  async function runResetAll() {
    setConfirmResetAll(false);
    setBgBusy(true);
    setBgError(null);
    try {
      const data = await resetAllHomeHeroSlides();
      if (data.slides?.length) {
        setEditorSlides(data.slides);
        setSlides(data.slides);
        notifyHomeHeroUpdated(data.slides);
      } else {
        notifyHomeHeroUpdated();
      }
      broadcastContentChanged();
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Could not reset backgrounds.");
    } finally {
      setBgBusy(false);
    }
  }

  return (
    <section
      id="home"
      className="relative min-h-[100svh] overflow-hidden text-white"
    >
      <div
        className="absolute inset-0 bg-[#102028] will-change-transform"
        style={{ transform: `translate3d(0, ${parallaxY}px, 0) scale(1.08)` }}
      >
        {(slides ?? []).map((slide, index) => {
          const url = homeHeroMediaUrl(slide.image);
          const activeSlide = index === active;
          const video = isHeroVideoUrl(url) || url === previewVideoUrl;
          if (video && !activeSlide) return null;
          return (
            <HeroMedia
              key={`${slide.id}-${slide.image}`}
              src={url}
              alt={slide.alt}
              priority={index === 0}
              video={video}
              fallbackSrc={DEFAULT_HOME_SLIDES[index]?.image}
              soundControl={activeSlide}
              loop={!video}
              onEnded={
                video && activeSlide
                  ? () => {
                      setActive((current) => (current + 1) % (slides?.length || 1));
                      setTick((value) => value + 1);
                    }
                  : undefined
              }
              onPlaying={video && activeSlide ? () => setPlaybackSlide(index) : undefined}
              className={`hero-media ${motionReady ? "transition-opacity duration-700" : ""} ${
                activeSlide ? `opacity-100 ${motionReady ? "animate-ken-burns" : ""}` : "opacity-0"
              }`}
            />
          );
        })}
        <div className="hero-scrim" />
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

      <div
        className="relative z-10 flex min-h-[100svh] w-full flex-col justify-start px-5 pt-[4.75rem] pb-14 sm:px-6 sm:pt-28 sm:pb-14 md:px-8 lg:min-h-[100svh] lg:justify-end lg:px-10 lg:pb-14 xl:px-12"
      >
        <div className="hero-copy mt-16 max-w-5xl shrink-0 self-start text-left sm:mt-0">
          <p className="animate-fade-up text-[0.58rem] font-semibold tracking-[0.12em] text-white/80 uppercase sm:text-[0.7rem] sm:tracking-[0.16em]">
            Family Friendly, Modern Dive Resort &amp; Restaurant in Puerto Galera, Philippines
          </p>
          <h1
            className="animate-fade-up mt-2.5 max-w-3xl font-display text-[1.65rem] leading-[1.12] text-white sm:mt-4 sm:text-4xl md:text-5xl lg:text-[3.25rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Jalyn&apos;s Resort &amp; Restaurant, Puerto Galera
            <span className="mt-1 block text-[1.15rem] leading-snug sm:mt-2 sm:text-2xl md:text-3xl lg:text-[2.15rem]">
              Peaceful, Quiet and Family Friendly!
            </span>
          </h1>

          {roomsVoucher.enabled && roomsVoucher.percent > 0 ? (
            <div
              className="animate-fade-up mt-4 max-w-lg rounded-2xl border border-white/25 bg-white/12 px-4 py-3 backdrop-blur-md sm:mt-5 sm:px-5 sm:py-4"
              style={{ animationDelay: "0.22s" }}
            >
              <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-white/75 uppercase">
                Limited rooms offer
              </p>
              <p className="mt-1 font-display text-xl text-white sm:text-2xl">
                <span className="text-amber-200">{roomsVoucher.percent}% off</span> your stay
              </p>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-white/80 sm:text-sm">
                Automatic discount on room rates — no code needed. Browse rooms and apartments to
                plan your Puerto Galera escape.
              </p>
              <Link
                to="/rooms"
                className="btn-press mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/90"
              >
                View rooms
              </Link>
            </div>
          ) : null}
        </div>

        <div
          className="animate-fade-up mt-3 flex flex-col items-start gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
            {(slides ?? []).map((slide, index) => (
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
            <AdminEditButton onClick={() => void openBackgroundEditor()}>
              Edit background
            </AdminEditButton>
          </div>
        ) : null}
      </div>

      {bgOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Edit home background"
              onClick={() => closeBackgroundEditor()}
            >
              <div
                className="flex h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white text-ink shadow-xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  ref={scrollRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-3 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pt-6"
                >
                  <h2 className="font-display text-2xl">Home background</h2>
                  <p className="mt-1.5 text-sm text-stone">{HERO_UPLOAD_HINT}</p>

                  {editorSlides.length ? (
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
                            <HeroMedia
                              src={homeHeroMediaUrl(slide.image)}
                              alt=""
                              priority={false}
                              video={isHeroVideoUrl(slide.image) || slide.image === previewVideoUrl}
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <p className="px-2.5 py-2 text-xs font-semibold text-ink">
                              Slide {index + 1}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-stone">Loading saved backgrounds…</p>
                  )}

                  <AdjustableFileInput
                    ref={fileRef}
                    allowVideo
                    className="sr-only"
                    onFiles={(picked) => void onUploadFile(picked[0] ?? null)}
                  />

                  {bgProgress ? <p className="mt-4 text-sm text-stone">{bgProgress}</p> : null}
                  {bgError ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
                      <p>{bgError}</p>
                      {retryFile ? (
                        <button
                          type="button"
                          disabled={bgBusy}
                          onClick={() => void onUploadFile(retryFile)}
                          className="btn-press mt-2 rounded-full border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-800 disabled:opacity-60"
                        >
                          Retry upload
                        </button>
                      ) : null}
                    </div>
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
                      onClick={() => closeBackgroundEditor()}
                      className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink"
                    >
                      {bgBusy ? "Cancel" : "Done"}
                    </button>
                    <button
                      type="button"
                      disabled={bgBusy || !editorSlides.length}
                      onClick={() => fileRef.current?.click()}
                      className="btn-press rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky disabled:opacity-60"
                    >
                      {bgBusy ? bgProgress || "Uploading…" : "Upload image or video"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={confirmResetAll}
        title="Reset all backgrounds?"
        message="All home hero photos will be restored to the defaults. This cannot be undone."
        confirmLabel="Reset all"
        busy={bgBusy}
        onCancel={() => setConfirmResetAll(false)}
        onConfirm={() => void runResetAll()}
      />

      {bgOpen
        ? null
        : createPortal(
            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-white pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-stretch">
                <span className="flex shrink-0 items-center bg-[#0a335c] px-3 text-[0.58rem] font-semibold tracking-[0.18em] text-white uppercase sm:px-4">
                  News
                </span>
                <div className="min-w-0 flex-1 overflow-hidden py-1.5">
                  <div className="news-ticker-track flex w-max">
                    <NewsTickerHalf />
                    <NewsTickerHalf hidden />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}
    </section>
  );
}
