import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import {
  deleteRoomHighlightById,
  roomsMediaUrl,
  uploadRoomHighlights,
  type RoomHighlight,
} from "../lib/rooms";
import { AdminEditButton } from "./AdminEditButton";
import { broadcastContentChanged } from "./ContentSync";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

const GALLERY_TRANSITION_MS = 420;
const GALLERY_SCALE = 0.92;

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

type JeepneyShuttleGalleryProps = {
  highlights: RoomHighlight[];
  canEdit: boolean;
  onChange: (next: RoomHighlight[]) => void;
  onError: (message: string | null) => void;
  onProgress: (message: string | null) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  uploadProgress: string | null;
};

/** Scuba-style paginated gallery for jeepney / shuttle photos on Rooms. */
export function JeepneyShuttleGallery({
  highlights,
  canEdit,
  onChange,
  onError,
  onProgress,
  busy,
  setBusy,
  uploadProgress,
}: JeepneyShuttleGalleryProps) {
  const perView = useGalleryPerView();
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryFrom, setGalleryFrom] = useState<number | null>(null);
  const [galleryTo, setGalleryTo] = useState<number | null>(null);
  const [galleryZoomRun, setGalleryZoomRun] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const galleryTouch = useRef<{ x: number; y: number } | null>(null);
  const galleryUnlockTimer = useRef<number | null>(null);
  const galleryRaf = useRef<number | null>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const galleryPages = useMemo(() => {
    if (!highlights.length) return [] as RoomHighlight[][];
    const pages: RoomHighlight[][] = [];
    for (let i = 0; i < highlights.length; i += perView) {
      pages.push(highlights.slice(i, i + perView));
    }
    return pages;
  }, [highlights, perView]);

  const pageCount = Math.max(1, galleryPages.length);
  const safeGalleryPage = Math.min(galleryPage, pageCount - 1);
  const counterPage = galleryTo != null ? galleryTo : safeGalleryPage;
  const counterStart = highlights.length ? counterPage * perView + 1 : 0;
  const counterEnd = highlights.length
    ? Math.min(counterPage * perView + perView, highlights.length)
    : 0;
  const canGalleryPrev = (galleryTo ?? safeGalleryPage) > 0;
  const canGalleryNext = (galleryTo ?? safeGalleryPage) < pageCount - 1;
  const galleryTransitioning = galleryFrom != null && galleryTo != null;

  const counterLabel =
    counterStart === counterEnd
      ? `${counterStart}/${highlights.length}`
      : `${counterStart}–${counterEnd} / ${highlights.length}`;

  useEffect(() => {
    setGalleryPage((current) => Math.min(current, Math.max(0, pageCount - 1)));
    setGalleryFrom(null);
    setGalleryTo(null);
    setGalleryZoomRun(false);
    setGalleryBusy(false);
  }, [pageCount]);

  useEffect(() => {
    const focus = galleryTo ?? safeGalleryPage;
    const nextPage = galleryPages[focus + 1];
    const prevPage = galleryPages[focus - 1];
    for (const image of [...(nextPage ?? []), ...(prevPage ?? [])]) {
      const preload = new Image();
      preload.src = roomsMediaUrl(image.image);
    }
  }, [galleryPages, safeGalleryPage, galleryTo]);

  useEffect(() => {
    return () => {
      if (galleryUnlockTimer.current != null) {
        window.clearTimeout(galleryUnlockTimer.current);
      }
      if (galleryRaf.current != null) {
        window.cancelAnimationFrame(galleryRaf.current);
      }
    };
  }, []);

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowRight") {
        setLightbox((i) => (i == null ? i : (i + 1) % highlights.length));
      }
      if (event.key === "ArrowLeft") {
        setLightbox((i) =>
          i == null ? i : (i - 1 + highlights.length) % highlights.length,
        );
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, highlights.length]);

  function goGallery(direction: -1 | 1) {
    if (galleryBusy || !highlights.length) return;
    const from = safeGalleryPage;
    const to = from + direction;
    if (to < 0 || to >= pageCount) return;
    setGalleryBusy(true);
    setGalleryFrom(from);
    setGalleryTo(to);
    setGalleryZoomRun(false);

    if (galleryRaf.current != null) window.cancelAnimationFrame(galleryRaf.current);
    galleryRaf.current = window.requestAnimationFrame(() => {
      galleryRaf.current = window.requestAnimationFrame(() => {
        setGalleryZoomRun(true);
        setGalleryPage(to);
        galleryRaf.current = null;
      });
    });

    if (galleryUnlockTimer.current != null) {
      window.clearTimeout(galleryUnlockTimer.current);
    }
    galleryUnlockTimer.current = window.setTimeout(() => {
      setGalleryFrom(null);
      setGalleryTo(null);
      setGalleryZoomRun(false);
      setGalleryBusy(false);
      galleryUnlockTimer.current = null;
    }, GALLERY_TRANSITION_MS + 40);
  }

  function galleryPrev() {
    goGallery(-1);
  }

  function galleryNext() {
    goGallery(1);
  }

  function onGalleryTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    galleryTouch.current = { x: touch.clientX, y: touch.clientY };
  }

  function onGalleryTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = galleryTouch.current;
    galleryTouch.current = null;
    if (!start || galleryBusy) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
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
              key={image.id}
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
                  src={roomsMediaUrl(image.image)}
                  alt="Private jeepney and shuttle"
                  loading={Math.abs(pageIndex - safeGalleryPage) <= 1 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="aspect-[4/3] max-h-[min(20rem,52vh)] w-full object-cover sm:max-h-none"
                />
              </button>
              {interactive && canEdit ? (
                <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDelete(image.id)}
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

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    onError(null);
    onProgress("Uploading jeepney photos…");
    try {
      const next = await uploadRoomHighlights(Array.from(files));
      onChange(next);
      broadcastContentChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not upload jeepney photos.");
    } finally {
      setBusy(false);
      onProgress(null);
      if (galleryInput.current) galleryInput.current.value = "";
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    onError(null);
    try {
      const next = await deleteRoomHighlightById(id);
      onChange(next);
      broadcastContentChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete photo.");
    } finally {
      setBusy(false);
    }
  }

  if (!highlights.length && !canEdit) return null;

  return (
    <div className="mt-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-[#0b1d33]/80 uppercase">
            Shuttle
          </p>
          <h4 className="mt-2 font-display text-[1.35rem] text-[#0b1d33] sm:text-2xl md:text-3xl">
            Jeepney &amp; pier gallery
          </h4>
        </div>
        {canEdit ? (
          <div>
            <input
              ref={galleryInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(event) => void onUpload(event.target.files)}
            />
            <AdminEditButton
              surface="light"
              disabled={busy}
              onClick={() => galleryInput.current?.click()}
            >
              {uploadProgress?.startsWith("Uploading")
                ? uploadProgress
                : "Upload jeepney / shuttle photos"}
            </AdminEditButton>
          </div>
        ) : null}
      </div>

      {!highlights.length && canEdit ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-white/40 px-4 py-8 text-center text-sm text-ink/55">
          Upload jeepney or shuttle photos to show with this section.
        </p>
      ) : null}

      {highlights.length ? (
        <div
          className="relative touch-pan-y"
          onTouchStart={onGalleryTouchStart}
          onTouchEnd={onGalleryTouchEnd}
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#0b1d33]/5">
            <div className="invisible pointer-events-none" aria-hidden>
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
              aria-label="Previous jeepney photos"
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
              aria-label="Next jeepney photos"
              className="btn-press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#0b1d33]/15 bg-white text-[#0b1d33] transition hover:bg-[#0b1d33] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}

      {lightbox != null && highlights[lightbox] ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Jeepney gallery image"
        >
          <img
            src={roomsMediaUrl(highlights[lightbox].image)}
            alt="Private jeepney and shuttle"
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
    </div>
  );
}
