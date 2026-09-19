import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../lib/api";
import { useWheelScrollContain } from "../lib/useWheelScrollContain";
import {
  fetchNewsPosts,
  formatNewsDate,
  newsCategoryCounts,
  newsMediaUrl,
  type NewsPost,
} from "../lib/news";

/** Render article body with ## / ### headings, - lists, **bold**, and [links](url). */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[0].startsWith("**")) {
      nodes.push(
        <strong key={`b-${i++}`} className="font-semibold text-ink">
          {m[0].slice(2, -2)}
        </strong>,
      );
    } else {
      const href = m[3];
      const label = m[2];
      // Map legacy / WP scuba URLs to the in-app Scuba Diving nav route
      const to =
        href === "/scuba" ||
        href === "/scuba/" ||
        /^https?:\/\/(www\.)?jalynsresort\.com\/scuba-diving\/?$/i.test(href)
          ? "/scuba-diving"
          : href;
      if (to.startsWith("/")) {
        nodes.push(
          <Link
            key={`a-${i++}`}
            to={to}
            className="font-semibold text-[#1e6bb8] hover:underline"
          >
            {label}
          </Link>,
        );
      } else {
        nodes.push(
          <a
            key={`a-${i++}`}
            href={to}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#1e6bb8] hover:underline"
          >
            {label}
          </a>,
        );
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function ArticleBody({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const out: ReactNode[] = [];
    let para: string[] = [];
    let list: string[] = [];
    let key = 0;

    const flushPara = () => {
      if (!para.length) return;
      const t = para.join(" ").trim();
      if (t) out.push(<p key={`p-${key++}`}>{renderInline(t)}</p>);
      para = [];
    };
    const flushList = () => {
      if (!list.length) return;
      out.push(
        <ul key={`ul-${key++}`} className="my-1 list-disc space-y-1.5 pl-5 marker:text-sea">
          {list.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flushList();
        flushPara();
        continue;
      }
      if (line.startsWith("### ")) {
        flushList();
        flushPara();
        out.push(
          <h3 key={`h3-${key++}`} className="mt-6 font-display text-xl text-ink first:mt-0">
            {line.slice(4)}
          </h3>,
        );
        continue;
      }
      if (line.startsWith("## ")) {
        flushList();
        flushPara();
        out.push(
          <h2 key={`h2-${key++}`} className="mt-7 font-display text-2xl text-ink first:mt-0">
            {line.slice(3)}
          </h2>,
        );
        continue;
      }
      if (line.startsWith("- ")) {
        flushPara();
        list.push(line.slice(2));
        continue;
      }
      flushList();
      para.push(line);
    }
    flushList();
    flushPara();
    return out;
  }, [text]);

  return (
    <div className="space-y-4 text-[0.95rem] leading-relaxed text-ink/80 sm:text-base">
      {blocks}
    </div>
  );
}

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role, approvalStatus, can } = useAuth();
  const isAdmin = can.canManageMembers(role, approvalStatus);
  const [post, setPost] = useState<NewsPost | null>(null);
  const [allPosts, setAllPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const recentScrollRef = useWheelScrollContain<HTMLUListElement>();

  useEffect(() => {
    setLightbox(null);
  }, [id]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${getApiUrl()}/api/news/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as {
          success?: boolean;
          message?: string;
          post?: NewsPost;
        };
        const posts = await fetchNewsPosts();
        if (!alive) return;
        setAllPosts(posts);

        const found =
          body.post ?? posts.find((p) => p.id === id) ?? null;
        if (!found) {
          setError(body.message ?? "Post not found.");
          setPost(null);
          return;
        }
        setPost(found);
      } catch {
        if (alive) setError("Could not load this post.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [id]);

  const dateLabel = useMemo(() => {
    if (!post?.date) return "";
    const d = new Date(`${post.date}T12:00:00`);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [post?.date]);

  const dateParts = useMemo(() => {
    if (!post?.date) return null;
    return formatNewsDate(post.date);
  }, [post?.date]);

  const gallery = useMemo(() => {
    if (!post) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const src of [post.image, ...(post.gallery ?? [])]) {
      const u = (src || "").trim();
      if (!u || seen.has(u)) continue;
      seen.add(u);
      list.push(u);
    }
    return list;
  }, [post]);

  const featured = gallery[0] || post?.image || "";

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (gallery.length < 2) return;
      if (event.key === "ArrowRight") {
        setLightbox((i) => (i == null ? i : (i + 1) % gallery.length));
      }
      if (event.key === "ArrowLeft") {
        setLightbox((i) =>
          i == null ? i : (i - 1 + gallery.length) % gallery.length,
        );
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, gallery.length]);

  const counts = newsCategoryCounts(allPosts);
  const recent = useMemo(
    () => [...allPosts].sort((a, b) => b.date.localeCompare(a.date)),
    [allPosts],
  );
  const related = useMemo(() => {
    if (!post) return [];
    return allPosts.filter((p) => p.id !== post.id).slice(0, 3);
  }, [allPosts, post]);

  const neighbors = useMemo(() => {
    if (!post || allPosts.length < 2) return { prev: null as NewsPost | null, next: null as NewsPost | null };
    const sorted = [...allPosts].sort((a, b) => b.date.localeCompare(a.date));
    const idx = sorted.findIndex((p) => p.id === post.id);
    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [allPosts, post]);

  return (
    <main className="overflow-x-clip bg-[#f4f5f3] text-ink">
      <div className="bg-[#0a1210]">
        <Navbar />
        <div className={`h-16 sm:h-[4.25rem] ${isAdmin ? "sm:h-[4.75rem]" : ""}`} aria-hidden />
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
          <div className="min-w-0">
            <Link
              to="/news"
              className="inline-flex text-sm font-semibold text-ink/55 transition hover:text-sea"
            >
              ← Back to News
            </Link>

            {loading ? (
              <p className="mt-6 text-sm text-stone">Loading…</p>
            ) : error || !post ? (
              <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-red-700">{error ?? "Post not found."}</p>
                <Link
                  to="/news"
                  className="btn-press mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Back to News
                </Link>
              </div>
            ) : (
              <article className="mt-4">
                <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-sea uppercase">
                  {post.category}
                </p>
                <h1 className="mt-2 font-display text-[1.85rem] leading-tight text-ink sm:text-4xl md:text-[2.55rem]">
                  {post.title}
                </h1>
                {dateLabel ? (
                  <p className="mt-2 text-sm text-ink/55">Posted on {dateLabel}</p>
                ) : null}

                {/* Featured image + date badge — like live WP */}
                {featured ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(0)}
                    className="relative mt-5 block w-full overflow-hidden rounded-2xl bg-ink/5 text-left shadow-[0_12px_32px_rgba(12,18,16,0.08)] transition hover:opacity-[0.98]"
                    aria-label="View photo larger"
                  >
                    <div className="relative aspect-[16/10] sm:aspect-[2/1]">
                      <img
                        src={newsMediaUrl(featured)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        fetchPriority="high"
                        decoding="async"
                      />
                      {dateParts ? (
                        <div className="absolute top-3 left-3 flex flex-col items-center rounded-lg bg-white px-2.5 py-1.5 text-ink shadow-md">
                          <span className="text-lg leading-none font-semibold tabular-nums">
                            {dateParts.day}
                          </span>
                          <span className="mt-0.5 text-[0.62rem] font-semibold tracking-[0.12em] text-stone uppercase">
                            {dateParts.month}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                ) : null}

                {/* YouTube embed from live WP (e.g. school of Jacks dive video) */}
                {post.videoUrl ? (
                  <div className="relative mt-5 overflow-hidden rounded-2xl bg-ink shadow-[0_12px_32px_rgba(12,18,16,0.1)]">
                    <div className="relative aspect-[4/3] w-full sm:aspect-video">
                      <iframe
                        title={post.title}
                        src={post.videoUrl}
                        className="absolute inset-0 h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  </div>
                ) : null}

                {/* Full article — matches live WP content */}
                <div className="mt-6 rounded-2xl bg-white px-5 py-6 shadow-[0_10px_28px_rgba(12,18,16,0.05)] sm:px-8 sm:py-8">
                  <ArticleBody text={post.body || post.excerpt || ""} />

                  <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/8 pt-6">
                    <Link
                      to="/contact"
                      className="btn-press inline-flex rounded-full bg-sea px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink"
                    >
                      Contact us
                    </Link>
                    <Link
                      to="/news"
                      className="btn-press inline-flex rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink"
                    >
                      More news
                    </Link>
                  </div>
                </div>

                {/* Room / rate card with photo — after article like “see below for details” */}
                {post.packages && post.packages.length > 0 ? (
                  <section className="mt-8 sm:mt-10">
                    <h2 className="font-display text-2xl text-ink sm:text-3xl">
                      Details{post.price ? " & rates" : ""}
                    </h2>
                    <div className="mt-5 grid gap-5">
                      {post.packages.map((pkg) => (
                        <div
                          key={pkg.title}
                          className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(12,18,16,0.06)] lg:grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]"
                        >
                          <button
                            type="button"
                            className="relative aspect-[4/3] w-full bg-ink/5 lg:aspect-auto lg:min-h-[13rem]"
                            onClick={() => {
                              const src = pkg.image || post.image;
                              const idx = gallery.indexOf(src);
                              setLightbox(idx >= 0 ? idx : 0);
                            }}
                            aria-label={`View ${pkg.title} photo larger`}
                          >
                            <img
                              src={newsMediaUrl(pkg.image || post.image)}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </button>
                          <div className="flex flex-col px-5 py-5 sm:px-6">
                            <h3 className="font-display text-xl text-ink sm:text-2xl">
                              {pkg.title}
                            </h3>
                            {pkg.price ? (
                              <p className="mt-2 text-base font-semibold text-ink">
                                {pkg.price}
                              </p>
                            ) : null}
                            {pkg.amenities && pkg.amenities.length > 0 ? (
                              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                                {pkg.amenities.map((item) => (
                                  <li
                                    key={item}
                                    className="flex gap-2 text-sm leading-snug text-ink/75"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sea" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            <Link
                              to="/contact"
                              className="btn-press mt-5 inline-flex w-fit rounded-full bg-sea px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink"
                            >
                              Inquire about this
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Photo gallery */}
                {gallery.length > 1 ? (
                  <section className="mt-8">
                    <h2 className="font-display text-2xl text-ink">Photos</h2>
                    <p className="mt-1 text-sm text-ink/55">
                      {gallery.length} photos from this story
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                      {gallery.map((src, index) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setLightbox(index)}
                          aria-label={`View photo ${index + 1} of ${gallery.length}`}
                          className={`relative overflow-hidden rounded-xl bg-ink/5 shadow-sm transition hover:opacity-[0.96] ${
                            index === 0
                              ? "col-span-2 aspect-[16/9] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[14rem]"
                              : "aspect-[4/3]"
                          }`}
                        >
                          <img
                            src={newsMediaUrl(src)}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            loading={index < 3 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Prev / next like live WP */}
                {(neighbors.prev || neighbors.next) && (
                  <nav className="mt-10 flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:justify-between">
                    {neighbors.prev ? (
                      <Link
                        to={`/news/${neighbors.prev.id}`}
                        className="group max-w-xs text-left text-sm text-ink/70 transition hover:text-sea"
                      >
                        <span className="block text-[0.65rem] font-semibold tracking-wider text-stone uppercase">
                          Previous
                        </span>
                        <span className="mt-0.5 block font-medium text-ink group-hover:text-sea">
                          {neighbors.prev.title}
                        </span>
                      </Link>
                    ) : (
                      <span />
                    )}
                    {neighbors.next ? (
                      <Link
                        to={`/news/${neighbors.next.id}`}
                        className="group max-w-xs text-left text-sm text-ink/70 transition hover:text-sea sm:text-right"
                      >
                        <span className="block text-[0.65rem] font-semibold tracking-wider text-stone uppercase">
                          Next
                        </span>
                        <span className="mt-0.5 block font-medium text-ink group-hover:text-sea">
                          {neighbors.next.title}
                        </span>
                      </Link>
                    ) : null}
                  </nav>
                )}

                {related.length > 0 ? (
                  <section className="mt-10">
                    <h2 className="font-display text-2xl text-ink">More from the resort</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {related.map((item) => (
                        <Link
                          key={item.id}
                          to={`/news/${item.id}`}
                          className="group overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden">
                            <img
                              src={newsMediaUrl(item.image)}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="p-3.5">
                            <p className="text-[0.6rem] font-semibold tracking-[0.16em] text-stone uppercase">
                              {item.category}
                            </p>
                            <p className="mt-1 line-clamp-2 font-display text-[1.05rem] leading-snug text-ink">
                              {item.title}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}
              </article>
            )}
          </div>

          {/* Sidebar — like live news archive */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-xl bg-white p-4 shadow-[0_8px_22px_rgba(12,18,16,0.05)]">
                <h2 className="font-display text-lg text-ink">News Categories</h2>
                <ul className="mt-3 space-y-1 text-sm">
                  <li className="flex justify-between text-ink/75">
                    <span>Events</span>
                    <span className="tabular-nums text-stone">({counts.event})</span>
                  </li>
                  <li className="flex justify-between text-ink/75">
                    <span>News</span>
                    <span className="tabular-nums text-stone">({counts.news})</span>
                  </li>
                  <li className="flex justify-between text-ink/75">
                    <span>Special Offers</span>
                    <span className="tabular-nums text-stone">({counts.offer})</span>
                  </li>
                  <li>
                    <Link
                      to="/news"
                      className="mt-1 block font-semibold text-[#1e6bb8] hover:underline"
                    >
                      View all ({allPosts.length})
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-[0_8px_22px_rgba(12,18,16,0.05)]">
                <h2 className="font-display text-lg text-ink">Recent Posts</h2>
                <ul
                  ref={recentScrollRef}
                  className="mt-3 max-h-[min(42vh,20rem)] divide-y divide-ink/8 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]"
                >
                  {recent.map((item) => (
                    <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                      <Link
                        to={`/news/${item.id}`}
                        className="text-left text-sm leading-snug font-medium text-ink/80 transition hover:text-sea"
                      >
                        {item.title}
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

      {lightbox != null && gallery[lightbox]
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/88 p-4 sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-label="Photo viewer"
              onClick={() => setLightbox(null)}
            >
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 bg-black/70 text-2xl leading-none text-white shadow-lg"
                style={{
                  position: "fixed",
                  top: "max(0.85rem, env(safe-area-inset-top))",
                  right: "max(0.85rem, env(safe-area-inset-right))",
                  zIndex: 210,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(null);
                }}
                aria-label="Close photo"
              >
                ×
              </button>

              {gallery.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-2 z-[210] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white transition hover:bg-white/25 sm:left-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox(
                        (lightbox - 1 + gallery.length) % gallery.length,
                      );
                    }}
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 z-[210] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white transition hover:bg-white/25 sm:right-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox((lightbox + 1) % gallery.length);
                    }}
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                </>
              ) : null}

              <img
                src={newsMediaUrl(gallery[lightbox])}
                alt=""
                className="max-h-[min(90vh,900px)] max-w-[min(96vw,1100px)] rounded-lg object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />

              {gallery.length > 1 ? (
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white tabular-nums">
                  {lightbox + 1} / {gallery.length}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}
