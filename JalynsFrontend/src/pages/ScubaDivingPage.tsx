import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import {
  ArrowRightIcon,
  BangkaIcon,
  CertificateIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DayTripIcon,
  DiveIcon,
  GroupIcon,
  HeartHandIcon,
  MailIcon,
  MoonIcon,
  PhoneIcon,
  PoolIcon,
  ResearchIcon,
  ShieldIcon,
  SpeedboatIcon,
  ThreeDivesIcon,
  WaveIcon,
} from "../components/Icons";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../lib/api";
import {
  formatPhMobileForDisplay,
  type ResortContactSettings,
} from "../lib/resortLocation";
import {
  createDivingRate,
  createPadiCourse,
  DEFAULT_PRICES_VALID_UNTIL,
  DEFAULT_SCUBA_CONTENT,
  DEFAULT_SCUBA_GALLERY,
  DEFAULT_SCUBA_HERO,
  deleteDivingRate,
  deletePadiCourse,
  deleteScubaGalleryImage,
  displayPrice,
  fetchDivingRates,
  fetchPadiCourses,
  fetchScubaContentBackground,
  fetchScubaGallery,
  fetchScubaHero,
  fetchScubaPageSettings,
  formatPricesValidUntil,
  MISSING_SCUBA_TABLES,
  pricesValidUntilToMonthInput,
  removeScubaContentBackground,
  removeScubaHero,
  replaceScubaGalleryImage,
  saveScubaPageSettings,
  subscribeScubaTables,
  updateDivingRate,
  updatePadiCourse,
  uploadScubaContentBackgroundWithResult,
  uploadScubaGalleryImages,
  uploadScubaHeroWithResult,
  type ScubaImage,
} from "../lib/scuba";
import type { DivingRate, PadiScubaCourse } from "../types/database";

const DEFAULT_CONTACT: ResortContactSettings = {
  contact_email: "jalynsresort@gmail.com",
  phone: "+639476197535",
  facebook_url: "https://www.facebook.com/jalynsresortpuertogalera",
};

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

const FEATURES = [
  { title: "Up to 3 Dives Daily", icon: ThreeDivesIcon },
  { title: "Night Dives Available", icon: MoonIcon },
  { title: "Full Day and Half Day Dive Trips", icon: DayTripIcon },
  { title: "Dive Groups range from 2–10 Divers", icon: GroupIcon },
  { title: "Own Bangka (outrigger) Dive Boat", icon: BangkaIcon },
  { title: "Speedboat Dive Boat", icon: SpeedboatIcon },
  { title: "Swimming Pool for Confined Water Training", icon: PoolIcon },
  { title: "PADI Scuba Courses from Beginners to Advanced", icon: CertificateIcon },
] as const;

type RateForm = { id?: number; service: string; price: string };
type CourseForm = { id?: number; course: string; details: string; price: string };
type BgKind = "hero" | "content";

const emptyRate: RateForm = { service: "", price: "" };
const emptyCourse: CourseForm = { course: "", details: "", price: "" };

const fieldClass =
  "w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/20";

const softCardClass =
  "rounded-2xl border border-white/35 bg-white/50 p-4 shadow-[0_16px_40px_rgba(8,18,28,0.12)] backdrop-blur-xl sm:rounded-3xl sm:bg-white/45 sm:p-7";

const darkCardClass =
  "rounded-2xl border border-white/10 bg-[#0b1d33] p-4 text-white shadow-[0_16px_40px_rgba(8,18,28,0.28)] sm:rounded-3xl sm:p-7";

const GALLERY_TRANSITION_MS = 420;
const GALLERY_SCALE = 0.92;


