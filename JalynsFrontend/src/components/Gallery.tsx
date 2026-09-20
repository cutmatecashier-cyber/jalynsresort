import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_GALLERY,
  deleteGalleryPhoto,
  fetchGallery,
  galleryMediaUrl,
  GALLERY_UPDATED_EVENT,
  notifyGalleryUpdated,
  resetGalleryPhotos,
  uploadGalleryPhoto,
  type GalleryPhoto,
} from "../lib/gallery";
import { useWheelScrollContain } from "../lib/useWheelScrollContain";
import { AdminEditButton } from "./AdminEditButton";
import { ConfirmDialog } from "./ConfirmDialog";
import { broadcastContentChanged } from "./ContentSync";
import { Reveal } from "./Reveal";

function photoLayoutClass(index: number, total: number) {
  if (index === 0 && total > 1) {
    return "md:col-span-2 md:row-span-2 aspect-auto min-h-[16rem] md:min-h-0";
  }
  return "aspect-square";
}

export function Gallery() {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditGallery(role, approvalStatus);

  const [photos, setPhotos] = useState<GalleryPhoto[]>(() =>
    DEFAULT_GALLERY.map((p) => ({ ...p })),
  );

  const [open, setOpen] = useState(false);
  const [editorPhotos, setEditorPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAlt, setNewAlt] = useState("");
  const [confirmAction, setConfirmAction] = useState<"delete" | "reset" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addFileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useWheelScrollContain<HTMLDivElement>(open);

  useEffect(() => {
    let cancelled = false;
    void fetchGallery().then((list) => {
      if (!cancelled) setPhotos(list);
    });
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ photos?: GalleryPhoto[] }>).detail;
      // Prefer explicit list from a successful save/delete (including shorter lists).
      if (detail && Array.isArray(detail.photos)) {
        setPhotos(detail.photos);
        return;
      }
      void fetchGallery().then((list) => {
        if (!cancelled) setPhotos(list);
      });
    };
    window.addEventListener(GALLERY_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(GALLERY_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setOpen(false);
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
  }, [open, busy]);

  async function openEditor() {
    setError(null);
    setNewAlt("");
    setOpen(true);
    try {
      const list = await fetchGallery();
      setEditorPhotos(list);
      setSelectedId(list[0]?.id ?? null);
    } catch {
      setEditorPhotos(photos);
      setSelectedId(photos[0]?.id ?? null);
    }
  }

  function applyPhotos(next: GalleryPhoto[] | undefined) {
    if (!next?.length) {
      notifyGalleryUpdated();
      broadcastContentChanged();
      return;
    }
    setEditorPhotos(next);
    setPhotos(next);
    notifyGalleryUpdated(next);
    broadcastContentChanged();
    if (!next.some((p) => p.id === selectedId)) {
      setSelectedId(next[0]?.id ?? null);
    }
  }

  async function onAddFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const data = await uploadGalleryPhoto(file, {
        alt: newAlt.trim() || undefined,
      });
      applyPhotos(data.photos);
      setNewAlt("");
      if (data.photos?.length) {
        setSelectedId(data.photos[data.photos.length - 1]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add gallery photo.");
    } finally {
      setBusy(false);
      if (addFileRef.current) addFileRef.current.value = "";
    }
  }

  async function onReplaceFile(file: File | null) {
    if (!file || !selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await uploadGalleryPhoto(file, { replaceId: selectedId });
      applyPhotos(data.photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not replace photo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete() {
    if (!selectedId) return;
    if (editorPhotos.length <= 1) {
      setError("Keep at least one gallery photo.");
      return;
    }
    setConfirmAction("delete");
  }

  async function confirmDelete() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setConfirmAction(null);
    try {
      const data = await deleteGalleryPhoto(selectedId);
      applyPhotos(data.photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete photo.");
    } finally {
      setBusy(false);
    }
  }

  async function onResetAll() {
    setConfirmAction("reset");
  }

  async function confirmReset() {
    setBusy(true);
    setError(null);
    setConfirmAction(null);
    try {
      const data = await resetGalleryPhotos();
      applyPhotos(data.photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset photos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="gallery" className="bg-foam px-5 py-16 sm:px-6 md:px-8 md:py-20 lg:px-10 xl:px-12">
      <div className="w-full">
        <Reveal className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-stone uppercase">
              Gallery
            </p>
            <h2 className="mt-2 font-display text-4xl text-ink md:text-5xl">
              Moments by the water
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <AdminEditButton surface="light" onClick={() => void openEditor()}>
                Edit photos
              </AdminEditButton>
            ) : null}
            <a
              href="#gallery"
              className="text-sm font-semibold text-ink/70 underline-offset-4 transition hover:text-ink hover:underline"
            >
              View all photos
            </a>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:grid-rows-2 md:gap-3">
          {photos.map((photo, index) => (
            <Reveal
              key={photo.id}
              delay={index * 70}
              variant="up"
              className={photoLayoutClass(index, photos.length)}
            >
              <figure className="group h-full overflow-hidden rounded-xl">
                <img
                  src={galleryMediaUrl(photo.image)}
                  alt={photo.alt}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              </figure>
            </Reveal>
          ))}
        </div>
      </div>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Edit gallery photos"
              onClick={() => !busy && setOpen(false)}
            >
              <div
                className="flex h-[min(92dvh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white text-ink shadow-xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  ref={scrollRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-3 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pt-6"
                >
                  <h2 className="font-display text-2xl">Gallery photos</h2>
                  <p className="mt-1.5 text-sm text-stone">
                    Add new pictures or delete ones from Moments by the water.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {editorPhotos.map((photo) => {
                      const isActive = photo.id === selectedId;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedId(photo.id)}
                          className={`overflow-hidden rounded-xl border text-left transition ${
                            isActive
                              ? "border-sky-deep ring-2 ring-sky-deep/30"
                              : "border-ink/10 hover:border-ink/25"
                          }`}
                        >
                          <img
                            src={galleryMediaUrl(photo.image)}
                            alt=""
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <p className="truncate px-2.5 py-2 text-xs font-semibold text-ink">
                            {photo.alt}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <label className="mt-5 block text-sm font-semibold text-ink">
                    Description for new photo
                    <input
                      type="text"
                      value={newAlt}
                      onChange={(e) => setNewAlt(e.target.value)}
                      placeholder="e.g. Sunset over the cove"
                      className="mt-1.5 w-full rounded-xl border border-ink/12 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-sky-deep"
                    />
                  </label>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => void onReplaceFile(e.target.files?.[0] ?? null)}
                  />
                  <input
                    ref={addFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => void onAddFile(e.target.files?.[0] ?? null)}
                  />

                  {error ? (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                      {error}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-2 border-t border-ink/8 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => addFileRef.current?.click()}
                      className="btn-press rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky disabled:opacity-60"
                    >
                      {busy ? "Working…" : "Add photo"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !selectedId}
                      onClick={() => fileRef.current?.click()}
                      className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                    >
                      Replace selected
                    </button>
                    <button
                      type="button"
                      disabled={busy || !selectedId || editorPhotos.length <= 1}
                      onClick={() => void onDelete()}
                      className="btn-press rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onResetAll()}
                      className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                    >
                      Reset all
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setOpen(false)}
                      className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={confirmAction === "delete"}
        title="Delete photo?"
        message="This photo will be removed from Moments by the water. This cannot be undone."
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={confirmAction === "reset"}
        title="Reset gallery?"
        message="All gallery photos will be restored to the defaults. This cannot be undone."
        confirmLabel="Reset all"
        busy={busy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void confirmReset()}
      />
    </section>
  );
}
