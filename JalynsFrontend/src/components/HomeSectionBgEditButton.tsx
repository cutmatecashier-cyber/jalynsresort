import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchHomeSectionBackground,
  homeHeroMediaUrl,
  notifyHomeSectionUpdated,
  resetHomeSectionBackground,
  uploadHomeSectionBackground,
  type HomeSectionKey,
} from "../lib/homeHero";
import { supabase } from "../lib/supabase";
import { AdminEditButton } from "./AdminEditButton";
import { broadcastContentChanged } from "./ContentSync";

type Props = {
  section: HomeSectionKey;
  title: string;
  defaultUrl: string;
  className?: string;
};

export function HomeSectionBgEditButton({
  section,
  title,
  defaultUrl,
  className = "",
}: Props) {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditHomeBackground(role, approvalStatus);

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  if (!canEdit) return null;

  async function openEditor() {
    setError(null);
    setOpen(true);
    try {
      const url = await fetchHomeSectionBackground(section);
      setPreview(url || defaultUrl);
    } catch {
      setPreview(defaultUrl);
    }
  }

  async function authToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Admin session expired. Please log in again.");
    return token;
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const token = await authToken();
      const data = await uploadHomeSectionBackground(section, file, token);
      const next = data.url || data.sections?.[section] || defaultUrl;
      setPreview(next);
      notifyHomeSectionUpdated(section, next);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload background.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onReset() {
    setBusy(true);
    setError(null);
    try {
      const token = await authToken();
      const data = await resetHomeSectionBackground(section, token);
      const next = data.url || data.sections?.[section] || defaultUrl;
      setPreview(next);
      notifyHomeSectionUpdated(section, next);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset background.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminEditButton className={className} onClick={() => void openEditor()}>
        Edit background
      </AdminEditButton>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={() => !busy && setOpen(false)}
            >
              <div
                className="flex max-h-[min(92dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white text-ink shadow-xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
                  <h2 className="font-display text-2xl">{title}</h2>
                  <p className="mt-1.5 text-sm text-stone">
                    Upload a new photo for this section background.
                  </p>
                  <img
                    src={homeHeroMediaUrl(preview)}
                    alt=""
                    className="mt-4 aspect-[16/9] w-full rounded-xl border border-ink/10 object-cover"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                  />
                  {error ? (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-ink/8 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onReset()}
                    className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                    className="btn-press rounded-full border border-ink/12 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    className="btn-press rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky disabled:opacity-60"
                  >
                    {busy ? "Uploading…" : "Upload photo"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
