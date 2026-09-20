import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AdminEditButton } from "../components/AdminEditButton";
import { broadcastContentChanged } from "../components/ContentSync";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useWheelScrollContain } from "../lib/useWheelScrollContain";
import {
  createNewsPost,
  DEFAULT_NEWS_HERO,
  DEFAULT_NEWS_POSTS,
  deleteNewsPost,
  fetchNewsHero,
  fetchNewsPosts,
  formatNewsDate,
  newsCategoryCounts,
  newsMediaUrl,
  NEWS_HERO_UPDATED_EVENT,
  NEWS_UPDATED_EVENT,
  notifyNewsUpdated,
  removeNewsHero,
  updateNewsPost,
  uploadNewsHeroWithResult,
  uploadNewsImage,
  type NewsKind,
  type NewsPost,
} from "../lib/news";

const PAGE_SIZE = 10;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

type Filter = "all" | NewsKind;

const filterTabs: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "news", label: "News" },
  { id: "offer", label: "Special Offers" },
  { id: "event", label: "Events" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Short card blurb derived from the full article (no separate excerpt field). */
function excerptFromBody(body: string, max = 180) {
  const text = body.trim().replace(/\s+/g, " ");
  if (!text) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function NewsPage() {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditNews(role, approvalStatus);
  const recentScrollRef = useWheelScrollContain<HTMLUListElement>();

  const [posts, setPosts] = useState<NewsPost[]>(DEFAULT_NEWS_POSTS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);

  const [modal, setModal] = useState<"create" | NewsPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<NewsKind>("news");
  const [date, setDate] = useState(todayIso());
  const [price, setPrice] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const heroInput = useRef<HTMLInputElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [hasCustomHero, setHasCustomHero] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [heroEditorOpen, setHeroEditorOpen] = useState(false);
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);

  const displayHero = heroUrl ?? (imagesReady ? DEFAULT_NEWS_HERO : null);

  function scrollToPageTop() {
    // Match live WP archive (/page/2/): land at the top of the page, not mid-feed
    const lenis = (
      window as Window & {
        __lenis?: { scrollTo: (y: number, opts?: { immediate?: boolean }) => void };
      }
    ).__lenis;
    if (lenis?.scrollTo) {
      lenis.scrollTo(0, { immediate: true });
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function goToPage(next: number) {
    setPage(next);
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToPageTop);
    });
  }

  async function load() {
    try {
      const next = await fetchNewsPosts();
      setPosts(next);
      notifyNewsUpdated(next);
    } finally {
      setLoading(false);
    }
  }

  async function loadHero() {
    const hero = await fetchNewsHero();
    setHeroUrl(hero.url);
    setHasCustomHero(Boolean(hero.path));
    setImagesReady(true);
  }

  useEffect(() => {
    void load();
    void loadHero();
  }, []);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ posts?: NewsPost[] }>).detail;
      if (detail?.posts?.length) {
        setPosts(detail.posts);
        return;
      }
      void load();
    };
    window.addEventListener(NEWS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(NEWS_UPDATED_EVENT, onUpdated);
  }, []);

  useEffect(() => {
    const onHero = () => {
      void loadHero();
    };
    window.addEventListener(NEWS_HERO_UPDATED_EVENT, onHero);
    return () => window.removeEventListener(NEWS_HERO_UPDATED_EVENT, onHero);
  }, []);

  // Lenis steals wheel events — pause it while any news dialog is open so the form can scroll.
  useLayoutEffect(() => {
    if (!modal && !heroEditorOpen && !deleteTarget) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    lenis?.stop();

    const el = modalBodyRef.current;
    const onWheel = (event: WheelEvent) => {
      if (!el || el.scrollHeight <= el.clientHeight + 1) return;
      event.preventDefault();
      event.stopPropagation();
      el.scrollTop += event.deltaY;
    };
    el?.addEventListener("wheel", onWheel, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (saving || deleting || heroBusy) return;
      setModal(null);
      setHeroEditorOpen(false);
      setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      el?.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [modal, heroEditorOpen, deleteTarget, saving, deleting, heroBusy]);

  async function onHeroFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setHeroBusy(true);
    setHeroError(null);
    const result = await uploadNewsHeroWithResult(file);
    if (result.error) {
      setHeroError(result.error);
    } else {
      setHeroUrl(result.url);
      setHasCustomHero(Boolean(result.path));
      setHeroEditorOpen(false);
      broadcastContentChanged();
    }
    setHeroBusy(false);
    if (heroInput.current) heroInput.current.value = "";
  }

  async function onRemoveHero() {
    setHeroBusy(true);
    setHeroError(null);
    const error = await removeNewsHero();
    if (error) {
      setHeroError(error);
    } else {
      setHeroUrl(null);
      setHasCustomHero(false);
      setHeroEditorOpen(false);
      broadcastContentChanged();
    }
    setHeroBusy(false);
  }

  const counts = newsCategoryCounts(posts);

  const filtered = useMemo(() => {
    const list = filter === "all" ? posts : posts.filter((p) => p.kind === filter);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [filter, posts]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = useMemo(
    () => filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [filtered, safePage],
  );
  const recent = useMemo(
    () => [...posts].sort((a, b) => b.date.localeCompare(a.date)),
    [posts],
  );

  // Warm the browser cache for the current page of thumbnails
  useEffect(() => {
    for (const post of visible.slice(0, 6)) {
      const src = newsMediaUrl(post.image);
      if (!src) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    }
  }, [visible]);

  function setFilterAndReset(next: Filter) {
    setFilter(next);
    setPage(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToPageTop);
    });
  }

  function openCreate() {
    setModalError(null);
    setTitle("");
    setBody("");
    setKind("news");
    setDate(todayIso());
    setPrice("");
    setGallery([]);
    setImage("");
    setPreview(null);
    setFile(null);
    setModal("create");
  }

  function openEdit(post: NewsPost) {
    setModalError(null);
    setTitle(post.title);
    setBody(post.body || post.excerpt);
    setKind(post.kind);
    setDate(post.date);
    setPrice(post.price || "");
    setGallery(post.gallery?.length ? [...post.gallery] : []);
    setImage(post.image);
    setPreview(newsMediaUrl(post.image));
    setFile(null);
    setModal(post);
  }

  function onPickImage(next: File | null) {
    setFile(next);
    if (!next) {
      setPreview(image ? newsMediaUrl(image) : null);
      return;
    }
    setPreview(URL.createObjectURL(next));
  }

  async function onPickGallery(files: FileList | null) {
    if (!files?.length) return;
    setGalleryUploading(true);
    setModalError(null);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        uploaded.push(await uploadNewsImage(f));
      }
      setGallery((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not upload gallery photo.");
    } finally {
      setGalleryUploading(false);
      if (galleryFileRef.current) galleryFileRef.current.value = "";
    }
  }

  async function savePost(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      let imageUrl = image.trim();
      if (file) {
        imageUrl = await uploadNewsImage(file);
      }
      if (!imageUrl) throw new Error("Please upload a picture.");

      const article = body.trim();
      if (article.length < 10) throw new Error("Full article must be at least 10 characters.");

      const payload = {
        title: title.trim(),
        excerpt: excerptFromBody(article),
        body: article,
        image: imageUrl,
        kind,
        date,
        cta: "Read more",
        price: price.trim(),
        gallery,
        ...(modal !== "create" && modal?.packages ? { packages: modal.packages } : {}),
      };

      const next =
        modal === "create"
          ? await createNewsPost(payload)
          : modal
            ? await updateNewsPost(modal.id, payload)
            : null;

      if (next) {
        setPosts(next);
        notifyNewsUpdated(next);
        broadcastContentChanged();
      }
      setModal(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not save post.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setModalError(null);
    try {
      const next = await deleteNewsPost(deleteTarget.id);
      setPosts(next);
      notifyNewsUpdated(next);
      broadcastContentChanged();
      setDeleteTarget(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not delete post.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="overflow-x-clip bg-[#0a1210] text-ink">
      <section className="relative min-h-[100svh] overflow-hidden text-white">
        <div className="absolute inset-0 bg-[#0a1210]">
          {displayHero ? (
            <img
              src={newsMediaUrl(displayHero)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center animate-ken-burns"
              fetchPriority="high"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#0a1210]/45 to-[#0a1210]" />
          {canEdit ? (
            <button
              type="button"
              onClick={() => setHeroEditorOpen(true)}
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
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <p className="animate-fade-up text-[0.62rem] font-semibold tracking-[0.22em] text-white/75 uppercase sm:text-[0.72rem] sm:tracking-[0.28em]">
                From the resort
              </p>
              <h1
                className="animate-fade-up mt-2.5 font-display text-[2rem] leading-[1.08] text-white sm:mt-3 sm:text-5xl md:text-6xl lg:text-[4.1rem]"
                style={{ animationDelay: "0.08s" }}
              >
                News, Offers &amp; Events
              </h1>
              <p
                className="animate-fade-up mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-white/85 sm:mt-4 sm:text-lg"
                style={{ animationDelay: "0.16s" }}
              >
                Updates from Jalyn&apos;s — long-term stays, dive stories, festivals, and special
                offers in Puerto Galera.
              </p>
              {canEdit ? (
                <div className="pointer-events-auto mt-5">
                  <AdminEditButton
                    className="animate-fade-up"
                    onClick={() => setHeroEditorOpen(true)}
                    style={{ animationDelay: "0.22s" }}
                  >
                    Change hero background
                  </AdminEditButton>
                </div>
              ) : null}
            </div>
            {canEdit ? (
              <button
                type="button"
                onClick={openCreate}
                className="pointer-events-auto btn-press animate-fade-up shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/92"
                style={{ animationDelay: "0.22s" }}
              >
                Add news
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div
        id="news-feed"
        className="bg-[#f4f5f3] px-4 py-5 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-7"
      >
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">
            <div
              className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
              role="tablist"
              aria-label="News categories"
            >
              {filterTabs.map((tab) => {
                const selected = tab.id === filter;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setFilterAndReset(tab.id)}
                    className={`btn-press shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                      selected
                        ? "bg-ink text-white"
                        : "bg-white text-ink/70 ring-1 ring-ink/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {visible.length === 0 && !loading ? (
              <p className="mt-4 rounded-2xl bg-white px-5 py-8 text-center text-sm text-stone">
                No posts in this category yet
                {canEdit ? " — click Add news." : "."}
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
                {visible.map((post, index) => {
                  const { day, month } = formatNewsDate(post.date);
                  return (
                    <article
                      key={post.id}
                      className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_8px_22px_rgba(12,18,16,0.05)]"
                    >
                      <Link
                        to={`/news/${post.id}`}
                        className="relative aspect-[16/10] block overflow-hidden bg-ink/8"
                        aria-label={post.title}
                      >
                        <img
                          src={newsMediaUrl(post.image)}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          loading={index < 6 ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={index < 4 ? "high" : "auto"}
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-col items-center rounded-md bg-white px-2 py-1 text-ink shadow-md">
                          <span className="text-base leading-none font-semibold tabular-nums">
                            {day}
                          </span>
                          <span className="mt-0.5 text-[0.58rem] font-semibold tracking-[0.12em] text-stone uppercase">
                            {month}
                          </span>
                        </div>
                      </Link>

                        <div className="flex flex-1 flex-col px-4 py-3 sm:px-4 sm:py-3.5">
                          <p className="text-[0.58rem] font-semibold tracking-[0.18em] text-sea uppercase">
                            {post.category}
                            {post.price ? ` · ${post.price}` : ""}
                          </p>
                        <h2 className="mt-1 font-display text-[1.15rem] leading-snug text-ink sm:text-[1.25rem]">
                          <Link
                            to={`/news/${post.id}`}
                            className="transition hover:text-sea"
                          >
                            {post.title}
                          </Link>
                        </h2>
                        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-snug text-ink/65">
                          {post.excerpt}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                          <Link
                            to={`/news/${post.id}`}
                            className="btn-press text-sm font-semibold text-sea transition hover:text-ink"
                          >
                            Read more →
                          </Link>
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(post)}
                                className="text-xs font-semibold text-ink/60 hover:text-ink"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(post)}
                                className="text-xs font-semibold text-red-700 hover:underline"
                              >
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {pageCount > 1 ? (
              <nav
                className="mt-5 flex items-center justify-center gap-2"
                aria-label="News pages"
              >
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToPage(i)}
                    className={`btn-press inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition ${
                      i === safePage
                        ? "bg-ink text-white"
                        : "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink"
                    }`}
                    aria-current={i === safePage ? "page" : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
                <div className="rounded-xl bg-white p-4 shadow-[0_8px_22px_rgba(12,18,16,0.05)]">
                  <h2 className="font-display text-lg text-ink">News Categories</h2>
                  <ul className="mt-3 space-y-0.5">
                    {(
                      [
                        { id: "event" as const, label: "Events", count: counts.event },
                        { id: "news" as const, label: "News", count: counts.news },
                        {
                          id: "offer" as const,
                          label: "Special Offers",
                          count: counts.offer,
                        },
                      ] as const
                    ).map((cat) => {
                      const active = filter === cat.id;
                      return (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onClick={() => setFilterAndReset(cat.id)}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                              active
                                ? "bg-ink font-semibold text-white"
                                : "text-ink/75 hover:bg-mist hover:text-ink"
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`tabular-nums ${active ? "text-white/70" : "text-stone"}`}
                            >
                              ({cat.count})
                            </span>
                          </button>
                        </li>
                      );
                    })}
                    <li>
                      <button
                        type="button"
                        onClick={() => setFilterAndReset("all")}
                        className={`mt-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                          filter === "all"
                            ? "bg-mist font-semibold text-ink"
                            : "text-ink/60 hover:bg-mist hover:text-ink"
                        }`}
                      >
                        <span>View all</span>
                        <span className="tabular-nums text-stone">({posts.length})</span>
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-[0_8px_22px_rgba(12,18,16,0.05)]">
                  <h2 className="font-display text-lg text-ink">Recent Posts</h2>
                  <ul
                    ref={recentScrollRef}
                    className="mt-3 max-h-[min(42vh,20rem)] divide-y divide-ink/8 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]"
                  >
                    {recent.map((post) => (
                      <li key={post.id} className="py-2 first:pt-0 last:pb-0">
                        <Link
                          to={`/news/${post.id}`}
                          className="text-left text-sm leading-snug font-medium text-ink/80 transition hover:text-sea"
                        >
                          {post.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-[#0c1412] p-4 text-white">
                  <h2 className="font-display text-lg">Contact Us</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                    Jalyn&apos;s Resort
                    <br />
                    Western Nautical Hwy, Puerto Galera
                  </p>
                  <p className="mt-2 text-sm text-white/80">Smart: +63 947 619 7535</p>
                  <Link
                    to="/contact"
                    className="btn-press mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/92"
                  >
                    Message us
                  </Link>
                </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />

      {heroEditorOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Hero background image"
              onClick={() => !heroBusy && setHeroEditorOpen(false)}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-display text-xl text-ink">Hero background image</h3>
                <img
                  src={newsMediaUrl(displayHero ?? DEFAULT_NEWS_HERO)}
                  alt="Current hero"
                  className="mt-4 aspect-[16/7] w-full rounded-xl object-cover"
                />
                <p className="mt-3 text-sm text-ink/70">
                  Upload a new image to replace the News page hero. Removing it restores the
                  default photo.
                </p>
                {heroError ? (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    {heroError}
                  </p>
                ) : null}
                <input
                  ref={heroInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => void onHeroFile(event.target.files)}
                />
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setHeroEditorOpen(false)}
                    className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  {hasCustomHero ? (
                    <button
                      type="button"
                      disabled={heroBusy}
                      onClick={() => void onRemoveHero()}
                      className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      Remove image
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={heroBusy}
                    onClick={() => heroInput.current?.click()}
                    className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60"
                  >
                    {heroBusy ? "Uploading…" : hasCustomHero ? "Replace image" : "Upload image"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {modal
        ? createPortal(
            <div
              className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-label={modal === "create" ? "Add news" : "Edit news"}
              onClick={() => !saving && setModal(null)}
            >
              <form
                onSubmit={(e) => void savePost(e)}
                className="flex max-h-[min(92dvh,48rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  ref={modalBodyRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-3 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pt-6"
                >
                  <h3 className="font-display text-xl text-ink">
                    {modal === "create" ? "Add news" : "Edit news"}
                  </h3>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-ink" htmlFor="news-title">
                        Title
                      </label>
                      <input
                        id="news-title"
                        className={inputClass}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        minLength={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-ink" htmlFor="news-body">
                        Full article
                      </label>
                      <textarea
                        id="news-body"
                        className={`${inputClass} max-h-52 min-h-[10rem] resize-y overflow-y-auto`}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        required
                        minLength={10}
                        placeholder="Full story — a short preview is taken from this automatically"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-semibold text-ink" htmlFor="news-kind">
                          Category
                        </label>
                        <select
                          id="news-kind"
                          className={inputClass}
                          value={kind}
                          onChange={(e) => setKind(e.target.value as NewsKind)}
                        >
                          <option value="news">News</option>
                          <option value="offer">Special Offers</option>
                          <option value="event">Events</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-ink" htmlFor="news-date">
                          Date
                        </label>
                        <input
                          id="news-date"
                          type="date"
                          className={inputClass}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-ink" htmlFor="news-price">
                        Price / rate (optional)
                      </label>
                      <input
                        id="news-price"
                        className={inputClass}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. ₱18,000/month"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Cover picture</p>
                      {preview ? (
                        <img
                          src={preview}
                          alt=""
                          className="mt-2 h-40 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="mt-2 flex h-40 items-center justify-center rounded-xl bg-mist text-sm text-stone">
                          No image yet
                        </div>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="btn-press mt-2 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink"
                      >
                        {preview ? "Change picture" : "Upload picture"}
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Gallery photos</p>
                      <p className="mt-0.5 text-xs text-stone">
                        Extra room / amenity photos shown on the detail page.
                      </p>
                      {gallery.length > 0 ? (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {gallery.map((src) => (
                            <div key={src} className="relative aspect-square overflow-hidden rounded-lg">
                              <img
                                src={newsMediaUrl(src)}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setGallery((g) => g.filter((u) => u !== src))}
                                className="absolute top-1 right-1 rounded-full bg-black/60 px-1.5 text-[0.65rem] font-semibold text-white"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <input
                        ref={galleryFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="sr-only"
                        onChange={(e) => void onPickGallery(e.target.files)}
                      />
                      <button
                        type="button"
                        disabled={galleryUploading}
                        onClick={() => galleryFileRef.current?.click()}
                        className="btn-press mt-2 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                      >
                        {galleryUploading ? "Uploading…" : "Add gallery photos"}
                      </button>
                    </div>
                  </div>
                  {modalError ? (
                    <p className="mt-3 text-sm font-medium text-red-700">{modalError}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-ink/8 bg-white px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setModal(null)}
                    className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-press rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}

      {deleteTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm delete"
              onClick={() => !deleting && setDeleteTarget(null)}
            >
              <div
                className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-display text-xl text-ink">Delete this post?</h3>
                <p className="mt-2 text-sm text-stone">{deleteTarget.title}</p>
                {modalError ? (
                  <p className="mt-3 text-sm font-medium text-red-700">{modalError}</p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                    className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void confirmDelete()}
                    className="btn-press rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}
