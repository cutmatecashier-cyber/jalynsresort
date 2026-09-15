import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { StarIcon } from "../components/Icons";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { RestaurantMenuSection } from "../components/RestaurantMenuSection";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../lib/api";

const PAGE_BG =
  "url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2400&q=80)";

const featuredQuotes = [
  "Food is great. We never had anything we didn’t like. Breakfast is superb. Good serving portions and delicious.",
  "Breakfast is good…well served. Should try all the breakfast…but what I like most is the Filipino food. Very efficient when serving the food.",
  "Free breakfast meal! Was great! Good selection to choose from, all 4 orders came out together hot and fresh.",
  "The food and service were so good, staff and chef were so entertaining and hospitable.",
] as const;

type GuestReview = {
  id: string;
  guest_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

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

export function RestaurantPage() {
  const { role, approvalStatus, can } = useAuth();
  const isAdmin = can.canManageMembers(role, approvalStatus);
  const canEditMenu = can.canEditRestaurantMenu(role, approvalStatus);

  const [guestReviews, setGuestReviews] = useState<GuestReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setReviewsLoading(true);
      try {
        const res = await fetch(`${getApiUrl()}/api/reviews/restaurant`);
        const body = (await res.json()) as {
          success?: boolean;
          reviews?: GuestReview[];
        };
        if (active && Array.isArray(body.reviews)) setGuestReviews(body.reviews);
      } catch {
        // keep empty — featured quotes still show
      } finally {
        if (active) setReviewsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
      const res = await fetch(`${getApiUrl()}/api/reviews/restaurant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: name.trim(),
          rating,
          comment: comment.trim(),
        }),
      });
      const body = (await res.json()) as {
        message?: string;
        review?: GuestReview;
      };
      if (!res.ok) {
        setFormError(body.message ?? "Could not save your review.");
        return;
      }
      setFormSuccess(body.message ?? "Thank you! Your review has been posted.");
      if (body.review) {
        setGuestReviews((prev) => [body.review!, ...prev]);
      }
      setName("");
      setRating(0);
      setComment("");
    } catch {
      setFormError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setSending(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-white/50 bg-white/88 p-6 shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-8 lg:p-10";

  const inputClass =
    "mt-2 w-full rounded-xl border border-ink/12 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

  return (
    <main className="relative isolate min-h-screen bg-black text-ink">
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: PAGE_BG }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/55 to-black/85"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-sky-deep/15" aria-hidden />

      <section className="relative text-white">
        <Navbar />
        <div
          className={`relative z-10 w-full px-5 pb-12 sm:px-6 sm:pb-14 md:px-8 lg:px-10 xl:px-12 ${
            isAdmin ? "pt-40 sm:pt-44 lg:pt-48" : "pt-36 sm:pt-40 lg:pt-44"
          }`}
        >
          <p className="animate-fade-up text-[0.65rem] font-medium tracking-[0.28em] text-sky-bright uppercase">
            Dining at the cove
          </p>
          <h1 className="animate-fade-up font-display mt-2 text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Jalyn&apos;s Restaurant
          </h1>
          <p className="animate-fade-up mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            When you&apos;re enjoying the peace and quiet here at Jalyn&apos;s, you don&apos;t want
            to be venturing off to find good food and drinks. Jalyn&apos;s Restaurant offers a
            range of freshly cooked local and international dishes at extremely competitive
            prices.
          </p>
        </div>
      </section>

      <div className="relative z-10 w-full px-5 pb-14 sm:px-6 sm:pb-16 md:px-8 lg:px-10 lg:pb-20 xl:px-12">
        <Reveal variant="up">
          <section className={cardClass}>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">About the restaurant</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone sm:text-base">
              With breathtaking views and a relaxed atmosphere, the dining experience at Jalyn&apos;s
              is unique and delicious — local and international dishes prepared fresh for resort
              guests and visitors.
            </p>
          </section>
        </Reveal>

        <RestaurantMenuSection canEdit={canEditMenu} cardClass={cardClass} />

        <Reveal delay={60} variant="up">
        <section className={`mt-8 sm:mt-10 ${cardClass}`}>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            Jalyn&apos;s Restaurant Reviews
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-stone sm:text-base">
            Share your dining experience — rate with stars and leave a short review.
          </p>

          <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <form
              onSubmit={onSubmitReview}
              className="space-y-6 lg:col-span-5 xl:col-span-4"
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
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-ink">Your rating</p>
                <div className="mt-2">
                  <StarRating value={rating} onChange={setRating} interactive size="h-8 w-8" />
                </div>
                {rating > 0 ? (
                  <p className="mt-1.5 text-xs text-stone">{rating} of 5 stars</p>
                ) : (
                  <p className="mt-1.5 text-xs text-stone">Tap a star to rate</p>
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

            <div className="flex flex-col gap-10 border-t border-ink/8 pt-10 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12 xl:col-span-8 xl:pl-16">
              <div>
                <h3 className="font-display text-xl text-ink sm:text-2xl">Guest reviews</h3>
                {reviewsLoading ? (
                  <p className="mt-4 text-sm text-stone">Loading reviews…</p>
                ) : guestReviews.length === 0 ? (
                  <p className="mt-4 text-sm text-stone">
                    No guest reviews yet — be the first to share your experience.
                  </p>
                ) : (
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 xl:gap-5">
                    {guestReviews.map((r, index) => (
                      <Reveal key={r.id} delay={index * 70} variant="up">
                        <li className="card-lift rounded-xl border border-ink/8 bg-foam/80 px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-ink">{r.guest_name}</p>
                            <StarRating value={r.rating} size="h-3.5 w-3.5" />
                          </div>
                          <p className="mt-2.5 text-sm leading-relaxed text-ink/80">
                            “{r.comment}”
                          </p>
                          <p className="mt-2.5 text-[0.65rem] tracking-wide text-ink/35 uppercase">
                            {new Date(r.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </li>
                      </Reveal>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-display text-xl text-ink sm:text-2xl">Featured comments</h3>
                <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 xl:gap-5">
                  {featuredQuotes.map((quote, index) => (
                    <Reveal key={quote.slice(0, 32)} delay={index * 70} variant="up">
                      <li className="card-lift rounded-xl border border-ink/8 bg-foam/80 px-5 py-4 text-sm leading-relaxed text-ink/80">
                        “{quote}”
                      </li>
                    </Reveal>
                  ))}
                </ul>
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
        </section>
        </Reveal>
      </div>

      <Footer />
    </main>
  );
}
