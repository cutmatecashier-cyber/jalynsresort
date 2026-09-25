import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { AdminEditButton } from "../components/AdminEditButton";
import { Footer } from "../components/Footer";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "../components/Icons";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { RestaurantMenuSection } from "../components/RestaurantMenuSection";
import { useAuth } from "../context/AuthContext";
import {
  createRestaurantReview,
  DEFAULT_RESTAURANT_CONTENT,
  DEFAULT_RESTAURANT_HERO,
  deleteRestaurantReviewReply,
  fetchRestaurantContentBackground,
  fetchRestaurantHero,
  fetchRestaurantReviews,
  removeRestaurantContentBackground,
  removeRestaurantHero,
  replyToRestaurantReview,
  subscribeRestaurantBackgrounds,
  uploadRestaurantContentBackgroundWithResult,
  uploadRestaurantHeroWithResult,
  type RestaurantReview,
} from "../lib/restaurant";

type BgKind = "hero" | "content";

function StarRating({
  value,
  onChange,
  interactive = false,
  size = "h-5 w-5",
}: {
  value: number;
  onChange?: (n: number) => void;
  interactive?: boolean;
  size?: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = interactive && hover > 0 ? hover : value;

  return (
    <div
      className="flex gap-1"
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Star rating" : `${value} out of 5 stars`}
      onMouseLeave={() => interactive && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        if (!interactive) {
          return (
            <StarIcon
              key={n}
              className={`${size} ${filled ? "text-amber-500" : "text-ink/20"}`}
            />
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="btn-press rounded p-0.5 transition hover:scale-110"
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onClick={() => onChange?.(n)}
          >
            <StarIcon className={`${size} ${filled ? "text-amber-500" : "text-ink/25"}`} />
          </button>
        );
      })}
    </div>
  );
}

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const REVIEWS_PER_PAGE = 4;