function isFallbackGallery(images: ScubaImage[]) {
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

export function ScubaDivingPage() {
  const navigate = useNavigate();
  const { role, approvalStatus, can } = useAuth();
  const canManage = can.canManageScubaDiving(role, approvalStatus);
  const perView = useGalleryPerView();

  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [hasCustomHero, setHasCustomHero] = useState(false);
  const [hasCustomContent, setHasCustomContent] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [gallery, setGallery] = useState<ScubaImage[]>([]);
  const [rates, setRates] = useState<DivingRate[]>([]);
  const [courses, setCourses] = useState<PadiScubaCourse[]>([]);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryFrom, setGalleryFrom] = useState<number | null>(null);
  const [galleryTo, setGalleryTo] = useState<number | null>(null);
  const [galleryZoomRun, setGalleryZoomRun] = useState(false);
  const galleryTouch = useRef<{ x: number; y: number } | null>(null);
  const galleryUnlockTimer = useRef<number | null>(null);
  const galleryRaf = useRef<number | null>(null);

  const [bgEditor, setBgEditor] = useState<BgKind | null>(null);
  const [rateForm, setRateForm] = useState<RateForm | null>(null);
  const [courseForm, setCourseForm] = useState<CourseForm | null>(null);
  const [deleteRate, setDeleteRate] = useState<DivingRate | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<PadiScubaCourse | null>(null);
  const [pricesValidUntil, setPricesValidUntil] = useState(DEFAULT_PRICES_VALID_UNTIL);
  const [validityOpen, setValidityOpen] = useState(false);
  const [validityMonth, setValidityMonth] = useState(() =>
    pricesValidUntilToMonthInput(DEFAULT_PRICES_VALID_UNTIL),
  );
  const [contact, setContact] = useState<ResortContactSettings>(DEFAULT_CONTACT);

  const heroInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacePath, setReplacePath] = useState<string | null>(null);

  const displayHero = heroUrl ?? (imagesReady ? DEFAULT_SCUBA_HERO : null);
  const displayContent = contentUrl ?? (imagesReady ? DEFAULT_SCUBA_CONTENT : null);
  const displayGallery = gallery.length ? gallery : DEFAULT_SCUBA_GALLERY;

  const galleryPages = useMemo(() => {
    if (!displayGallery.length) return [] as ScubaImage[][];
    const pages: ScubaImage[][] = [];
    for (let i = 0; i < displayGallery.length; i += perView) {
      pages.push(displayGallery.slice(i, i + perView));
    }
    return pages;
  }, [displayGallery, perView]);

  const pageCount = Math.max(1, galleryPages.length);
  const safeGalleryPage = Math.min(galleryPage, pageCount - 1);
  const counterPage = galleryTo != null ? galleryTo : safeGalleryPage;
  const counterStart = displayGallery.length ? counterPage * perView + 1 : 0;
  const counterEnd = displayGallery.length
    ? Math.min(counterPage * perView + perView, displayGallery.length)
    : 0;
  const canGalleryPrev = (galleryTo ?? safeGalleryPage) > 0;
  const canGalleryNext = (galleryTo ?? safeGalleryPage) < pageCount - 1;
  const galleryTransitioning = galleryFrom != null && galleryTo != null;

  const loadPricing = useCallback(async () => {
    const [rateResult, courseResult] = await Promise.all([fetchDivingRates(), fetchPadiCourses()]);
    setRates(rateResult.rows);
    setCourses(courseResult.rows);
    setRatesError(rateResult.error);
    setCoursesError(courseResult.error);
  }, []);

  const loadImages = useCallback(async () => {
    const [hero, content, storedGallery, settings] = await Promise.all([
      fetchScubaHero(),
      fetchScubaContentBackground(),
      fetchScubaGallery(),
      fetchScubaPageSettings(),
    ]);
    // Only apply defaults when nothing is saved — never overwrite a saved URL with default.
    setHeroUrl(hero.url);
    setContentUrl(content.url);
    setHasCustomHero(Boolean(hero.url));
    setHasCustomContent(Boolean(content.url));
    setGallery(storedGallery);
    setPricesValidUntil(settings.pricesValidUntil);
    setValidityMonth(pricesValidUntilToMonthInput(settings.pricesValidUntil));
    setImagesReady(true);
  }, []);

  const loadContact = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/contact/settings`);
      const body = (await res.json()) as {
        success?: boolean;
        settings?: ResortContactSettings;
      };
      if (body.settings) setContact(body.settings);
    } catch {
      // keep defaults shared with Contact Us
    }
  }, []);

  useEffect(() => {
    document.title = "Scuba Diving | Jalyn's Resort & Restaurant";
    return () => {
      document.title = "Jalyn's Resort & Restaurant | Puerto Galera";
    };
  }, []);

  useEffect(() => {
    void loadPricing();
    void loadImages();
    void loadContact();
  }, [loadPricing, loadImages, loadContact]);

  useEffect(() => subscribeScubaTables(() => void loadPricing()), [loadPricing]);

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
      preload.src = image.url;
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
        setLightbox((i) => (i == null ? i : (i + 1) % displayGallery.length));
      }
      if (event.key === "ArrowLeft") {
        setLightbox((i) => (i == null ? i : (i - 1 + displayGallery.length) % displayGallery.length));
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, displayGallery.length]);

  function goGallery(direction: -1 | 1) {
    if (galleryBusy) return;
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
    }, GALLERY_TRANSITION_MS);
  }

  function galleryPrev() {
    goGallery(-1);
  }

  function galleryNext() {
    goGallery(1);
  }

  function onGalleryTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
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
              {interactive && canManage && !image.path.startsWith("fallback-") ? (
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

  async function saveRate(event: FormEvent) {
    event.preventDefault();
    if (!rateForm) return;
    setBusy(true);
    setAdminError(null);
    const message = rateForm.id
      ? await updateDivingRate(rateForm.id, rateForm.service.trim(), rateForm.price.trim())
      : await createDivingRate(rateForm.service.trim(), rateForm.price.trim());
    if (message) setAdminError(message);
    else {
      setRateForm(null);
      await loadPricing();
    }
    setBusy(false);
  }

  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    if (!courseForm) return;
    setBusy(true);
    setAdminError(null);
    const message = courseForm.id
      ? await updatePadiCourse(
          courseForm.id,
          courseForm.course.trim(),
          courseForm.details.trim(),
          courseForm.price.trim(),
        )
      : await createPadiCourse(
          courseForm.course.trim(),
          courseForm.details.trim(),
          courseForm.price.trim(),
        );
    if (message) setAdminError(message);
    else {
      setCourseForm(null);
      await loadPricing();
    }
    setBusy(false);
  }

  async function confirmDeleteRate() {
    if (!deleteRate) return;
    setBusy(true);
    setAdminError(null);
    const message = await deleteDivingRate(deleteRate.id);
    if (message) setAdminError(message);
    else await loadPricing();
    setDeleteRate(null);
    setBusy(false);
  }

  async function confirmDeleteCourse() {
    if (!deleteCourse) return;
    setBusy(true);
    setAdminError(null);
    const message = await deletePadiCourse(deleteCourse.id);
    if (message) setAdminError(message);
    else await loadPricing();
    setDeleteCourse(null);
    setBusy(false);
  }

  async function onHeroFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setAdminError(null);
    setUploadProgress("Optimizing & uploading hero…");
    const result = await uploadScubaHeroWithResult(file);
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
    const result = await uploadScubaContentBackgroundWithResult(file);
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
    const message = await removeScubaHero();
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
    const message = await removeScubaContentBackground();
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
    const message = await uploadScubaGalleryImages(Array.from(fileList), (done, total) => {
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
    const message = await replaceScubaGalleryImage(replacePath, file);
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
    const message = await deleteScubaGalleryImage(path);
    if (message) setAdminError(message);
    else await loadImages();
    setBusy(false);
  }

  async function saveValidityDate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setAdminError(null);
    const label = formatPricesValidUntil(validityMonth);
    const message = await saveScubaPageSettings({ pricesValidUntil: label });
    if (message) setAdminError(message);
    else {
      setPricesValidUntil(label);
      setValidityOpen(false);
    }
    setBusy(false);
  }

  const tablesMissing =
    ratesError === MISSING_SCUBA_TABLES || coursesError === MISSING_SCUBA_TABLES;

  const counterLabel =
    perView === 1
      ? `${counterStart}/${displayGallery.length}`
      : `${counterStart}–${counterEnd} / ${displayGallery.length}`;

  return (
    <main className="overflow-x-clip bg-[#05080f] text-ink">
      <section className="relative min-h-[100svh] overflow-hidden text-white">
        <div className="absolute inset-0 bg-[#07101c]">
          {displayHero ? (
            <img
              src={displayHero}
              alt="Scuba diving in Puerto Galera"
              className="absolute inset-0 h-full w-full object-cover object-center animate-ken-burns"
              fetchPriority="high"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#07101c]/50 to-[#05080f]/80" />
          {canManage ? (
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
            canManage ? "pointer-events-none" : ""
          }`}
        >
          <p className="animate-fade-up text-[0.62rem] font-semibold tracking-[0.22em] text-white/75 uppercase sm:text-[0.72rem] sm:tracking-[0.28em]">
            Jalyn&apos;s Dive Center
          </p>
          <h1
            className="animate-fade-up mt-2.5 max-w-4xl font-display text-[2rem] leading-[1.08] text-white sm:mt-3 sm:text-5xl md:text-6xl lg:text-[4.35rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Scuba Diving in Puerto Galera
          </h1>
          <p
            className="animate-fade-up mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-white/85 sm:mt-4 sm:text-lg md:text-xl"
            style={{ animationDelay: "0.16s" }}
          >
            Promoting Responsible Ecotourism in our Marine Protected Areas
          </p>
          {canManage ? (
            <div
              className="pointer-events-auto mt-7 flex flex-wrap gap-2"
              style={{ animationDelay: "0.24s" }}
            >
              <button
                type="button"
                onClick={() => setBgEditor("hero")}
                className="btn-press animate-fade-up inline-flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/16"
              >
                Change hero background
              </button>
              <button
                type="button"
                onClick={() => setBgEditor("content")}
                className="btn-press animate-fade-up inline-flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/16"
              >
                Change content background
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="relative isolate">
        {/*
          Viewport-sized sticky backdrop: stays put while content scrolls over it.
          Not stretched to full content height (keeps image quality).
          No parallax / ken-burns — just a static scene behind the cards.
        */}
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
        {canManage && (adminError || tablesMissing || uploadProgress) ? (
          <div className="px-4 pt-5 sm:px-6 sm:pt-6 md:px-8 lg:px-10 xl:px-12">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {uploadProgress ? <p>{uploadProgress}</p> : null}
              {adminError ? <p className={uploadProgress ? "mt-2" : undefined}>{adminError}</p> : null}
              {tablesMissing ? (
                <div className={adminError || uploadProgress ? "mt-2" : undefined}>
                  <p>
                    Pricing tables are not set up yet. Run the scuba SQL once in Supabase, then
                    refresh this page.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href="https://supabase.com/dashboard/project/svxqrxduopqwggqbamhh/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press rounded-full bg-[#0b1d33] px-4 py-2 text-xs font-semibold text-white"
                    >
                      Open Supabase SQL Editor
                    </a>
                    <a
                      href="/SCUBA_DIVING.sql"
                      download
                      className="btn-press rounded-full border border-[#0b1d33]/20 bg-white px-4 py-2 text-xs font-semibold text-[#0b1d33]"
                    >
                      Download SCUBA_DIVING.sql
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="px-4 py-10 sm:px-6 sm:py-14 md:px-8 md:py-16 lg:px-10 xl:px-12">
          <div className={`${softCardClass} sm:p-8 lg:p-10`}>
            <Reveal className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-none lg:text-left">
              <div className="inline-flex items-center justify-center gap-2.5 lg:justify-start">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1d33]/10 text-[#0b1d33]">
                  <WaveIcon className="h-4 w-4" />
                </span>
                <p className="text-[0.7rem] font-semibold tracking-[0.28em] text-[#0b1d33] uppercase">
                  Marine Protected Areas
                </p>
              </div>
              <h2 className="mt-3 font-display text-[1.4rem] leading-snug text-[#0b1d33] sm:text-[1.85rem] md:text-[2.05rem]">
                Responsible Ecotourism: Protecting our oceans and marine life
              </h2>
            </Reveal>

            <div className="mt-9 grid items-start gap-9 lg:mt-11 lg:grid-cols-[minmax(15rem,0.82fr)_minmax(0,1.28fr)] lg:gap-12 xl:gap-16">
              {/* Left — logo / partner */}
              <Reveal delay={60} className="flex flex-col items-center text-center">
                <div className="w-full max-w-[17.5rem] rounded-2xl border border-[#0b1d33]/10 bg-white p-6 shadow-[0_10px_28px_rgba(11,29,51,0.08)] sm:max-w-[19rem] sm:p-7">
                  <a
                    href="https://divemindoro.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b1d33]"
                  >
                    <img
                      src="/images/blue-alliance-logo.png"
                      alt="Blue Alliance Philippines"
                      className="mx-auto h-auto w-full max-w-[13rem] object-contain sm:max-w-[14.5rem]"
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                  <p className="mt-5 text-[0.95rem] font-semibold tracking-wide text-[#0b1d33]">
                    Blue Alliance Philippines
                  </p>
                  <a
                    href="https://divemindoro.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-press mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0b1d33] px-5 py-2.5 text-[0.8rem] font-semibold text-white transition hover:bg-[#12304d]"
                  >
                    Learn More
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              </Reveal>

              {/* Right — content blocks */}
              <div className="min-w-0 space-y-8 text-left sm:space-y-9">
                <Reveal delay={100}>
                  <div>
                    <h3 className="text-[0.72rem] font-semibold tracking-[0.2em] text-[#0b1d33]/75 uppercase">
                      Our Commitment
                    </h3>
                    <p className="mt-3 text-[0.95rem] leading-[1.75] text-[#0b1d33]/90 sm:text-base">
                      Jalyn&apos;s Resort has pledged our{" "}
                      <span className="font-semibold text-[#0b1d33]">
                        ongoing support of Blue Alliance Philippines
                      </span>
                      , an NGO committed to safeguarding marine ecosystems and improving the lives
                      of coastal communities in North Oriental Mindoro, Philippines.
                    </p>
                  </div>
                </Reveal>

                <Reveal delay={140}>
                  <div className="border-t border-[#0b1d33]/12 pt-8 sm:pt-9">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b1d33]/10 text-[#0b1d33]">
                        <DiveIcon className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="text-[0.72rem] font-semibold tracking-[0.2em] text-[#0b1d33]/75 uppercase">
                        Responsible Diving
                      </h3>
                    </div>
                    <div className="mt-3 space-y-3.5 text-[0.95rem] leading-[1.75] text-[#0b1d33]/90 sm:text-base">
                      <p>
                        <span className="font-semibold text-[#0b1d33]">At Our Dive Center</span>, we
                        instruct divers how to follow best practices to minimize any harm to marine
                        life.
                      </p>
                      <p>
                        These best practices include both obvious and subtle steps, but they&apos;re
                        all crucial for maintaining the health and beauty of the North Oriental
                        Mindoro MPA network for future generations to enjoy.
                      </p>
                      <p>
                        We will also be hosting guest speakers to explain more about Blue Alliance
                        Philippines&apos; mission and motivations in protecting our most valuable
                        resource.
                      </p>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            {/* Contribution */}
            <Reveal delay={180}>
              <div className="mt-10 rounded-2xl border border-[#0b1d33]/12 bg-gradient-to-br from-[#0b1d33] via-[#12304d] to-[#0e4560] px-5 py-8 text-white shadow-[0_18px_40px_rgba(8,18,28,0.22)] sm:mt-12 sm:px-8 sm:py-9 md:px-10">
                <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
                  <div className="w-full max-w-xl text-center lg:text-left">
                    <p className="text-[0.68rem] font-semibold tracking-[0.24em] text-white/70 uppercase">
                      Your Contribution Matters
                    </p>
                    <p className="mt-3 font-display text-[1.55rem] leading-snug text-white sm:text-2xl">
                      Together, we can create a sustainable ocean future.
                    </p>
                    <div className="mt-6 inline-flex flex-col items-center rounded-2xl border border-white/20 bg-white/12 px-7 py-5 backdrop-blur-sm lg:items-start">
                      <span className="font-display text-4xl leading-none tracking-tight text-white sm:text-5xl">
                        ₱50
                      </span>
                      <span className="mt-2 text-[0.72rem] font-semibold tracking-[0.2em] text-white/80 uppercase">
                        per dive
                      </span>
                    </div>
                    <p className="mt-5 text-[0.9rem] leading-relaxed text-white/85 sm:text-[0.95rem]">
                      If each diver pledges just a small amount such as{" "}
                      <span className="font-semibold text-white">₱50 per dive</span>, these
                      donations will help in:
                    </p>
                  </div>

                  <ul className="grid w-full max-w-md gap-3 sm:grid-cols-2 lg:max-w-md lg:flex-1">
                    {(
                      [
                        { label: "Bolstering enforcement", Icon: ShieldIcon },
                        { label: "Fostering community development", Icon: GroupIcon },
                        { label: "Advancing scientific research", Icon: ResearchIcon },
                        { label: "Empowering local communities", Icon: HeartHandIcon },
                      ] as const
                    ).map(({ label, Icon }) => (
                      <li
                        key={label}
                        className="flex items-start gap-3 rounded-xl border border-white/12 bg-white/[0.08] px-3.5 py-3.5 text-left"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-white">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="pt-1 text-sm font-medium leading-snug text-white">
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Make a Difference */}
            <Reveal delay={220}>
              <div className="mt-8 rounded-2xl border border-[#0b1d33]/12 bg-white/70 px-5 py-6 text-center backdrop-blur-sm sm:mt-9 sm:px-8 sm:py-7 lg:text-left">
                <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-[#0b1d33]/75 uppercase">
                  Make a Difference
                </p>
                <p className="mx-auto mt-3 max-w-3xl text-[0.95rem] leading-[1.75] text-[#0b1d33]/90 sm:text-base lg:mx-0">
                  As someone who loves to explore the beauty of Marine Protected Areas,{" "}
                  <span className="inline-block rounded-md bg-[#0b1d33]/10 px-1.5 py-0.5 font-bold tracking-[0.08em] text-[#0b1d33]">
                    YOU
                  </span>{" "}
                  have the power to contribute to its preservation through responsible marine
                  ecotourism.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 sm:pb-14 md:px-8 md:pb-16 lg:px-10 xl:px-12">
          <div className={darkCardClass}>
            <Reveal className="max-w-3xl">
              <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-white/60 uppercase">
                Dive Center
              </p>
              <h2 className="mt-2 font-display text-[1.65rem] text-white sm:mt-3 sm:text-4xl md:text-5xl">
                Scuba Diving &amp; PADI Scuba Courses
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-6 text-[0.95rem] leading-relaxed text-white/85 sm:text-base lg:grid-cols-2 lg:gap-10">
              <Reveal delay={80}>
                <p>
                  Jalyn&apos;s Resort Scuba Diving Center offers everything from daily fun dives and
                  exciting night dives, to trips to the amazing Verde Island. You can also become a
                  PADI accredited scuba diver with our range of courses, including Discover Scuba
                  Diving, Open Water, and Advanced Open Water. If you&apos;ve never dived before,
                  the Discover Scuba course will have you diving in the open water in just a few
                  short hours!
                </p>
                <p className="mt-4">
                  Ask anyone who&apos;s dived in the Philippines about Puerto Galera and Sabang and
                  they&apos;ll tell you that it&apos;s among the top dive spots in the whole
                  country.
                </p>
              </Reveal>
              <Reveal delay={140}>
                <p>
                  The sheer amount of dive sites, their diversity, and close proximity (some are
                  literally a few minutes by boat) make diving in Puerto Galera a truly
                  unforgettable experience for both novices and experienced divers alike.
                </p>
                <p className="mt-4">
                  We&apos;ve got all the experience, equipment, and local knowledge needed to make
                  your Puerto Galera diving experience truly unforgettable. And competitive prices
                  too!
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 sm:pb-14 md:px-8 md:pb-16 lg:px-10 xl:px-12">
          <div className={softCardClass}>
            <Reveal className="mb-8">
              <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-[#0b1d33]/80 uppercase">
                The Dive Experience
              </p>
              <h2 className="mt-2 font-display text-[1.65rem] text-[#0b1d33] sm:mt-3 sm:text-4xl md:text-5xl">
                Diving Features
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Reveal key={feature.title} delay={index * 70} variant="up">
                    <article className="flex h-full items-start gap-4 rounded-2xl border border-[#0b1d33]/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0b1d33] text-white">
                        <Icon className="h-[1.15rem] w-[1.15rem]" />
                      </span>
                      <h3 className="pt-1.5 text-[0.95rem] font-semibold leading-snug text-[#0b1d33]">
                        {feature.title}
                      </h3>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 sm:pb-14 md:px-8 md:pb-16 lg:px-10 xl:px-12">
          <div className={softCardClass}>
            <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-[#0b1d33]/80 uppercase">
                  Underwater
                </p>
                <h2 className="mt-2 font-display text-[1.65rem] text-[#0b1d33] sm:mt-3 sm:text-4xl md:text-5xl">
                  Scuba Diving Gallery
                </h2>
              </div>
              {canManage ? (
                <div>
                  <input
                    ref={galleryInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(event) => void onGalleryFiles(event.target.files)}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => galleryInput.current?.click()}
                    className="btn-press rounded-full bg-[#0b1d33] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {uploadProgress?.startsWith("Uploading") ? uploadProgress : "Upload images"}
                  </button>
                </div>
              ) : null}
            </Reveal>

            {canManage && isFallbackGallery(displayGallery) ? (
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
                {/* Invisible size lock — keeps layout stable while images zoom */}
                <div className="invisible pointer-events-none" aria-hidden>
                  {renderGalleryPage(safeGalleryPage, false)}
                </div>

                {/* Settled / outgoing layer */}
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

                {/* Incoming layer */}
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

        <section className="px-4 pb-10 sm:px-6 sm:pb-14 md:px-8 md:pb-16 lg:px-10 xl:px-12">
          <div className={softCardClass}>
            <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-[#0b1d33]/80 uppercase">
                  Pricing
                </p>
                <h2 className="mt-2 font-display text-[1.65rem] text-[#0b1d33] sm:mt-3 sm:text-4xl md:text-5xl">
                  Diving &amp; Scuba Courses Rates
                </h2>
              </div>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setRateForm(emptyRate)}
                  className="btn-press rounded-full bg-[#0b1d33] px-4 py-2 text-sm font-semibold text-white"
                >
                  Add Service
                </button>
              ) : null}
            </Reveal>

            {ratesError && !canManage ? (
              <p className="rounded-2xl border border-[#0b1d33]/8 bg-white/80 p-5 text-sm text-stone">
                Pricing is being updated. Please contact us for current rates.
              </p>
            ) : ratesError && canManage ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {ratesError}
              </p>
            ) : rates.length === 0 ? (
              <p className="rounded-2xl border border-[#0b1d33]/8 bg-white/80 p-5 text-sm text-stone">
                {canManage
                  ? "No diving rates yet. Add a service to begin."
                  : "Pricing is being updated. Please contact us for current rates."}
              </p>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-2xl border border-[#0b1d33]/8 bg-white/85 shadow-sm backdrop-blur-sm md:block">
                  <table className="w-full table-fixed text-left text-sm lg:text-base">
                    <thead className="bg-[#0b1d33] text-xs tracking-wide text-white uppercase">
                      <tr>
                        <th className="px-4 py-3.5 font-semibold lg:px-6 lg:py-4">Service</th>
                        <th className="px-4 py-3.5 font-semibold lg:px-6 lg:py-4">Price</th>
                        {canManage ? (
                          <th className="w-[10.5rem] px-4 py-3.5 font-semibold lg:px-6 lg:py-4">
                            Actions
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((row) => (
                        <tr key={row.id} className="border-t border-[#0b1d33]/8">
                          <td className="px-4 py-3.5 text-[#0b1d33] lg:px-6 lg:py-4">
                            {row.service}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-[#0b1d33] lg:px-6 lg:py-4">
                            {displayPrice(row.price)}
                          </td>
                          {canManage ? (
                            <td className="px-4 py-3.5 lg:px-6 lg:py-4">
                              <InlineActions
                                busy={busy}
                                onEdit={() =>
                                  setRateForm({
                                    id: row.id,
                                    service: row.service,
                                    price: row.price,
                                  })
                                }
                                onDelete={() => setDeleteRate(row)}
                              />
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-3 md:hidden">
                  {rates.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-[#0b1d33]/8 bg-white/85 px-5 py-4 shadow-sm backdrop-blur-sm"
                    >
                      <p className="text-sm font-medium text-[#0b1d33]">{row.service}</p>
                      <p className="mt-1 text-lg font-semibold text-[#0b1d33]">
                        {displayPrice(row.price)}
                      </p>
                      {canManage ? (
                        <div className="mt-3">
                          <InlineActions
                            busy={busy}
                            onEdit={() =>
                              setRateForm({ id: row.id, service: row.service, price: row.price })
                            }
                            onDelete={() => setDeleteRate(row)}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-5 text-sm leading-relaxed text-[#0b1d33]/85">
              Prices are with own equipment.
              <br />
              Daily Gear Rental is ₱200.
            </p>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 sm:pb-14 md:px-8 md:pb-16 lg:px-10 xl:px-12">
          <div className={softCardClass}>
            <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-[#0b1d33]/80 uppercase">
                  Certification
                </p>
                <h2 className="mt-2 font-display text-[1.65rem] text-[#0b1d33] sm:mt-3 sm:text-4xl md:text-5xl">
                  PADI Scuba Courses
                </h2>
              </div>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setCourseForm(emptyCourse)}
                  className="btn-press rounded-full bg-[#0b1d33] px-4 py-2 text-sm font-semibold text-white"
                >
                  Add Course
                </button>
              ) : null}
            </Reveal>

            {coursesError && !canManage ? (
              <p className="rounded-2xl border border-[#0b1d33]/8 bg-white/80 p-5 text-sm text-stone">
                Course details are being updated. Please contact us for current information.
              </p>
            ) : coursesError && canManage ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {coursesError}
              </p>
            ) : courses.length === 0 ? (
              <p className="rounded-2xl border border-[#0b1d33]/8 bg-white/80 p-5 text-sm text-stone">
                {canManage
                  ? "No PADI courses yet. Add a course to begin."
                  : "Course details are being updated. Please contact us for current information."}
              </p>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-2xl border border-[#0b1d33]/8 bg-white/85 shadow-sm backdrop-blur-sm md:block">
                  <table className="w-full table-fixed text-left text-sm lg:text-base">
                    <thead className="bg-[#0b1d33] text-xs tracking-wide text-white uppercase">
                      <tr>
                        <th className="w-[22%] px-4 py-3.5 font-semibold lg:px-6 lg:py-4">Course</th>
                        <th className="px-4 py-3.5 font-semibold lg:px-6 lg:py-4">Details</th>
                        <th className="w-[18%] px-4 py-3.5 font-semibold lg:px-6 lg:py-4">Price</th>
                        {canManage ? (
                          <th className="w-[10.5rem] px-4 py-3.5 font-semibold lg:px-6 lg:py-4">
                            Actions
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((row) => (
                        <tr key={row.id} className="border-t border-[#0b1d33]/8">
                          <td className="px-4 py-3.5 font-medium text-[#0b1d33] lg:px-6 lg:py-4">
                            {row.course}
                          </td>
                          <td className="px-4 py-3.5 text-ink/70 lg:px-6 lg:py-4">{row.details}</td>
                          <td className="px-4 py-3.5 font-semibold break-words text-[#0b1d33] lg:px-6 lg:py-4">
                            {displayPrice(row.price)}
                          </td>
                          {canManage ? (
                            <td className="px-4 py-3.5 lg:px-6 lg:py-4">
                              <InlineActions
                                busy={busy}
                                onEdit={() =>
                                  setCourseForm({
                                    id: row.id,
                                    course: row.course,
                                    details: row.details,
                                    price: row.price,
                                  })
                                }
                                onDelete={() => setDeleteCourse(row)}
                              />
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-3 md:hidden">
                  {courses.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-[#0b1d33]/8 bg-white/85 px-5 py-4 shadow-sm backdrop-blur-sm"
                    >
                      <p className="font-semibold text-[#0b1d33]">{row.course}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink/70">{row.details}</p>
                      <p className="mt-2 text-lg font-semibold text-[#0b1d33]">
                        {displayPrice(row.price)}
                      </p>
                      {canManage ? (
                        <div className="mt-3">
                          <InlineActions
                            busy={busy}
                            onEdit={() =>
                              setCourseForm({
                                id: row.id,
                                course: row.course,
                                details: row.details,
                                price: row.price,
                              })
                            }
                            onDelete={() => setDeleteCourse(row)}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-[#0b1d33]/85">
                Prices valid until {pricesValidUntil}
              </p>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => {
                    setValidityMonth(pricesValidUntilToMonthInput(pricesValidUntil));
                    setValidityOpen(true);
                  }}
                  className="btn-press rounded-full border border-[#0b1d33]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#0b1d33]"
                >
                  Set date
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="px-4 pb-12 sm:px-6 sm:pb-16 md:px-8 md:pb-20 lg:px-10 xl:px-12">
          <div className={`${darkCardClass} mx-auto max-w-2xl text-center`}>
            <Reveal>
              <h2 className="font-display text-[1.65rem] text-white sm:text-4xl md:text-5xl">
                Need more info?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[0.92rem] leading-relaxed text-white/85 sm:mt-4 sm:text-base">
                If you&apos;d like to find out more about Jalyn&apos;s Resort&apos;s scuba diving
                services and facilities, please use the contact details below.
              </p>
              <div className="mt-7 space-y-5 sm:mt-8">
                <div>
                  <p className="text-[0.65rem] tracking-[0.18em] text-white/60 uppercase">Tel</p>
                  <a
                    href={telHref(contact.phone)}
                    className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 text-lg font-semibold text-white"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    {formatPhMobileForDisplay(contact.phone)}
                  </a>
                </div>
                <div>
                  <p className="text-[0.65rem] tracking-[0.18em] text-white/60 uppercase">Email</p>
                  <a
                    href={`mailto:${contact.contact_email}`}
                    className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 break-all text-base font-semibold text-white sm:text-lg"
                  >
                    <MailIcon className="h-4 w-4" />
                    {contact.contact_email}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/contact")}
                className="btn-press mt-7 inline-flex min-h-12 items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#0b1d33] transition hover:bg-white/90 sm:mt-8"
              >
                Contact Us
              </button>
            </Reveal>
          </div>
        </section>
        </div>
      </div>

      <Footer />

      {lightbox != null && displayGallery[lightbox] ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
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
                ? (displayHero ?? DEFAULT_SCUBA_HERO)
                : (displayContent ?? DEFAULT_SCUBA_CONTENT)
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

      {rateForm ? (
        <Modal title={rateForm.id ? "Edit service" : "Add service"} onClose={() => setRateForm(null)}>
          <form onSubmit={(event) => void saveRate(event)} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                Service
              </span>
              <input
                required
                value={rateForm.service}
                onChange={(event) => setRateForm({ ...rateForm, service: event.target.value })}
                className={fieldClass}
                placeholder="Private Dive"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                Price
              </span>
              <input
                required
                value={rateForm.price}
                onChange={(event) => setRateForm({ ...rateForm, price: event.target.value })}
                className={fieldClass}
                placeholder="₱3,000"
              />
            </label>
            <ModalActions busy={busy} onCancel={() => setRateForm(null)} submitLabel="Save" />
          </form>
        </Modal>
      ) : null}

      {courseForm ? (
        <Modal title={courseForm.id ? "Edit course" : "Add course"} onClose={() => setCourseForm(null)}>
          <form onSubmit={(event) => void saveCourse(event)} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                Course
              </span>
              <input
                required
                value={courseForm.course}
                onChange={(event) => setCourseForm({ ...courseForm, course: event.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                Details
              </span>
              <textarea
                required
                rows={3}
                value={courseForm.details}
                onChange={(event) => setCourseForm({ ...courseForm, details: event.target.value })}
                className={`${fieldClass} resize-y`}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                Price
              </span>
              <input
                required
                value={courseForm.price}
                onChange={(event) => setCourseForm({ ...courseForm, price: event.target.value })}
                className={fieldClass}
                placeholder="₱21,000"
              />
            </label>
            <ModalActions busy={busy} onCancel={() => setCourseForm(null)} submitLabel="Save" />
          </form>
        </Modal>
      ) : null}

      {validityOpen ? (
        <Modal title="Set prices valid until" onClose={() => setValidityOpen(false)}>
          <form onSubmit={(event) => void saveValidityDate(event)} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                Valid until
              </span>
              <input
                type="month"
                required
                value={validityMonth}
                onChange={(event) => setValidityMonth(event.target.value)}
                className={fieldClass}
              />
            </label>
            <p className="text-sm text-stone">
              Users will see:{" "}
              <strong className="text-ink">
                Prices valid until {formatPricesValidUntil(validityMonth)}
              </strong>
            </p>
            <ModalActions busy={busy} onCancel={() => setValidityOpen(false)} submitLabel="Save" />
          </form>
        </Modal>
      ) : null}

      {deleteRate ? (
        <Modal title="Delete service" onClose={() => setDeleteRate(null)}>
          <p className="text-sm text-stone">
            Delete <strong className="text-ink">{deleteRate.service}</strong> from diving rates?
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteRate(null)}
              className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmDeleteRate()}
              className="btn-press rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </Modal>
      ) : null}

      {deleteCourse ? (
        <Modal title="Delete course" onClose={() => setDeleteCourse(null)}>
          <p className="text-sm text-stone">
            Delete <strong className="text-ink">{deleteCourse.course}</strong> from PADI courses?
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteCourse(null)}
              className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmDeleteCourse()}
              className="btn-press rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function InlineActions({
  busy,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onEdit}
        className="btn-press rounded-full bg-sky px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-bright disabled:opacity-60 sm:text-sm"
      >
        Edit
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="btn-press rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 sm:text-sm"
      >
        Delete
      </button>
    </div>
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

function ModalActions({
  busy,
  onCancel,
  submitLabel,
}: {
  busy: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={busy}
        className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
