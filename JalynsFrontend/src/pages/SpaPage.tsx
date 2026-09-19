import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { Link } from "react-router-dom";
import { AdminEditButton } from "../components/AdminEditButton";
import { Footer } from "../components/Footer";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/Icons";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { SpaTreatmentsSection } from "../components/SpaTreatmentsSection";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_SPA_CONTENT,
  DEFAULT_SPA_GALLERY,
  DEFAULT_SPA_HERO,
  deleteSpaGalleryImage,
  fetchSpaContentBackground,
  fetchSpaGallery,
  fetchSpaHero,
  removeSpaContentBackground,
  removeSpaHero,
  replaceSpaGalleryImage,
  subscribeSpaBackgrounds,
  uploadSpaContentBackgroundWithResult,
  uploadSpaGalleryImages,
  uploadSpaHeroWithResult,
  type SpaGalleryImage,
} from "../lib/spa";

type BgKind = "hero" | "content";

const GALLERY_TRANSITION_MS = 420;
const GALLERY_SCALE = 0.92;

const softCardClass =
  "rounded-2xl border border-white/35 bg-white/50 p-4 shadow-[0_16px_40px_rgba(8,18,28,0.12)] backdrop-blur-xl sm:rounded-3xl sm:bg-white/45 sm:p-7";

function isFallbackGallery(images: SpaGalleryImage[]) {
  return images.length > 0 && images.every((image) => image.path.startsWith("fallback-"));
}

function useGalleryPerView() {
  const [perView, setPerView] = useState(4);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width < 768) setPerView(1);
      else if (width < 1024) setPerView(2);
      else setPerView(4);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return perView;
}