function ReviewCard({
  review,
  canManage,
  busy,
  softText,
  onViewMore,
  onReply,
  onDeleteReply,
}: {
  review: RestaurantReview;
  canManage: boolean;
  busy: boolean;
  softText: string;
  onViewMore: () => void;
  onReply: () => void;
  onDeleteReply: () => void;
}) {
  const hasReply = Boolean(review.admin_reply?.trim());

  return (
    <li
      className={`flex h-[9rem] flex-col overflow-hidden rounded-xl border bg-white px-4 py-2.5 ${
        hasReply ? "border-sky-deep/25 ring-1 ring-sky-deep/10" : "border-ink/10"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">{review.guest_name}</p>
          {hasReply ? (
            <span className="shrink-0 rounded bg-sky-deep/10 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-sky-deep uppercase">
              Replied
            </span>
          ) : null}
        </div>
        <StarRating value={review.rating} size="h-3.5 w-3.5" />
      </div>

      <p
        className={`mt-1 min-h-0 flex-1 text-sm leading-relaxed text-ink/90 ${
          hasReply ? "line-clamp-1" : "line-clamp-2"
        }`}
      >
        “{review.comment}”
      </p>

      {hasReply ? (
        <p className="mt-0.5 truncate text-xs text-sky-deep/90">
          Admin: “{review.admin_reply}”
        </p>
      ) : null}

      <div className="mt-1.5 flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className={`truncate text-[0.65rem] tracking-wide uppercase ${softText}`}>
            {formatReviewDate(review.created_at)}
          </p>
          <button
            type="button"
            onClick={onViewMore}
            className="btn-press shrink-0 text-xs font-semibold text-sky-deep hover:underline"
          >
            View more
          </button>
        </div>
        {hasReply ? (
          canManage ? (
            <button
              type="button"
              disabled={busy}
              onClick={onDeleteReply}
              className="btn-press shrink-0 text-[0.65rem] font-semibold text-red-700 hover:underline disabled:opacity-60"
            >
              Delete
            </button>
          ) : null
        ) : canManage ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReply}
            className="btn-press shrink-0 text-xs font-semibold text-sky-deep hover:underline disabled:opacity-60"
          >
            Reply
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function RestaurantPage() {
  const { role, approvalStatus, can, profile } = useAuth();
  const canManage = can.canManageRestaurantPage(role, approvalStatus);
  const canEditMenu = can.canEditRestaurantMenu(role, approvalStatus);

  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [hasCustomHero, setHasCustomHero] = useState(false);
  const [hasCustomContent, setHasCustomContent] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [bgEditor, setBgEditor] = useState<BgKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const heroInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLInputElement>(null);

  const [guestReviews, setGuestReviews] = useState<RestaurantReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(0);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const nameLocked = Boolean(profile?.name?.trim());

  const [replyTarget, setReplyTarget] = useState<RestaurantReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteReplyTarget, setDeleteReplyTarget] = useState<RestaurantReview | null>(null);
  const [viewReview, setViewReview] = useState<RestaurantReview | null>(null);

  const displayHero = heroUrl ?? (imagesReady ? DEFAULT_RESTAURANT_HERO : null);
  const displayContent = contentUrl ?? (imagesReady ? DEFAULT_RESTAURANT_CONTENT : null);

  const averageRating = useMemo(() => {
    if (!guestReviews.length) return null;
    const sum = guestReviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / guestReviews.length) * 10) / 10;
  }, [guestReviews]);

  const reviewPageCount = Math.max(1, Math.ceil(guestReviews.length / REVIEWS_PER_PAGE));
  const safeReviewsPage = Math.min(reviewsPage, reviewPageCount - 1);
  const reviewCounterStart = guestReviews.length ? safeReviewsPage * REVIEWS_PER_PAGE + 1 : 0;
  const reviewCounterEnd = guestReviews.length
    ? Math.min(safeReviewsPage * REVIEWS_PER_PAGE + REVIEWS_PER_PAGE, guestReviews.length)
    : 0;
  const canReviewsPrev = safeReviewsPage > 0;
  const canReviewsNext = safeReviewsPage < reviewPageCount - 1;
  const visibleReviews = useMemo(
    () =>
      guestReviews.slice(
        safeReviewsPage * REVIEWS_PER_PAGE,
        safeReviewsPage * REVIEWS_PER_PAGE + REVIEWS_PER_PAGE,
      ),
    [guestReviews, safeReviewsPage],
  );
  const reviewCounterLabel =
    reviewCounterStart === reviewCounterEnd
      ? `${reviewCounterStart} / ${guestReviews.length}`
      : `${reviewCounterStart}–${reviewCounterEnd} / ${guestReviews.length}`;

  useEffect(() => {
    setReviewsPage((current) => Math.min(current, Math.max(0, reviewPageCount - 1)));
  }, [reviewPageCount]);

  const loadImages = useCallback(async () => {
    const [hero, content] = await Promise.all([
      fetchRestaurantHero(),
      fetchRestaurantContentBackground(),
    ]);
    setHeroUrl(hero.url);
    setContentUrl(content.url);
    setHasCustomHero(Boolean(hero.path));
    setHasCustomContent(Boolean(content.path));
    setImagesReady(true);
  }, []);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const reviews = await fetchRestaurantReviews();
      setGuestReviews(reviews);
    } catch {
      setGuestReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImages();
    void loadReviews();
  }, [loadImages, loadReviews]);

  useEffect(() => subscribeRestaurantBackgrounds(() => void loadImages()), [loadImages]);

  useEffect(() => {
    if (profile?.name?.trim()) setName(profile.name.trim());
  }, [profile?.name]);

  useEffect(() => {
    document.title = "Restaurant | Jalyn's Resort & Restaurant";
    return () => {
      document.title = "Jalyn's Resort & Restaurant | Puerto Galera";
    };
  }, []);

  async function onHeroFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setAdminError(null);
    setUploadProgress("Optimizing & uploading hero…");
    const result = await uploadRestaurantHeroWithResult(file);
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
    const result = await uploadRestaurantContentBackgroundWithResult(file);
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
    const message = await removeRestaurantHero();
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
    const message = await removeRestaurantContentBackground();
    if (message) setAdminError(message);
    else {
      setContentUrl(null);
      setHasCustomContent(false);
      setBgEditor(null);
    }
    setBusy(false);
  }

  async function onSubmitReview(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (rating < 1 || rating > 5) {
      setFormError("Please choose a star rating from 1 to 5.");
      return;
    }

    setSending(true);
    try {
      const result = await createRestaurantReview({
        guest_name: name.trim(),
        rating,
        comment: comment.trim(),
      });
      setFormSuccess(result.message);
      setGuestReviews((prev) => [result.review, ...prev]);
      if (!nameLocked) setName("");
      setRating(0);
      setComment("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save your review.");
    } finally {
      setSending(false);
    }
  }

  async function onSubmitReply(e: FormEvent) {
    e.preventDefault();
    if (!replyTarget) return;
    setReplyError(null);
    setBusy(true);
    const { review, error } = await replyToRestaurantReview(replyTarget.id, replyText);
    if (error || !review) {
      setReplyError(error ?? "Could not save reply.");
      setBusy(false);
      return;
    }
    setGuestReviews((prev) => prev.map((r) => (r.id === review.id ? review : r)));
    setReplyTarget(null);
    setReplyText("");
    setBusy(false);
  }

  async function onConfirmDeleteReply() {
    if (!deleteReplyTarget) return;
    setBusy(true);
    setAdminError(null);
    const { review, error } = await deleteRestaurantReviewReply(deleteReplyTarget.id);
    if (error || !review) setAdminError(error ?? "Could not delete reply.");
    else setGuestReviews((prev) => prev.map((r) => (r.id === review.id ? review : r)));
    setDeleteReplyTarget(null);
    setBusy(false);
  }

  const cardClass =
    "rounded-2xl border border-white/35 bg-white/50 text-ink shadow-[0_16px_40px_rgba(8,18,28,0.12)] backdrop-blur-xl sm:rounded-3xl sm:bg-white/45";

  const inputClass =
    "mt-2 w-full rounded-xl border border-ink/12 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

  const mutedText = "text-ink/70";
  const softText = "text-ink/55";

  return (
    <main className="overflow-x-clip bg-[#05080f] text-ink">
      <section className="relative min-h-[100svh] overflow-hidden text-white">
        <div className="absolute inset-0 bg-[#07101c]">
          {displayHero ? (
            <img
              src={displayHero}
              alt="Jalyn's Restaurant dining"
              className="absolute inset-0 h-full w-full object-cover object-center"
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
            Dining at the cove
          </p>
          <h1
            className="animate-fade-up mt-2.5 max-w-4xl font-display text-[2rem] leading-[1.08] text-white sm:mt-3 sm:text-5xl md:text-6xl lg:text-[4.35rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Jalyn&apos;s Restaurant
          </h1>
          <p
            className="animate-fade-up mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-white/85 sm:mt-4 sm:text-lg md:text-xl"
            style={{ animationDelay: "0.16s" }}
          >
            Freshly cooked local and international dishes — so you can stay by the cove without
            heading out for a meal.
          </p>
          {canManage ? (
            <div
              className="pointer-events-auto mt-7 flex flex-wrap gap-2"
              style={{ animationDelay: "0.24s" }}
            >
              <AdminEditButton
                className="animate-fade-up"
                onClick={() => setBgEditor("hero")}
              >
                Change hero background
              </AdminEditButton>
              <AdminEditButton
                className="animate-fade-up"
                onClick={() => setBgEditor("content")}
              >
                Change content background
              </AdminEditButton>
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
          {canManage && (adminError || uploadProgress) ? (
            <div className="px-4 pt-5 sm:px-6 sm:pt-6 md:px-8 lg:px-10 xl:px-12">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {uploadProgress ? <p>{uploadProgress}</p> : null}
                {adminError ? (
                  <p className={uploadProgress ? "mt-2" : undefined}>{adminError}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="relative w-full px-5 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-16 md:px-8 lg:px-10 lg:pb-20 xl:px-12">
            <section className={`${cardClass} p-6 sm:p-8 lg:p-10`}>
              <Reveal variant="up">
                <h2 className="font-display text-2xl text-ink sm:text-3xl">About the restaurant</h2>
                <p className={`mt-2 max-w-3xl text-sm leading-relaxed sm:text-base ${mutedText}`}>
                  With breathtaking views and a relaxed atmosphere, the dining experience at
                  Jalyn&apos;s is unique and delicious — local and international dishes prepared
                  fresh for resort guests and visitors.
                </p>
              </Reveal>
            </section>

            <RestaurantMenuSection canEdit={canEditMenu} cardClass={`${cardClass} p-6 sm:p-8 lg:p-10`} />

            <section className={`mt-8 sm:mt-10 ${cardClass} p-6 sm:p-8 lg:p-10`}>
              <Reveal delay={60} variant="up">
                <h2 className="font-display text-2xl text-ink sm:text-3xl">Customer Reviews</h2>
                <p className={`mt-2 max-w-3xl text-sm sm:text-base ${mutedText}`}>
                  Share your dining experience — rate with stars and leave a short review.
                </p>

                {averageRating != null ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <StarRating value={Math.round(averageRating)} size="h-5 w-5" />
                    <p className="text-sm font-semibold text-ink">
                      {averageRating.toFixed(1)} average · {guestReviews.length} review
                      {guestReviews.length === 1 ? "" : "s"}
                    </p>
                  </div>
                ) : null}

                <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-12">
                  <form
                    onSubmit={onSubmitReview}
                    className="space-y-6 lg:col-span-4"
                  >
                    <div>
                      <label htmlFor="review-name" className="text-sm font-semibold text-ink">
                        Your name
                      </label>
                      <input
                        id="review-name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Maria"
                        autoComplete="name"
                        readOnly={nameLocked}
                        aria-readonly={nameLocked}
                      />
                      {nameLocked ? (
                        <p className={`mt-1.5 text-xs ${softText}`}>Using your account name.</p>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink">Your rating</p>
                      <div className="mt-2">
                        <StarRating value={rating} onChange={setRating} interactive size="h-8 w-8" />
                      </div>
                      {rating > 0 ? (
                        <p className={`mt-1.5 text-xs ${softText}`}>{rating} of 5 stars</p>
                      ) : (
                        <p className={`mt-1.5 text-xs ${softText}`}>Tap a star to rate</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="review-comment" className="text-sm font-semibold text-ink">
                        Your review
                      </label>
                      <textarea
                        id="review-comment"
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={6}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className={`${inputClass} resize-y`}
                        placeholder="Tell us about the food, service, or atmosphere…"
                      />
                    </div>

                    {formError ? (
                      <p className="text-sm font-medium text-red-700" role="alert">
                        {formError}
                      </p>
                    ) : null}
                    {formSuccess ? (
                      <p className="text-sm font-medium text-emerald-700" role="status">
                        {formSuccess}
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={sending}
                      className="btn-press inline-flex w-full justify-center rounded-full bg-sky-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky disabled:opacity-60 sm:w-auto sm:px-8"
                    >
                      {sending ? "Posting…" : "Post review"}
                    </button>
                  </form>

                  <div className="flex flex-col gap-8 border-t border-ink/8 pt-10 lg:col-span-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10 xl:pl-12">
                    <div>
                      <h3 className="font-display text-xl text-ink sm:text-2xl">Guest reviews</h3>
                      {reviewsLoading ? (
                        <p className={`mt-4 text-sm ${mutedText}`}>Loading reviews…</p>
                      ) : guestReviews.length === 0 ? (
                        <p className={`mt-4 text-sm ${mutedText}`}>
                          No reviews yet. Be the first to share your experience.
                        </p>
                      ) : (
                        <>
                          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
                            {visibleReviews.map((r) => (
                              <ReviewCard
                                key={r.id}
                                review={r}
                                canManage={canManage}
                                busy={busy}
                                softText={softText}
                                onViewMore={() => setViewReview(r)}
                                onReply={() => {
                                  setReplyTarget(r);
                                  setReplyText("");
                                  setReplyError(null);
                                }}
                                onDeleteReply={() => setDeleteReplyTarget(r)}
                              />
                            ))}
                          </ul>

                          {guestReviews.length > 0 ? (
                            <div className="mt-5 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => setReviewsPage((p) => Math.max(0, p - 1))}
                                disabled={!canReviewsPrev}
                                aria-label="Previous reviews"
                                className="btn-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-white text-ink transition hover:bg-sky-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                <ChevronLeftIcon className="h-5 w-5" />
                              </button>
                              <p className="min-w-[4.5rem] text-center text-sm font-semibold tracking-wide text-ink tabular-nums">
                                {reviewCounterLabel}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewsPage((p) => Math.min(reviewPageCount - 1, p + 1))
                                }
                                disabled={!canReviewsNext}
                                aria-label="Next reviews"
                                className="btn-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-white text-ink transition hover:bg-sky-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                <ChevronRightIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>

                    <div>
                      <Link
                        to="/contact"
                        className="btn-press inline-flex rounded-full border border-ink/15 bg-white/80 px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/30"
                      >
                        Contact Us
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            </section>
          </div>

          <Footer />
        </div>
      </div>

      {bgEditor ? (
        <Modal
          title={bgEditor === "hero" ? "Hero background image" : "Content background image"}
          onClose={() => setBgEditor(null)}
        >
          <img
            src={
              bgEditor === "hero"
                ? (displayHero ?? DEFAULT_RESTAURANT_HERO)
                : (displayContent ?? DEFAULT_RESTAURANT_CONTENT)
            }
            alt="Current background"
            className="aspect-[16/7] w-full rounded-xl object-cover"
          />
          <p className="mt-3 text-sm text-ink/70">
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

      {replyTarget ? (
        <Modal
          title="Reply to review"
          onClose={() => {
            setReplyTarget(null);
            setReplyText("");
            setReplyError(null);
          }}
        >
          <p className="text-sm text-ink/70">
            Replying to <span className="font-semibold text-ink">{replyTarget.guest_name}</span>
          </p>
          <p className="mt-2 rounded-lg bg-foam/80 px-3 py-2 text-sm text-ink/80">
            “{replyTarget.comment}”
          </p>
          <form onSubmit={(e) => void onSubmitReply(e)} className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Your reply</span>
              <textarea
                required
                minLength={2}
                maxLength={1000}
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className={`${inputClass} resize-y`}
                placeholder="Thank you for your feedback…"
              />
            </label>
            {replyError ? (
              <p className="text-sm font-medium text-red-700" role="alert">
                {replyError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setReplyTarget(null);
                  setReplyText("");
                  setReplyError(null);
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
                {busy ? "Posting…" : "Post reply"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteReplyTarget ? (
        <Modal title="Delete reply" onClose={() => setDeleteReplyTarget(null)}>
          <p className="text-sm text-ink/70">
            Are you sure you want to delete this reply? The customer review will not be removed.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteReplyTarget(null)}
              className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onConfirmDeleteReply()}
              className="btn-press rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Delete reply"}
            </button>
          </div>
        </Modal>
      ) : null}

      {viewReview ? (
        <Modal title="Guest review" onClose={() => setViewReview(null)} wide>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{viewReview.guest_name}</p>
            <StarRating value={viewReview.rating} size="h-4 w-4" />
          </div>
          <p className={`mt-2 text-xs tracking-wide uppercase ${softText}`}>
            {formatReviewDate(viewReview.created_at)}
          </p>
          <p className="mt-4 max-h-[min(50vh,22rem)] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/90">
            “{viewReview.comment}”
          </p>
          {viewReview.admin_reply ? (
            <div className="mt-5 rounded-xl border border-sky-deep/20 bg-sky-deep/8 px-4 py-3">
              <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-sky-deep uppercase">
                Admin reply
              </p>
              <p className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/90">
                “{viewReview.admin_reply}”
              </p>
              <p className={`mt-2 text-xs ${softText}`}>
                — {viewReview.admin_reply_name?.trim() || "Admin"}
                {viewReview.admin_reply_at
                  ? ` · ${formatReviewDate(viewReview.admin_reply_at)}`
                  : ""}
              </p>
            </div>
          ) : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {canManage && !viewReview.admin_reply ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setReplyTarget(viewReview);
                  setReplyText("");
                  setReplyError(null);
                  setViewReview(null);
                }}
                className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold text-sky-deep disabled:opacity-60"
              >
                Reply
              </button>
            ) : null}
            {canManage && viewReview.admin_reply ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDeleteReplyTarget(viewReview);
                  setViewReview(null);
                }}
                className="btn-press rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                Delete reply
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setViewReview(null)}
              className="btn-press rounded-full bg-sky-deep px-4 py-2.5 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full rounded-2xl bg-white p-5 text-ink shadow-xl sm:p-6 ${
          wide ? "max-w-lg" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
