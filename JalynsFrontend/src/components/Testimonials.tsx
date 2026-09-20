import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { createSiteReview, fetchSiteReviews, type SiteReview } from "../lib/siteReviews";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "./Icons";
import { Reveal } from "./Reveal";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

const PAGE_SIZE = 6;

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

function ReviewCard({ review }: { review: SiteReview }) {
  return (
    <article className="card-lift h-full rounded-2xl border border-ink/8 bg-foam p-5 hover:border-ink/15 hover:shadow-[0_12px_30px_rgba(12,18,16,0.06)]">
      <div>
        <h3 className="text-sm font-semibold text-ink">{review.guest_name}</h3>
        <div className="mt-1">
          <StarRating value={review.rating} size="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-stone">“{review.comment}”</p>
    </article>
  );
}

export function Testimonials() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const nameLocked = Boolean(profile?.name?.trim());

  useEffect(() => {
    if (profile?.name?.trim()) setName(profile.name.trim());
  }, [profile?.name]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      try {
        const next = await fetchSiteReviews();
        if (alive) setReviews(next);
      } catch {
        if (alive) setReviews([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const averageRating = useMemo(() => {
    if (!reviews.length) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  const pageCount = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = useMemo(
    () => reviews.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [reviews, safePage],
  );

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (rating < 1) {
      setFormError("Please choose a star rating.");
      return;
    }
    setSending(true);
    try {
      const result = await createSiteReview({
        guest_name: name.trim(),
        rating,
        comment: comment.trim(),
      });
      setReviews((prev) => [result.review, ...prev]);
      setFormSuccess(result.message);
      setComment("");
      setRating(0);
      if (!nameLocked) setName("");
      setPage(0);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save your review.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="bg-white px-5 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-10 xl:px-12">
      <div className="w-full">
        <Reveal>
          <h2 className="font-display text-3xl text-ink sm:text-4xl md:text-5xl">
            What Our Guests Say
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base">
            Share your stay — rate with stars and leave a short review for future guests.
          </p>
          {averageRating != null ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StarRating value={Math.round(averageRating)} size="h-5 w-5" />
              <p className="text-sm font-semibold text-ink">
                {averageRating.toFixed(1)} average · {reviews.length} review
                {reviews.length === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
        </Reveal>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          <Reveal delay={60} className="lg:col-span-4">
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
              <div>
                <label htmlFor="site-review-name" className="text-sm font-semibold text-ink">
                  Your name
                </label>
                <input
                  id="site-review-name"
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
                  <p className="mt-1.5 text-xs text-ink/45">Using your account name.</p>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-semibold text-ink">Your rating</p>
                <div className="mt-2">
                  <StarRating value={rating} onChange={setRating} interactive size="h-8 w-8" />
                </div>
                {rating > 0 ? (
                  <p className="mt-1.5 text-xs text-ink/45">{rating} of 5 stars</p>
                ) : (
                  <p className="mt-1.5 text-xs text-ink/45">Tap a star to rate</p>
                )}
              </div>

              <div>
                <label htmlFor="site-review-comment" className="text-sm font-semibold text-ink">
                  Your review
                </label>
                <textarea
                  id="site-review-comment"
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={5}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className={`${inputClass} resize-y`}
                  placeholder="Tell us about the rooms, diving, food, or staff…"
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
          </Reveal>

          <Reveal delay={100} className="lg:col-span-8">
            <h3 className="font-display text-xl text-ink sm:text-2xl">Guest reviews</h3>
            {loading ? (
              <p className="mt-4 text-sm text-ink/55">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <p className="mt-4 text-sm text-ink/55">
                No reviews yet. Be the first to share your experience.
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {visible.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
                {pageCount > 1 ? (
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={safePage <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 transition hover:border-ink/25 disabled:opacity-40"
                      aria-label="Previous reviews"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <p className="text-sm text-ink/55">
                      {safePage + 1} / {pageCount}
                    </p>
                    <button
                      type="button"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 transition hover:border-ink/25 disabled:opacity-40"
                      aria-label="Next reviews"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