export function SpaPage() {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditSpa(role, approvalStatus);
  const perView = useGalleryPerView();

  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [hasCustomHero, setHasCustomHero] = useState(false);
  const [hasCustomContent, setHasCustomContent] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [bgEditor, setBgEditor] = useState<BgKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [gallery, setGallery] = useState<SpaGalleryImage[]>([]);
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryFrom, setGalleryFrom] = useState<number | null>(null);
  const [galleryTo, setGalleryTo] = useState<number | null>(null);
  const [galleryZoomRun, setGalleryZoomRun] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [replacePath, setReplacePath] = useState<string | null>(null);

  const heroInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const galleryTouch = useRef<{ x: number; y: number } | null>(null);
  const galleryUnlockTimer = useRef<number | null>(null);
  const galleryRaf = useRef<number | null>(null);

  const displayHero = heroUrl ?? (imagesReady ? DEFAULT_SPA_HERO : null);
  const displayContent = contentUrl ?? (imagesReady ? DEFAULT_SPA_CONTENT : null);
  const displayGallery = gallery.length ? gallery : DEFAULT_SPA_GALLERY;

  const galleryPages = useMemo(() => {
    const pages: SpaGalleryImage[][] = [];
    for (let i = 0; i < displayGallery.length; i += perView) {
      pages.push(displayGallery.slice(i, i + perView));
    }
    return pages.length ? pages : [[]];
  }, [displayGallery, perView]);

  const pageCount = Math.max(1, galleryPages.length);
  const safeGalleryPage = Math.min(galleryPage, pageCount - 1);
  const counterPage = galleryTo != null ? galleryTo : safeGalleryPage;
  const counterStart = counterPage * perView + 1;
  const counterEnd = Math.min(displayGallery.length, (counterPage + 1) * perView);
  const canGalleryPrev = (galleryTo ?? safeGalleryPage) > 0;
  const canGalleryNext = (galleryTo ?? safeGalleryPage) < pageCount - 1;
  const galleryTransitioning = galleryFrom != null && galleryTo != null;

  const counterLabel =
    perView === 1
      ? `${counterStart}/${displayGallery.length}`
      : `${counterStart}–${counterEnd} / ${displayGallery.length}`;

  const loadImages = useCallback(async () => {
    const [hero, content, galleryImages] = await Promise.all([
      fetchSpaHero(),
      fetchSpaContentBackground(),
      fetchSpaGallery(),
    ]);
    setHeroUrl(hero.url);
    setContentUrl(content.url);
    setHasCustomHero(Boolean(hero.path));
    setHasCustomContent(Boolean(content.path));
    setGallery(galleryImages);
    setImagesReady(true);
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  useEffect(() => subscribeSpaBackgrounds(() => void loadImages()), [loadImages]);

  useEffect(() => {
    document.title = "Spa | Jalyn's Resort & Restaurant";
    return () => {
      document.title = "Jalyn's Resort & Restaurant | Puerto Galera";
    };
  }, []);

  useEffect(() => {
    setGalleryPage(0);
    setGalleryFrom(null);
    setGalleryTo(null);
    setGalleryZoomRun(false);
    setGalleryBusy(false);
  }, [perView, gallery.length]);

  useEffect(() => {
    return () => {
      if (galleryUnlockTimer.current != null) window.clearTimeout(galleryUnlockTimer.current);
      if (galleryRaf.current != null) window.cancelAnimationFrame(galleryRaf.current);
    };
  }, []);

  function goGalleryPage(next: number) {
    if (galleryBusy) return;
    const clamped = Math.max(0, Math.min(pageCount - 1, next));
    const current = galleryTo ?? safeGalleryPage;
    if (clamped === current) return;

    setGalleryBusy(true);
    setGalleryFrom(current);
    setGalleryTo(clamped);
    setGalleryZoomRun(false);

    if (galleryRaf.current != null) window.cancelAnimationFrame(galleryRaf.current);
    galleryRaf.current = window.requestAnimationFrame(() => {
      galleryRaf.current = window.requestAnimationFrame(() => {
        setGalleryZoomRun(true);
        galleryRaf.current = null;
      });
    });

    if (galleryUnlockTimer.current != null) window.clearTimeout(galleryUnlockTimer.current);
    galleryUnlockTimer.current = window.setTimeout(() => {
      setGalleryPage(clamped);
      setGalleryFrom(null);
      setGalleryTo(null);
      setGalleryZoomRun(false);
      setGalleryBusy(false);
      galleryUnlockTimer.current = null;
    }, GALLERY_TRANSITION_MS);
  }

  function galleryPrev() {
    goGalleryPage((galleryTo ?? safeGalleryPage) - 1);
  }

  function galleryNext() {
    goGalleryPage((galleryTo ?? safeGalleryPage) + 1);
  }

  function onGalleryTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    galleryTouch.current = { x: touch.clientX, y: touch.clientY };
  }

  function onGalleryTouchEnd(event: TouchEvent) {
    const start = galleryTouch.current;
    galleryTouch.current = null;
    if (!start || galleryBusy) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 48) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.25) return;
    if (dx < 0) galleryNext();
    else galleryPrev();
  }

  function renderGalleryPage(pageIndex: number, interactive: boolean) {
    const page = galleryPages[pageIndex] ?? [];
    const slots = Array.from({ length: perView }, (_, offset) => page[offset] ?? null);
    return (
      <div
        className={`grid h-full w-full gap-3 md:gap-4 ${
          perView === 1 ? "grid-cols-1" : perView === 2 ? "grid-cols-2" : "grid-cols-4"
        }`}
      >
        {slots.map((image, offset) => {
          if (!image) {
            return (
              <div
                key={`empty-${pageIndex}-${offset}`}
                className="aspect-[4/3] max-h-[min(20rem,52vh)] w-full sm:max-h-none"
                aria-hidden
              />
            );
          }
          const absoluteIndex = pageIndex * perView + offset;
          return (
            <div
              key={image.path}
              className="group relative overflow-hidden rounded-2xl bg-[#0b1d33]/10"
            >
              <button
                type="button"
                onClick={() => {
                  if (!interactive || galleryBusy) return;
                  setLightbox(absoluteIndex);
                }}
                className="block w-full"
                tabIndex={interactive ? 0 : -1}
              >
                <img
                  src={image.url}
                  alt={image.alt}
                  loading={Math.abs(pageIndex - safeGalleryPage) <= 1 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="aspect-[4/3] max-h-[min(20rem,52vh)] w-full object-cover sm:max-h-none"
                />
              </button>
              {interactive && canEdit && !image.path.startsWith("fallback-") ? (
                <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setReplacePath(image.path);
                      replaceInput.current?.click();
                    }}
                    className="btn-press rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDeleteGallery(image.path)}
                    className="btn-press rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  async function onHeroFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setAdminError(null);
    setUploadProgress("Optimizing & uploading hero…");
    const result = await uploadSpaHeroWithResult(file);
    if (result.error) setAdminError(result.error);
    else if (result.url) {
      setHeroUrl(result.url);
      setHasCustomHero(true);
      setBgEditor(null);
    }
    setUploadProgress(null);
    setBusy(false);
    if (heroInput.current) heroInput.current.value = "";
  }

  async function onContentFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setAdminError(null);
    setUploadProgress("Optimizing & uploading content background…");
    const result = await uploadSpaContentBackgroundWithResult(file);
    if (result.error) setAdminError(result.error);
    else if (result.url) {
      setContentUrl(result.url);
      setHasCustomContent(true);
      setBgEditor(null);
    }
    setUploadProgress(null);
    setBusy(false);
    if (contentInput.current) contentInput.current.value = "";
  }

  async function onRemoveHero() {
    setBusy(true);
    setAdminError(null);
    const message = await removeSpaHero();
    if (message) setAdminError(message);
    else {
      setHeroUrl(null);
      setHasCustomHero(false);
      setBgEditor(null);
    }
    setBusy(false);
  }

  async function onRemoveContent() {
    setBusy(true);
    setAdminError(null);
    const message = await removeSpaContentBackground();
    if (message) setAdminError(message);
    else {
      setContentUrl(null);
      setHasCustomContent(false);
      setBgEditor(null);
    }
    setBusy(false);
  }

  async function onGalleryFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setAdminError(null);
    setUploadProgress(`Preparing ${fileList.length} image(s)…`);
    const message = await uploadSpaGalleryImages(Array.from(fileList), (done, total) => {
      setUploadProgress(`Uploading ${done}/${total}…`);
    });
    if (message) setAdminError(message);
    else await loadImages();
    setUploadProgress(null);
    setBusy(false);
    if (galleryInput.current) galleryInput.current.value = "";
  }

  async function onReplaceGallery(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !replacePath) return;
    setBusy(true);
    setAdminError(null);
    setUploadProgress("Replacing image…");
    const message = await replaceSpaGalleryImage(replacePath, file);
    if (message) setAdminError(message);
    else await loadImages();
    setReplacePath(null);
    setUploadProgress(null);
    setBusy(false);
    if (replaceInput.current) replaceInput.current.value = "";
  }

  async function onDeleteGallery(path: string) {
    setBusy(true);
    setAdminError(null);
    const message = await deleteSpaGalleryImage(path);
    if (message) setAdminError(message);
    else await loadImages();
    setBusy(false);
  }

  return (
    <main className="overflow-x-clip bg-[#05080f] text-ink">
      <section className="relative min-h-[100svh] overflow-hidden text-white">
        <div className="absolute inset-0 bg-[#07101c]">
          {displayHero ? (
            <img
              src={displayHero}
              alt="Spa wellness at Jalyn's Resort"
              className="absolute inset-0 h-full w-full object-cover object-center animate-ken-burns"
              fetchPriority="high"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#07101c]/50 to-[#05080f]/80" />
          {canEdit ? (
            <button
              type="button"
              onClick={() => setBgEditor("hero")}
              className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent"
              aria-label="Change hero background image"
            />
          ) : null}
        </div>

        <Navbar />

        <div
          className={`relative z-10 flex min-h-[100svh] flex-col justify-end px-4 pb-12 pt-[7rem] sm:px-6 sm:pb-20 sm:pt-36 md:px-8 lg:px-10 xl:px-12 ${
            canEdit ? "pointer-events-none" : ""
          }`}
        >
          <p className="animate-fade-up text-[0.62rem] font-semibold tracking-[0.22em] text-white/75 uppercase sm:text-[0.72rem] sm:tracking-[0.28em]">
            Jalyn&apos;s SPA
          </p>
          <h1
            className="animate-fade-up mt-2.5 max-w-4xl font-display text-[2rem] leading-[1.08] text-white sm:mt-3 sm:text-5xl md:text-6xl lg:text-[4.35rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Spa Treatments
          </h1>
          <p
            className="animate-fade-up mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-white/85 sm:mt-4 sm:text-lg md:text-xl"
            style={{ animationDelay: "0.16s" }}
          >
            Relax, refresh, and invigorate — massage and beauty treatments arranged through our
            partner Spa Center.
          </p>
          {canEdit ? (
            <div className="pointer-events-auto mt-7 flex flex-wrap gap-2">
              <AdminEditButton className="animate-fade-up" onClick={() => setBgEditor("hero")}>
                Change hero background
              </AdminEditButton>
              <AdminEditButton className="animate-fade-up" onClick={() => setBgEditor("content")}>
                Change content background
              </AdminEditButton>
            </div>
          ) : null}
        </div>
      </section>

      <div className="relative isolate">
        <div
          aria-hidden
          className="pointer-events-none sticky top-0 -z-10 h-[100svh] w-full overflow-hidden bg-[#0b1d33]"
        >
          {displayContent ? (
            <img
              src={displayContent}
              alt=""
              className="h-full w-full object-cover object-center"
              loading="eager"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0 bg-[#07101c]/62" />
        </div>

        <div className="relative z-0 -mt-[100svh]">
          {canEdit && (adminError || uploadProgress) ? (
            <div className="px-4 pt-5 sm:px-6 sm:pt-6 md:px-8 lg:px-10 xl:px-12">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {uploadProgress ? <p>{uploadProgress}</p> : null}
                {adminError ? (
                  <p className={uploadProgress ? "mt-2" : undefined}>{adminError}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="relative z-10 px-4 pt-8 pb-12 sm:px-6 sm:pt-10 sm:pb-16 md:px-8 lg:px-10 lg:pb-20 xl:px-12">
            <SpaTreatmentsSection canEdit={canEdit} />

            <section className="mt-7 sm:mt-9">
              <div className={softCardClass}>
                <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-[#0b1d33]/80 uppercase">
                      Atmosphere
                    </p>
                    <h2 className="mt-2 font-display text-[1.65rem] text-[#0b1d33] sm:mt-3 sm:text-4xl md:text-5xl">
                      Soft light. Quiet hands.
                    </h2>
                  </div>
                  {canEdit ? (
                    <div>
                      <input
                        ref={galleryInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(event) => void onGalleryFiles(event.target.files)}
                      />
                      <AdminEditButton
                        surface="light"
                        disabled={busy}
                        onClick={() => galleryInput.current?.click()}
                      >
                        {uploadProgress?.startsWith("Uploading")
                          ? uploadProgress
                          : "Upload images"}
                      </AdminEditButton>
                    </div>
                  ) : null}
                </Reveal>

                {canEdit && isFallbackGallery(displayGallery) ? (
                  <p className="mb-4 text-sm text-[#0b1d33]/75 sm:mb-5">
                    Showing default photos until you upload gallery images.
                  </p>
                ) : null}

                <div
                  className="relative touch-pan-y"
                  onTouchStart={onGalleryTouchStart}
                  onTouchEnd={onGalleryTouchEnd}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-[#0b1d33]/5">
                    <div className="pointer-events-none invisible" aria-hidden>
                      {renderGalleryPage(safeGalleryPage, false)}
                    </div>

                    <div
                      className="absolute inset-0 origin-center will-change-transform"
                      style={{
                        transform: `scale(${
                          galleryTransitioning && galleryZoomRun ? GALLERY_SCALE : 1
                        })`,
                        opacity: galleryTransitioning && galleryZoomRun ? 0 : 1,
                        transitionProperty: galleryTransitioning ? "transform, opacity" : "none",
                        transitionDuration: `${GALLERY_TRANSITION_MS}ms`,
                        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                        zIndex: 1,
                        pointerEvents: galleryTransitioning ? "none" : "auto",
                      }}
                    >
                      {renderGalleryPage(
                        galleryTransitioning ? (galleryFrom as number) : safeGalleryPage,
                        !galleryTransitioning,
                      )}
                    </div>

                    {galleryTransitioning ? (
                      <div
                        className="absolute inset-0 origin-center will-change-transform"
                        style={{
                          transform: `scale(${galleryZoomRun ? 1 : GALLERY_SCALE})`,
                          opacity: galleryZoomRun ? 1 : 0,
                          transitionProperty: "transform, opacity",
                          transitionDuration: `${GALLERY_TRANSITION_MS}ms`,
                          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                          zIndex: 2,
                          pointerEvents: "none",
                        }}
                      >
                        {renderGalleryPage(galleryTo as number, false)}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 sm:mt-6">
                    <button
                      type="button"
                      onClick={galleryPrev}
                      disabled={!canGalleryPrev || galleryBusy}
                      aria-label="Previous gallery images"
                      className="btn-press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#0b1d33]/15 bg-white text-[#0b1d33] transition hover:bg-[#0b1d33] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <p className="min-w-[4.5rem] text-center text-sm font-semibold tracking-wide text-[#0b1d33] tabular-nums">
                      {counterLabel}
                    </p>
                    <button
                      type="button"
                      onClick={galleryNext}
                      disabled={!canGalleryNext || galleryBusy}
                      aria-label="Next gallery images"
                      className="btn-press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#0b1d33]/15 bg-white text-[#0b1d33] transition hover:bg-[#0b1d33] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <input
                  ref={replaceInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => void onReplaceGallery(event.target.files)}
                />
              </div>
            </section>

            <Reveal delay={100} variant="up">
              <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/25 bg-white/10 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)] backdrop-blur-md sm:mt-10 sm:p-8 lg:p-10">
                <h2 className="font-display text-2xl text-white sm:text-3xl">Book a session</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                  Message us or ask reception — we&apos;ll help you choose a treatment around diving,
                  dinner, or a slow morning by the water.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/contact"
                    className="btn-press inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/92"
                  >
                    Contact us
                  </Link>
                </div>
              </section>
            </Reveal>
          </div>

          <Footer />
        </div>
      </div>

      {lightbox != null && displayGallery[lightbox] ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image"
        >
          <img
            src={displayGallery[lightbox].url}
            alt={displayGallery[lightbox].alt}
            className="max-h-[86vh] max-w-full rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      ) : null}

      {bgEditor ? (
        <Modal
          title={bgEditor === "hero" ? "Hero background image" : "Content background image"}
          onClose={() => setBgEditor(null)}
        >
          <img
            src={
              bgEditor === "hero"
                ? (displayHero ?? DEFAULT_SPA_HERO)
                : (displayContent ?? DEFAULT_SPA_CONTENT)
            }
            alt="Current background"
            className="aspect-[16/7] w-full rounded-xl object-cover"
          />
          <p className="mt-3 text-sm text-stone">
            Upload a new image to replace this background. Removing it restores the default photo.
            Hero and content backgrounds are saved separately.
          </p>
          <input
            ref={bgEditor === "hero" ? heroInput : contentInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) =>
              void (bgEditor === "hero"
                ? onHeroFile(event.target.files)
                : onContentFile(event.target.files))
            }
          />
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setBgEditor(null)}
              className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            {(bgEditor === "hero" ? hasCustomHero : hasCustomContent) ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void (bgEditor === "hero" ? onRemoveHero() : onRemoveContent())}
                className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                Remove image
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                (bgEditor === "hero" ? heroInput : contentInput).current?.click()
              }
              className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60"
            >
              {busy
                ? "Uploading…"
                : (bgEditor === "hero" ? hasCustomHero : hasCustomContent)
                  ? "Replace image"
                  : "Upload image"}
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-stone">
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
