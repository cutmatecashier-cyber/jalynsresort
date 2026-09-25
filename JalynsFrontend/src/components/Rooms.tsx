import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createRoomWithImage,
  DEFAULT_ROOMS,
  DEFAULT_ROOMS_CONTENT,
  DEFAULT_ROOMS_HERO,
  DEFAULT_ROOMS_VOUCHER,
  deleteRoomById,
  deleteRoomImageAt,
  fetchRoomsCatalog,
  fetchRoomsContentBackground,
  fetchRoomsHero,
  removeRoomsContentBackground,
  removeRoomsHero,
  replaceRoomImageAt,
  resetRoomsCatalog,
  roomsMediaUrl,
  ROOMS_UPDATED_EVENT,
  updateRoomDetails,
  updateRoomsVoucher,
  uploadRoomImages,
  uploadRoomsContentBackgroundWithResult,
  uploadRoomsHeroWithResult,
  type Room,
  type RoomFormInput,
  type RoomHighlight,
  type RoomsVoucher,
  type RoomStatus,
} from "../lib/rooms";
import { useWheelScrollContain } from "../lib/useWheelScrollContain";
import { AdminEditButton } from "./AdminEditButton";
import { broadcastContentChanged } from "./ContentSync";
import { Footer } from "./Footer";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { JeepneyShuttleGallery } from "./JeepneyShuttleGallery";
import { Navbar } from "./Navbar";
import { Reveal } from "./Reveal";

type BgKind = "hero" | "content";
type EditorMode = "list" | "create" | "edit";

const emptyForm = (): RoomFormInput => ({
  name: "",
  description: "",
  size: "",
  max_capacity: "",
  beds: "",
  price_per_night: "Contact for rates",
  extra_person_charge: "",
  rules_policies: "",
  status: "available",
  amenities: [],
});

const cardClass =
  "rounded-2xl border border-white/35 bg-white/50 text-ink shadow-[0_16px_40px_rgba(8,18,28,0.12)] backdrop-blur-xl sm:rounded-3xl sm:bg-white/45";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

function amenitiesToText(list: string[]) {
  return list.join("\n");
}

