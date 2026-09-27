import { useEffect, useRef, useState } from "react";
import {
  deleteRoomHighlightById,
  roomsMediaUrl,
  uploadRoomHighlights,
  type RoomHighlight,
} from "../lib/rooms";
import { AdminEditButton } from "./AdminEditButton";
import { GalleryPager } from "./GalleryPager";
import { broadcastContentChanged } from "./ContentSync";
import { ScubaGalleryStage } from "./ScubaGalleryStage";

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

/** Center-stage gallery for jeepney / shuttle photos on Rooms. */
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
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const safeIndex = Math.min(galleryIndex, Math.max(0, highlights.length - 1));
  const slides = highlights.map((item) => ({
    url: roomsMediaUrl(item.image),
    alt: "Private jeepney and shuttle",
    path: item.id,
  }));

  useEffect(() => {
    setGalleryIndex((current) => Math.min(current, Math.max(0, highlights.length - 1)));
  }, [highlights.length]);

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
        <ScubaGalleryStage
          images={slides}
          active={safeIndex}
          onActive={setGalleryIndex}
          onOpen={setLightbox}
          canManage={canEdit}
          busy={busy}
          contained
          onDelete={(id) => void onDelete(id)}
        />
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
          {highlights.length > 1 ? (
            <div
              className="absolute bottom-5 left-1/2 -translate-x-1/2"
              onClick={(event) => event.stopPropagation()}
            >
              <GalleryPager
                count={highlights.length}
                active={lightbox}
                tone="light"
                onSelect={setLightbox}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
