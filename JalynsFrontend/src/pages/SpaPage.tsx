import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdminEditButton } from "../components/AdminEditButton";
import { Footer } from "../components/Footer";
import { GalleryPager } from "../components/GalleryPager";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { ScubaGalleryStage } from "../components/ScubaGalleryStage";
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

const softCardClass =
  "overflow-hidden rounded-2xl border border-white/35 bg-white/50 p-4 shadow-[0_16px_40px_rgba(8,18,28,0.12)] backdrop-blur-xl sm:rounded-3xl sm:bg-white/45 sm:p-7";

function isFallbackGallery(images: SpaGalleryImage[]) {
  return images.length > 0 && images.every((image) => image.path.startsWith("fallback-"));
}

export function SpaPage() {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditSpa(role, approvalStatus);

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
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [replacePath, setReplacePath] = useState<string | null>(null);

  const heroInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const displayHero = heroUrl ?? (imagesReady ? DEFAULT_SPA_HERO : null);
  const displayContent = contentUrl ?? (imagesReady ? DEFAULT_SPA_CONTENT : null);
  const displayGallery = gallery.length ? gallery : DEFAULT_SPA_GALLERY;
  const safeGalleryIndex = Math.min(galleryIndex, Math.max(0, displayGallery.length - 1));

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
    setGalleryIndex((current) => Math.min(current, Math.max(0, displayGallery.length - 1)));
  }, [displayGallery.length]);

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

                <ScubaGalleryStage
                  images={displayGallery}
                  active={safeGalleryIndex}
                  onActive={setGalleryIndex}
                  onOpen={setLightbox}
                  canManage={canEdit}
                  busy={busy}
                  contained
                  onReplace={(path) => {
                    setReplacePath(path);
                    replaceInput.current?.click();
                  }}
                  onDelete={(path) => void onDeleteGallery(path)}
                />

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
          {displayGallery.length > 1 ? (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2" onClick={(event) => event.stopPropagation()}>
              <GalleryPager
                count={displayGallery.length}
                active={lightbox}
                tone="light"
                onSelect={setLightbox}
              />
            </div>
          ) : null}
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