function textToAmenities(text: string) {
  return text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPeso(value: string) {
  const raw = value.trim();
  if (!raw || raw === "—") return "—";
  // Already has currency / contact-style text — keep as-is
  if (/[₱$€]|peso|contact|night|\/\s*night/i.test(raw)) return raw;
  const digits = raw.replace(/[^\d.]/g, "");
  if (!digits) return raw;
  const num = Number(digits);
  if (!Number.isFinite(num)) return `₱${raw}`;
  return `₱${num.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

/** Line-clamped text with Read more / Read less when content overflows. */
function ExpandableClampedText({
  text,
  lines,
  emptyLabel = "—",
  className = "",
}: {
  text: string;
  lines: 2 | 4;
  emptyLabel?: string;
  className?: string;
}) {
  const content = text.trim();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [content]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !content) {
      setNeedsToggle(false);
      return;
    }

    const measure = () => {
      if (expanded) {
        // Re-check overflow in a clamped clone so the button stays available
        const probe = el.cloneNode(true) as HTMLParagraphElement;
        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        probe.style.pointerEvents = "none";
        probe.style.height = "auto";
        probe.style.maxHeight = "none";
        probe.style.webkitLineClamp = String(lines);
        probe.style.display = "-webkit-box";
        probe.style.webkitBoxOrient = "vertical";
        probe.style.overflow = "hidden";
        probe.style.width = `${el.clientWidth}px`;
        probe.classList.add(lines === 2 ? "line-clamp-2" : "line-clamp-4");
        el.parentElement?.appendChild(probe);
        const overflow = probe.scrollHeight > probe.clientHeight + 1;
        probe.remove();
        setNeedsToggle(overflow);
        return;
      }
      setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [content, expanded, lines]);

  if (!content) {
    return <p className={`text-sm text-ink/45 ${className}`.trim()}>{emptyLabel}</p>;
  }

  const clampClass = lines === 2 ? "line-clamp-2" : "line-clamp-4";

  return (
    <div className="min-w-0">
      <p
        ref={ref}
        className={`text-sm leading-relaxed text-ink/75 transition-[max-height] duration-300 ease-out ${
          expanded ? "whitespace-pre-wrap" : clampClass
        } ${className}`.trim()}
      >
        {content}
      </p>
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="btn-press mt-1 inline-flex min-h-9 items-center text-sm font-semibold text-sky-deep underline-offset-2 hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

function RoomImageCarousel({
  images,
  name,
  className = "",
}: {
  images: string[];
  name: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const safeIndex = Math.min(index, Math.max(0, total - 1));
  const src = images[safeIndex] ? roomsMediaUrl(images[safeIndex]) : "";

  useEffect(() => {
    setIndex(0);
  }, [images.join("|")]);

  const frameClass =
    `relative aspect-[5/4] w-full overflow-hidden bg-[#07101c] lg:aspect-auto lg:h-full lg:min-h-[18rem] ${className}`.trim();

  if (!total) {
    return (
      <div className={`${frameClass} flex items-center justify-center text-sm text-ink/50`}>
        No image
      </div>
    );
  }

  const navBtnClass =
    "btn-press pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#0b1d33]/15 bg-white text-[#0b1d33] shadow-md transition hover:bg-[#0b1d33] hover:text-white sm:h-12 sm:w-12";

  return (
    <div className={frameClass}>
      {/* Absolute fill keeps every slide the same size regardless of upload dimensions */}
      <img
        src={src}
        alt={`${name} — photo ${safeIndex + 1} of ${total}`}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
        loading="lazy"
        decoding="async"
        draggable={false}
      />

      {total > 1 ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between px-2.5 sm:px-3.5">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
            aria-label="Previous photo"
            className={navBtnClass}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % total)}
            aria-label="Next photo"
            className={navBtnClass}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <p className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#0b1d33]/10 bg-white/95 px-3 py-1 text-sm font-semibold tracking-wide text-[#0b1d33] tabular-nums shadow-sm">
        {safeIndex + 1} / {total}
      </p>
    </div>
  );
}

export function Rooms() {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditRooms(role, approvalStatus);

  const [rooms, setRooms] = useState<Room[]>(() =>
    DEFAULT_ROOMS.map((r) => ({ ...r, amenities: [...r.amenities], images: [...r.images] })),
  );
  const [voucher, setVoucher] = useState<RoomsVoucher>({ ...DEFAULT_ROOMS_VOUCHER });
  const [voucherEnabled, setVoucherEnabled] = useState(false);
  const [voucherPercentText, setVoucherPercentText] = useState("");
  const [highlights, setHighlights] = useState<RoomHighlight[]>([]);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [hasCustomHero, setHasCustomHero] = useState(false);
  const [hasCustomContent, setHasCustomContent] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);

  const [bgEditor, setBgEditor] = useState<BgKind | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormInput>(emptyForm);
  const [amenitiesText, setAmenitiesText] = useState("");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createPreview, setCreatePreview] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImageDelete, setConfirmImageDelete] = useState<number | null>(null);

  const heroInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLInputElement>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const addImagesRef = useRef<HTMLInputElement>(null);
  const replaceImageRef = useRef<HTMLInputElement>(null);
  const replaceImageIndex = useRef(0);
  const scrollRef = useWheelScrollContain<HTMLDivElement>(manageOpen || Boolean(bgEditor));

  const displayHero = heroUrl ?? (imagesReady ? DEFAULT_ROOMS_HERO : null);
  const displayContent = contentUrl ?? (imagesReady ? DEFAULT_ROOMS_CONTENT : null);
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedId) ?? null,
    [rooms, selectedId],
  );

  const loadRooms = useCallback(async () => {
    const catalog = await fetchRoomsCatalog();
    setRooms(catalog.rooms);
    setVoucher(catalog.voucher);
    setVoucherEnabled(catalog.voucher.enabled);
    setVoucherPercentText(
      catalog.voucher.percent > 0 ? String(catalog.voucher.percent) : "",
    );
    setHighlights(catalog.highlights);
  }, []);

  const loadBackgrounds = useCallback(async () => {
    const [hero, content] = await Promise.all([
      fetchRoomsHero(),
      fetchRoomsContentBackground(),
    ]);
    setHeroUrl(hero.url);
    setContentUrl(content.url);
    setHasCustomHero(Boolean(hero.path));
    setHasCustomContent(Boolean(content.path));
    setImagesReady(true);
  }, []);

  useEffect(() => {
    void loadRooms();
    void loadBackgrounds();
  }, [loadRooms, loadBackgrounds]);

  useEffect(() => {
    document.title = "Rooms & Apartments | Jalyn's Resort & Restaurant";
    return () => {
      document.title = "Jalyn's Resort & Restaurant | Puerto Galera";
    };
  }, []);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          rooms?: Room[];
          voucher?: RoomsVoucher;
          highlights?: RoomHighlight[];
        }>
      ).detail;
      if (detail?.voucher) {
        setVoucher(detail.voucher);
        setVoucherEnabled(detail.voucher.enabled);
        setVoucherPercentText(
          detail.voucher.percent > 0 ? String(detail.voucher.percent) : "",
        );
      }
      if (detail && Array.isArray(detail.highlights)) {
        setHighlights(detail.highlights);
      }
      if (detail && Array.isArray(detail.rooms)) {
        setRooms(detail.rooms);
      } else if (!detail?.voucher && !Array.isArray(detail?.highlights)) {
        void loadRooms();
      }
      void loadBackgrounds();
    };
    window.addEventListener(ROOMS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(ROOMS_UPDATED_EVENT, onUpdated);
  }, [loadRooms, loadBackgrounds]);

  useEffect(() => {
    if (!manageOpen && !bgEditor) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setManageOpen(false);
        setBgEditor(null);
      }
    };
    document.body.style.overflow = "hidden";
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    lenis?.stop();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.removeProperty("overflow");
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [manageOpen, bgEditor, busy]);

  useEffect(() => {
    return () => {
      if (createPreview) URL.revokeObjectURL(createPreview);
    };
  }, [createPreview]);

  function openManage() {
    setError(null);
    setEditorMode("list");
    setSelectedId(null);
    setForm(emptyForm());
    setAmenitiesText("");
    setCreateFile(null);
    if (createPreview) URL.revokeObjectURL(createPreview);
    setCreatePreview(null);
    setManageOpen(true);
  }

  function startCreate() {
    setEditorMode("create");
    setSelectedId(null);
    setForm(emptyForm());
    setAmenitiesText("");
    setCreateFile(null);
    if (createPreview) URL.revokeObjectURL(createPreview);
    setCreatePreview(null);
    setError(null);
  }

  function startEdit(room: Room) {
    setEditorMode("edit");
    setSelectedId(room.id);
    setForm({
      name: room.name ?? "",
      description: room.description ?? "",
      size: room.size ?? "",
      max_capacity: room.max_capacity ?? "",
      beds: room.beds ?? "",
      price_per_night: room.price_per_night ?? "",
      extra_person_charge: room.extra_person_charge ?? "",
      rules_policies: room.rules_policies ?? "",
      status: room.status === "unavailable" ? "unavailable" : "available",
      amenities: Array.isArray(room.amenities) ? [...room.amenities] : [],
    });
    setAmenitiesText(amenitiesToText(Array.isArray(room.amenities) ? room.amenities : []));
    setError(null);
  }

  async function onHeroFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setUploadProgress("Optimizing & uploading hero…");
    const result = await uploadRoomsHeroWithResult(file);
    if (result.error) setError(result.error);
    else if (result.url) {
      setHeroUrl(result.url);
      setHasCustomHero(true);
      setBgEditor(null);
      broadcastContentChanged();
    }
    setUploadProgress(null);
    setBusy(false);
    if (heroInput.current) heroInput.current.value = "";
  }

  async function onContentFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setUploadProgress("Optimizing & uploading content background…");
    const result = await uploadRoomsContentBackgroundWithResult(file);
    if (result.error) setError(result.error);
    else if (result.url) {
      setContentUrl(result.url);
      setHasCustomContent(true);
      setBgEditor(null);
      broadcastContentChanged();
    }
    setUploadProgress(null);
    setBusy(false);
    if (contentInput.current) contentInput.current.value = "";
  }

  async function onRemoveHero() {
    setBusy(true);
    setError(null);
    const message = await removeRoomsHero();
    if (message) setError(message);
    else {
      setHeroUrl(null);
      setHasCustomHero(false);
      setBgEditor(null);
      broadcastContentChanged();
    }
    setBusy(false);
  }

  async function onRemoveContent() {
    setBusy(true);
    setError(null);
    const message = await removeRoomsContentBackground();
    if (message) setError(message);
    else {
      setContentUrl(null);
      setHasCustomContent(false);
      setBgEditor(null);
      broadcastContentChanged();
    }
    setBusy(false);
  }

  async function onSaveRoom(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: RoomFormInput = {
      name: form.name ?? "",
      description: form.description ?? "",
      size: form.size ?? "",
      max_capacity: form.max_capacity ?? "",
      beds: form.beds ?? "",
      price_per_night: form.price_per_night ?? "",
      extra_person_charge: form.extra_person_charge ?? "",
      rules_policies: form.rules_policies ?? "",
      status: form.status === "unavailable" ? "unavailable" : "available",
      amenities: textToAmenities(amenitiesText),
    };
    try {
      if (editorMode === "create") {
        if (!createFile) throw new Error("Please choose a room image.");
        const next = await createRoomWithImage(createFile, payload);
        setRooms(next);
        setEditorMode("list");
        setSelectedId(null);
        broadcastContentChanged();
        // Confirm persistence from API/cloud store
        const confirmed = await fetchRoomsCatalog();
        setRooms(confirmed.rooms);
      } else if (editorMode === "edit" && selectedId) {
        const next = await updateRoomDetails(selectedId, payload);
        setRooms(next);
        setEditorMode("list");
        setSelectedId(null);
        broadcastContentChanged();
        const confirmed = await fetchRoomsCatalog();
        setRooms(confirmed.rooms);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save room.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmDeleteRoom() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const next = await deleteRoomById(selectedId);
      setRooms(next);
      setConfirmDelete(false);
      setEditorMode("list");
      setSelectedId(null);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete room.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmReset() {
    setBusy(true);
    setError(null);
    try {
      const next = await resetRoomsCatalog();
      setRooms(next);
      setConfirmReset(false);
      setEditorMode("list");
      setSelectedId(null);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset rooms.");
    } finally {
      setBusy(false);
    }
  }

  async function onAddImages(fileList: FileList | null) {
    if (!selectedId || !fileList?.length) return;
    setBusy(true);
    setError(null);
    try {
      const next = await uploadRoomImages(selectedId, Array.from(fileList));
      setRooms(next);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload images.");
    } finally {
      setBusy(false);
      if (addImagesRef.current) addImagesRef.current.value = "";
    }
  }

  async function onReplaceImage(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!selectedId || !file) return;
    setBusy(true);
    setError(null);
    try {
      const next = await replaceRoomImageAt(selectedId, replaceImageIndex.current, file);
      setRooms(next);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not replace image.");
    } finally {
      setBusy(false);
      if (replaceImageRef.current) replaceImageRef.current.value = "";
    }
  }

  async function onConfirmDeleteImage() {
    if (!selectedId || confirmImageDelete == null) return;
    setBusy(true);
    setError(null);
    try {
      const next = await deleteRoomImageAt(selectedId, confirmImageDelete);
      setRooms(next);
      setConfirmImageDelete(null);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete image.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveVoucher() {
    setBusy(true);
    setError(null);
    try {
      const percent = Math.min(
        100,
        Math.max(0, Number.parseInt(voucherPercentText || "0", 10) || 0),
      );
      const next = await updateRoomsVoucher({
        enabled: voucherEnabled && percent > 0,
        percent,
      });
      setVoucher(next);
      setVoucherEnabled(next.enabled);
      setVoucherPercentText(next.percent > 0 ? String(next.percent) : "");
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save voucher.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="rooms" className="overflow-x-clip bg-[#05080f] text-ink">
      <section className="relative min-h-[100svh] overflow-hidden text-white">
        <div className="absolute inset-0 bg-[#07101c]">
          {displayHero ? (
            <img
              src={displayHero}
              alt="Jalyn's Resort rooms and apartments"
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
              aria-label="Change rooms hero background image"
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
            Stay with us
          </p>
          <h1
            className="animate-fade-up mt-2.5 max-w-4xl font-display text-[2rem] leading-[1.08] text-white sm:mt-3 sm:text-5xl md:text-6xl lg:text-[4.35rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Rooms &amp; Apartments
          </h1>
          <p
            className="animate-fade-up mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-white/85 sm:mt-4 sm:text-lg md:text-xl"
            style={{ animationDelay: "0.16s" }}
          >
            Peace and quiet with stunning views at extremely competitive prices — one of the best
            value stays in Puerto Galera.
          </p>
          {canEdit ? (
            <div className="pointer-events-auto mt-7 flex flex-wrap gap-2">
              <AdminEditButton onClick={() => setBgEditor("hero")}>
                Change hero background
              </AdminEditButton>
              <AdminEditButton onClick={() => setBgEditor("content")}>
                Change content background
              </AdminEditButton>
              <AdminEditButton onClick={openManage}>Manage rooms</AdminEditButton>
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
          <div className="absolute inset-0 bg-[#07101c]/72" />
        </div>

        <div className="relative z-0 -mt-[100svh]">
          {canEdit && (error || uploadProgress) && !manageOpen && !bgEditor ? (
            <div className="px-4 pt-5 sm:px-6 sm:pt-6 md:px-8 lg:px-10 xl:px-12">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {uploadProgress ? <p>{uploadProgress}</p> : null}
                {error ? <p className={uploadProgress ? "mt-2" : undefined}>{error}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="relative w-full px-4 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-16 md:px-8 lg:px-10 lg:pb-20 xl:px-12">
            <section className={`${cardClass} p-6 sm:p-8 lg:p-10`}>
              <Reveal variant="up">
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-sky-deep uppercase">
                  Our rooms and apartments
                </p>
                <h3 className="mt-2 font-display text-2xl text-ink sm:text-3xl md:text-4xl">
                  Comfort, views &amp; genuine value
                </h3>
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink/75 sm:text-base">
                  <p>
                    Every room at Jalyn&apos;s has an ensuite bathroom, hot water shower, icy cold
                    air conditioning, mini-bar fridge, and flat-screen TV.{" "}
                    <Link to="/restaurant" className="font-semibold text-sky-deep hover:underline">
                      Our restaurant
                    </Link>{" "}
                    with its stunning views and billiard/pool table is also a great place to pass
                    some time between adventuring,{" "}
                    <Link to="/scuba-diving" className="font-semibold text-sky-deep hover:underline">
                      diving
                    </Link>
                    , or whatever else you&apos;ll be doing in Puerto Galera.
                  </p>
                  <p>
                    Travelling with children? No problem — we have family-friendly accommodation and
                    3 swimming pools to keep everyone entertained while you relax. And if you feel
                    like being totally pampered, be sure to try our{" "}
                    <Link to="/spa" className="font-semibold text-sky-deep hover:underline">
                      Spa Treatments
                    </Link>
                    .
                  </p>
                </div>
              </Reveal>
            </section>

            <section className={`${cardClass} mt-8 p-6 sm:mt-10 sm:p-8 lg:p-10`}>
              <Reveal variant="up">
                <div className="space-y-4 text-sm leading-relaxed text-ink/75 sm:text-base">
                  <p>
                    For your convenience, our private jeepney provides a convenient shuttle service
                    for our guests wanting to go into Sabang or would like to be picked up/dropped
                    off at Muelle Pier or Balatero Pier. Our Jeepney is also available for tours to
                    the many popular tourist attractions such as waterfalls and beaches and
                    we&apos;ve even got seafront access via our own private pier and boat that can
                    be hired for island hopping adventures.
                  </p>
                  <p>
                    Our rooms and amenities are outlined below. If there&apos;s anything you&apos;re
                    not sure about or have any questions regarding our accommodation, please do not
                    hesitate to{" "}
                    <Link to="/contact" className="font-semibold text-sky-deep hover:underline">
                      contact us
                    </Link>
                    .
                  </p>
                </div>

                <JeepneyShuttleGallery
                  highlights={highlights}
                  canEdit={canEdit}
                  onChange={setHighlights}
                  onError={setError}
                  onProgress={setUploadProgress}
                  busy={busy}
                  setBusy={setBusy}
                  uploadProgress={uploadProgress}
                />
              </Reveal>
            </section>

            {canEdit && voucher.enabled && voucher.percent > 0 ? (
              <div className="mt-6 mb-2 rounded-2xl border border-amber-300/60 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:px-5">
                <p className="font-semibold tracking-wide uppercase text-[0.7rem] text-amber-800">
                  Admin voucher (rooms)
                </p>
                <p className="mt-1">
                  <span className="font-semibold">{voucher.percent}% off</span> is automatically
                  applied to room rates. Guests also see this offer on the home page.
                </p>
              </div>
            ) : null}

            <div className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
              {rooms.map((room, i) => (
                <article
                  key={room.id}
                  className={`${cardClass} overflow-hidden ${
                    room.status === "unavailable" ? "opacity-90" : ""
                  }`}
                >
                  <Reveal delay={Math.min(i * 40, 160)} variant="up" className="h-full">
                    <div className="grid h-full gap-0 lg:grid-cols-2 lg:items-stretch">
                      <div className="min-h-0 lg:h-full">
                        <RoomImageCarousel images={room.images} name={room.name} />
                      </div>
                      <div className="flex min-h-0 flex-col p-5 sm:p-6 lg:min-h-[22rem] lg:p-7">
                        <div className="flex min-h-[3.25rem] flex-wrap items-start justify-between gap-2">
                          <h3 className="min-w-0 font-display text-2xl leading-tight text-ink sm:text-[1.75rem] line-clamp-2">
                            {room.name}
                          </h3>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase ${
                              room.status === "available"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-stone/20 text-ink/60"
                            }`}
                          >
                            {room.status === "available" ? "Available" : "Unavailable"}
                          </span>
                        </div>

                        <div className="mt-2.5 min-h-[5.5rem]">
                          <ExpandableClampedText text={room.description} lines={4} />
                        </div>

                        <dl className="mt-4 grid shrink-0 grid-cols-2 gap-x-4 gap-y-2.5 border-y border-ink/10 py-3 text-sm sm:grid-cols-3">
                          <div>
                            <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                              Price per night
                            </dt>
                            <dd className="mt-0.5 font-semibold text-ink">
                              {formatPeso(room.price_per_night || "")}
                              {voucher.enabled && voucher.percent > 0 ? (
                                <span className="ml-1.5 text-[0.65rem] font-semibold text-amber-800">
                                  (−{voucher.percent}%)
                                </span>
                              ) : null}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                              Size
                            </dt>
                            <dd className="mt-0.5 truncate font-medium text-ink">
                              {room.size || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                              Max capacity
                            </dt>
                            <dd className="mt-0.5 truncate font-medium text-ink">
                              {room.max_capacity || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                              Beds
                            </dt>
                            <dd className="mt-0.5 truncate font-medium text-ink">
                              {room.beds || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                              Extra person
                            </dt>
                            <dd className="mt-0.5 truncate font-medium text-ink">
                              {room.extra_person_charge || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                              Status
                            </dt>
                            <dd className="mt-0.5 font-medium text-ink capitalize">
                              {room.status || "available"}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-3 min-h-[3.25rem]">
                          <p className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                            Room rules &amp; policies
                          </p>
                          <div className="mt-1">
                            <ExpandableClampedText
                              text={room.rules_policies || ""}
                              lines={2}
                              className="leading-snug"
                            />
                          </div>
                        </div>

                        <div className="mt-2.5 min-h-0 flex-1">
                          <p className="text-[0.62rem] font-semibold tracking-wide text-ink/45 uppercase">
                            Amenities
                          </p>
                          {room.amenities.length ? (
                            <ul className="mt-1.5 flex max-h-[4.75rem] flex-wrap content-start gap-1 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-[5.25rem]">
                              {room.amenities.map((amenity) => (
                                <li
                                  key={`${room.id}-${amenity}`}
                                  className="rounded-full border border-ink/10 bg-white/75 px-2 py-0.5 text-[0.68rem] font-medium leading-tight text-ink/80"
                                >
                                  {amenity}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-0.5 text-sm text-ink/45">—</p>
                          )}
                        </div>

                        <div className="mt-auto flex shrink-0 flex-wrap gap-2 pt-5">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => {
                                openManage();
                                startEdit(room);
                              }}
                              className="btn-press inline-flex min-h-10 items-center justify-center rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
                            >
                              Edit room
                            </button>
                          ) : (
                            <Link
                              to="/contact"
                              className="btn-press inline-flex min-h-10 items-center justify-center rounded-full bg-sky-deep px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky"
                            >
                              Enquire / Book
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </article>
              ))}
            </div>

          </div>

          <Footer />
        </div>
      </div>

      {bgEditor
        ? createPortal(
            <Modal
              title={
                bgEditor === "hero" ? "Rooms hero background" : "Rooms content background"
              }
              onClose={() => !busy && setBgEditor(null)}
            >
              <img
                src={
                  bgEditor === "hero"
                    ? (displayHero ?? DEFAULT_ROOMS_HERO)
                    : (displayContent ?? DEFAULT_ROOMS_CONTENT)
                }
                alt="Current background"
                className="aspect-[16/7] w-full rounded-xl object-cover"
              />
              <p className="mt-3 text-sm text-ink/70">
                Upload a new image to replace this background. Removing it restores the default
                photo. Hero and content backgrounds are saved separately and persist after refresh.
              </p>
              {error ? (
                <p className="mt-3 text-sm font-medium text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              {uploadProgress ? <p className="mt-2 text-sm text-ink/60">{uploadProgress}</p> : null}
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
            </Modal>,
            document.body,
          )
        : null}

      {manageOpen
        ? createPortal(
            <Modal
              title="Rooms management"
              wide
              onClose={() => !busy && setManageOpen(false)}
              scrollRef={scrollRef}
            >
              {error ? (
                <p className="mb-3 text-sm font-medium text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              {editorMode === "list" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-ink/10 bg-white p-4">
                    <p className="text-sm font-semibold text-ink">Rooms voucher (%)</p>
                    <p className="mt-1 text-xs text-ink/55">
                      Automatically applied when enabled. Guests see the percent-off offer on the
                      home page and on room rates — no code needed.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-ink/70">Percent off</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={voucherPercentText}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                            const n = Number(digits);
                            if (digits === "") {
                              setVoucherPercentText("");
                              return;
                            }
                            if (Number.isFinite(n)) {
                              setVoucherPercentText(String(Math.min(100, n)));
                            }
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                          className={`${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                        />
                      </label>
                      <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink">
                        <input
                          type="checkbox"
                          checked={voucherEnabled}
                          onChange={(e) => setVoucherEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-ink/20"
                        />
                        Enable voucher (auto-apply)
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onSaveVoucher()}
                      className="btn-press mt-3 rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? "Saving…" : "Save voucher"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={startCreate}
                      className="btn-press rounded-full bg-sky-deep px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Add room
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmReset(true)}
                      className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      Reset to resort defaults
                    </button>
                  </div>
                  <ul className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white">
                    {rooms.map((room) => (
                      <li
                        key={room.id}
                        className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={roomsMediaUrl(room.images[0] || "")}
                            alt=""
                            className="h-14 w-20 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{room.name}</p>
                            <p className="truncate text-xs text-ink/55">
                              {[room.size, room.max_capacity, room.price_per_night, room.status]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => startEdit(room)}
                          className="btn-press shrink-0 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold"
                        >
                          Edit
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <form onSubmit={(e) => void onSaveRoom(e)} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode("list");
                      setSelectedId(null);
                      setError(null);
                    }}
                    className="text-sm font-semibold text-sky-deep hover:underline"
                  >
                    ← Back to list
                  </button>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-ink">Room name</span>
                      <input
                        required
                        value={form.name ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className={inputClass}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-ink">Description</span>
                      <textarea
                        required
                        rows={5}
                        value={form.description ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Size</span>
                      <input
                        value={form.size ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                        placeholder="e.g. 20m²"
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Maximum capacity</span>
                      <input
                        value={form.max_capacity ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, max_capacity: e.target.value }))}
                        placeholder="e.g. 2 guests"
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Beds</span>
                      <input
                        value={form.beds ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, beds: e.target.value }))}
                        placeholder="e.g. Queen size bed"
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Price per night</span>
                      <input
                        value={form.price_per_night ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, price_per_night: e.target.value }))
                        }
                        placeholder="e.g. ₱2,500 / night"
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Extra person charges</span>
                      <input
                        value={form.extra_person_charge ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, extra_person_charge: e.target.value }))
                        }
                        placeholder="e.g. ₱500 / extra guest"
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Status</span>
                      <select
                        value={form.status === "unavailable" ? "unavailable" : "available"}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            status: e.target.value as RoomStatus,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-ink">
                        Room rules &amp; policies
                      </span>
                      <textarea
                        rows={3}
                        value={form.rules_policies ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, rules_policies: e.target.value }))
                        }
                        placeholder="Check-in/out, deposits, smoking, pets…"
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-ink">
                        Amenities (one per line or comma-separated)
                      </span>
                      <textarea
                        rows={4}
                        value={amenitiesText ?? ""}
                        onChange={(e) => setAmenitiesText(e.target.value)}
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                  </div>

                  {editorMode === "create" ? (
                    <div>
                      <p className="text-sm font-semibold text-ink">Primary image</p>
                      <input
                        ref={createFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setCreateFile(file);
                          if (createPreview) URL.revokeObjectURL(createPreview);
                          setCreatePreview(file ? URL.createObjectURL(file) : null);
                        }}
                      />
                      {createPreview ? (
                        <img
                          src={createPreview}
                          alt="New room preview"
                          className="mt-2 aspect-[16/10] w-full max-w-md rounded-xl object-cover"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => createFileRef.current?.click()}
                        className="btn-press mt-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold"
                      >
                        {createFile ? "Change image" : "Choose image"}
                      </button>
                    </div>
                  ) : selectedRoom ? (
                    <div>
                      <p className="text-sm font-semibold text-ink">Room images</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {selectedRoom.images.map((image, imageIndex) => (
                          <div key={`${selectedRoom.id}-img-${imageIndex}`} className="relative">
                            <img
                              src={roomsMediaUrl(image)}
                              alt=""
                              className="aspect-[4/3] w-full rounded-xl object-cover"
                            />
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  replaceImageIndex.current = imageIndex;
                                  replaceImageRef.current?.click();
                                }}
                                className="btn-press rounded-full border border-ink/15 px-2.5 py-1 text-[0.7rem] font-semibold disabled:opacity-60"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                disabled={busy || selectedRoom.images.length <= 1}
                                onClick={() => setConfirmImageDelete(imageIndex)}
                                className="btn-press rounded-full border border-red-200 px-2.5 py-1 text-[0.7rem] font-semibold text-red-700 disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <input
                        ref={addImagesRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => void onAddImages(e.target.files)}
                      />
                      <input
                        ref={replaceImageRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => void onReplaceImage(e.target.files)}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addImagesRef.current?.click()}
                        className="btn-press mt-3 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-60"
                      >
                        Add images
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 border-t border-ink/10 pt-4 sm:flex-row sm:justify-between">
                    {editorMode === "edit" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDelete(true)}
                        className="btn-press rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60"
                      >
                        Delete room
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setEditorMode("list");
                          setSelectedId(null);
                        }}
                        className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60"
                      >
                        {busy ? "Saving…" : editorMode === "create" ? "Create room" : "Save changes"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {confirmDelete ? (
                <ConfirmOverlay
                  title="Delete this room?"
                  message="This removes the room from the public Rooms & Apartments section."
                  confirmLabel="Delete room"
                  busy={busy}
                  onCancel={() => setConfirmDelete(false)}
                  onConfirm={() => void onConfirmDeleteRoom()}
                />
              ) : null}
              {confirmReset ? (
                <ConfirmOverlay
                  title="Reset rooms to resort defaults?"
                  message="This replaces the current catalog with the standard Jalyn's room list."
                  confirmLabel="Reset rooms"
                  busy={busy}
                  onCancel={() => setConfirmReset(false)}
                  onConfirm={() => void onConfirmReset()}
                />
              ) : null}
              {confirmImageDelete != null ? (
                <ConfirmOverlay
                  title="Delete this image?"
                  message="The room will keep its remaining images."
                  confirmLabel="Delete image"
                  busy={busy}
                  onCancel={() => setConfirmImageDelete(null)}
                  onConfirm={() => void onConfirmDeleteImage()}
                />
              ) : null}
            </Modal>,
            document.body,
          )
        : null}
    </main>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
  scrollRef,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={scrollRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative max-h-[min(92vh,900px)] w-full overflow-y-auto rounded-3xl bg-foam p-5 shadow-2xl sm:p-6 ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="btn-press rounded-full border border-ink/15 px-3 py-1.5 text-sm font-semibold"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmOverlay({
  title,
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center rounded-3xl bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h4 className="font-display text-xl text-ink">{title}</h4>
        <p className="mt-2 text-sm text-ink/70">{message}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="btn-press rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
