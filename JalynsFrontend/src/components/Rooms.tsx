import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_ROOMS,
  deleteRoomPhoto,
  fetchRooms,
  notifyRoomsUpdated,
  resetRoomPhotos,
  roomsMediaUrl,
  ROOMS_UPDATED_EVENT,
  uploadRoomPhoto,
  type RoomPhoto,
} from "../lib/rooms";
import { supabase } from "../lib/supabase";
import { AdminEditButton } from "./AdminEditButton";
import { broadcastContentChanged } from "./ContentSync";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function Rooms() {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditRooms(role, approvalStatus);

  const [rooms, setRooms] = useState<RoomPhoto[]>(() => DEFAULT_ROOMS.map((r) => ({ ...r })));
  const [active, setActive] = useState(0);
  const [parallaxY, setParallaxY] = useState(0);

  const [open, setOpen] = useState(false);
  const [editorRooms, setEditorRooms] = useState<RoomPhoto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const addFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchRooms().then((list) => {
      if (!cancelled) setRooms(list);
    });
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ rooms?: RoomPhoto[] }>).detail;
      if (detail?.rooms?.length) {
        setRooms(detail.rooms);
        return;
      }
      void fetchRooms().then((list) => {
        if (!cancelled) setRooms(list);
      });
    };
    window.addEventListener(ROOMS_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(ROOMS_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    if (active >= rooms.length) setActive(Math.max(0, rooms.length - 1));
  }, [rooms.length, active]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const section = document.getElementById("rooms");
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const progress = Math.min(Math.max(-rect.top / (rect.height + window.innerHeight), 0), 1);
        setParallaxY(progress * 48);
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

  const current = rooms[active] ?? rooms[0];

  async function authToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Admin session expired. Please log in again.");
    return token;
  }

  async function openEditor() {
    setError(null);
    setNewName("");
    setOpen(true);
    try {
      const list = await fetchRooms();
      setEditorRooms(list);
      setSelectedId(list[0]?.id ?? null);
    } catch {
      setEditorRooms(rooms);
      setSelectedId(rooms[0]?.id ?? null);
    }
  }

  function applyRooms(next: RoomPhoto[] | undefined) {
    if (!next?.length) {
      notifyRoomsUpdated();
      broadcastContentChanged();
      return;
    }
    setEditorRooms(next);
    setRooms(next);
    notifyRoomsUpdated(next);
    broadcastContentChanged();
    if (!next.some((r) => r.id === selectedId)) {
      setSelectedId(next[0]?.id ?? null);
    }
  }

  async function onAddFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const token = await authToken();
      const data = await uploadRoomPhoto(file, token, {
        name: newName.trim() || undefined,
      });
      applyRooms(data.rooms);
      setNewName("");
      if (data.rooms?.length) {
        setSelectedId(data.rooms[data.rooms.length - 1]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add room photo.");
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
      const token = await authToken();
      const data = await uploadRoomPhoto(file, token, { replaceId: selectedId });
      applyRooms(data.rooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not replace photo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete() {
    if (!selectedId) return;
    if (editorRooms.length <= 1) {
      setError("Keep at least one room photo.");
      return;
    }
    if (!window.confirm("Delete this room photo?")) return;
    setBusy(true);
    setError(null);
    try {
      const token = await authToken();
      const data = await deleteRoomPhoto(selectedId, token);
      applyRooms(data.rooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete photo.");
    } finally {
      setBusy(false);
    }
  }

  async function onResetAll() {
    if (!window.confirm("Reset room photos to the defaults?")) return;
    setBusy(true);
    setError(null);
    try {
      const token = await authToken();
      const data = await resetRoomPhotos(token);
      applyRooms(data.rooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset photos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="rooms" className="bg-white px-5 pb-10 sm:px-6 sm:pb-14 md:px-8 lg:px-10 xl:px-12">
      <div className="relative overflow-hidden rounded-[1.5rem]">
        {current ? (
          <img
            src={roomsMediaUrl(current.image)}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm will-change-transform"
            style={{ transform: `translate3d(0, ${parallaxY}px, 0) scale(1.12)` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-ink/70" />

        <div className="relative grid gap-6 p-5 sm:p-7 md:grid-cols-2 md:items-center md:gap-8 md:p-10">
          <Reveal variant="left" delay={40}>
            <div className="text-white">
              <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-white/55 uppercase">
                Our Rooms and Apartments
              </p>
              <h2 className="mt-2 font-display text-3xl leading-[1.08] sm:text-4xl md:text-5xl">
                Stay in Comfort and Style
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[0.95rem]">
                From cozy doubles to spacious suites, every room is crafted for restful nights and
                easy mornings overlooking Puerto Galera.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="#book"
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:gap-3 hover:bg-white/10"
              >
                View All Rooms
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </a>
                {canEdit ? (
                  <AdminEditButton onClick={() => void openEditor()}>Edit photos</AdminEditButton>
                ) : null}
              </div>
            </div>
          </Reveal>

          <Reveal variant="right" delay={160}>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                <div className="relative aspect-[5/4]">
                  {rooms.map((room, index) => (
                    <img
                      key={room.id}
                      src={roomsMediaUrl(room.image)}
                      alt={room.name}
                      className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                        index === active ? "scale-100 opacity-100" : "scale-105 opacity-0"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActive((c) => (c - 1 + rooms.length) % rooms.length)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                    aria-label="Previous room"
                    disabled={rooms.length < 2}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive((c) => (c + 1) % rooms.length)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                    aria-label="Next room"
                    disabled={rooms.length < 2}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm font-medium text-white/80">
                  {rooms.length ? `${active + 1} / ${rooms.length}` : "0 / 0"}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Edit room photos"
              onClick={() => !busy && setOpen(false)}
            >
              <div
                className="flex max-h-[min(92dvh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white text-ink shadow-xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
                  <h2 className="font-display text-2xl">Room photos</h2>
                  <p className="mt-1.5 text-sm text-stone">
                    Add new pictures or delete ones you no longer want in Our Rooms and Apartments.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {editorRooms.map((room) => {
                      const isActive = room.id === selectedId;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedId(room.id)}
                          className={`overflow-hidden rounded-xl border text-left transition ${
                            isActive
                              ? "border-sky-deep ring-2 ring-sky-deep/30"
                              : "border-ink/10 hover:border-ink/25"
                          }`}
                        >
                          <img
                            src={roomsMediaUrl(room.image)}
                            alt=""
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <p className="truncate px-2.5 py-2 text-xs font-semibold text-ink">
                            {room.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <label className="mt-5 block text-sm font-semibold text-ink">
                    Name for new photo
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Pool View Suite"
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
                      disabled={busy || !selectedId || editorRooms.length <= 1}
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
    </section>
  );
}
