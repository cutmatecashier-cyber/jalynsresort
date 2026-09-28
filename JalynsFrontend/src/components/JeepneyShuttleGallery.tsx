import { useEffect, useRef, useState } from "react";
import {
  deleteRoomHighlightById,
  replaceRoomHighlight,
  roomsMediaUrl,
  uploadRoomHighlights,
  ROOM_IMAGE_ACCEPT,
  type RoomHighlight,
} from "../lib/rooms";
import { AdminEditButton } from "./AdminEditButton";
import { GalleryLightbox } from "./GalleryLightbox";
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
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
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

  async function onReplace(files: FileList | null) {
    const file = files?.[0];
    if (!file || !replaceId) return;
    setBusy(true);
    onError(null);
    onProgress("Replacing photo…");
    try {
      const next = await replaceRoomHighlight(replaceId, file);
      onChange(next);
      broadcastContentChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not replace photo.");
    } finally {
      setReplaceId(null);
      setBusy(false);
      onProgress(null);
      if (replaceInput.current) replaceInput.current.value = "";
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
    <section className="mt-8 sm:mt-10">
      <div className="text-center">
        <p className="text-[0.62rem] font-semibold tracking-[0.32em] text-white/75 uppercase">
          Shuttle
        </p>
        <h2 className="mt-2 font-display text-[1.85rem] leading-tight text-white sm:text-4xl lg:text-5xl">
          Jeepney &amp; pier gallery
        </h2>
        {canEdit ? (
          <div className="mt-4">
            <input
              ref={galleryInput}
              type="file"
              accept={ROOM_IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(event) => void onUpload(event.target.files)}
            />
            <AdminEditButton disabled={busy} onClick={() => galleryInput.current?.click()}>
              {uploadProgress?.startsWith("Uploading")
                ? uploadProgress
                : "Upload jeepney / shuttle photos"}
            </AdminEditButton>
          </div>
        ) : null}
      </div>

      {!highlights.length && canEdit ? (
        <p className="mt-4 text-sm text-white/70">
          Upload jeepney or shuttle photos to show with this section.
        </p>
      ) : null}

      {highlights.length ? (
        <div className="mt-6 sm:mt-8">
          <ScubaGalleryStage
            images={slides}
            active={safeIndex}
            onActive={setGalleryIndex}
            onOpen={setLightbox}
            canManage={canEdit}
            busy={busy}
            onReplace={(id) => {
              setReplaceId(id);
              replaceInput.current?.click();
            }}
            onDelete={(id) => void onDelete(id)}
          />
        </div>
      ) : null}

      <input
        ref={replaceInput}
        type="file"
        accept={ROOM_IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => void onReplace(event.target.files)}
      />

      {lightbox != null ? (
        <GalleryLightbox
          images={highlights.map((item) => ({
            url: roomsMediaUrl(item.image),
            alt: "Private jeepney and shuttle",
          }))}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onSelect={setLightbox}
        />
      ) : null}
    </section>
  );
}
