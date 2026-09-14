import { Reveal } from "./Reveal";

const posts = [
  {
    id: "dive-season",
    date: "Mar 18, 2026",
    category: "Scuba Diving",
    title: "Peak dive season returns to Mangrove Cove",
    excerpt:
      "Calm mornings and clear water make this month ideal for reef dives and first-time open-water guests.",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "kitchen",
    date: "Mar 4, 2026",
    category: "Restaurant",
    title: "Fresh catch nights at Jalyn’s Restaurant",
    excerpt:
      "Our kitchen highlights local seafood and slow evenings by the water — reserve a table for sunset.",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "stay",
    date: "Feb 20, 2026",
    category: "Resort",
    title: "Quiet mornings, longer stays",
    excerpt:
      "Guests are lingering longer this season — poolside breakfasts, spa hours, and unhurried afternoons.",
    image:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=900&q=80",
  },
] as const;

const offers = [
  {
    id: "weekday",
    label: "Stay Offer",
    title: "Weekday escape by the cove",
    text: "Quiet midweek stays with breakfast — perfect for a slower Puerto Galera reset.",
  },
  {
    id: "dive-package",
    label: "Scuba Package",
    title: "Dive & dine weekends",
    text: "Guided reef dives paired with dinner at Jalyn’s Restaurant for a full day on the water.",
  },
  {
    id: "events",
    label: "Events",
    title: "Private dinners & celebrations",
    text: "Intimate gatherings by the shore — birthdays, small reunions, and sunset tables.",
  },
] as const;

export function News() {
  return (
    <section id="news" className="bg-white px-5 py-16 sm:px-6 md:px-8 md:py-20 lg:px-10 xl:px-12">
      <div className="w-full">
        <Reveal className="mb-10 max-w-2xl">
          <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-stone uppercase">
            News, Offers and Events
          </p>
          <h2 className="mt-2 font-display text-4xl text-ink md:text-5xl">
            What’s happening at the resort
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/65 md:text-base">
            Latest updates, seasonal offers, and gatherings by the cove.
          </p>
        </Reveal>

        <div className="grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {posts.map((post, index) => (
            <Reveal key={post.id} delay={index * 90} variant="up">
              <article className="group">
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={post.image}
                    alt=""
                    className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="mt-4 text-[0.65rem] font-semibold tracking-[0.2em] text-stone uppercase">
                  {post.category}
                  <span className="mx-2 text-ink/25">·</span>
                  {post.date}
                </p>
                <h3 className="mt-2 font-display text-2xl leading-snug text-ink md:text-[1.65rem]">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65 md:text-[0.95rem]">
                  {post.excerpt}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        <div
          id="offers"
          className="mt-14 grid gap-8 border-t border-ink/10 pt-10 md:mt-16 md:grid-cols-3 md:gap-10 md:pt-12"
        >
          {offers.map((offer, index) => (
            <Reveal key={offer.id} delay={index * 90}>
              <article>
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-stone uppercase">
                  {offer.label}
                </p>
                <h3 className="mt-2 font-display text-2xl leading-snug text-ink md:text-[1.65rem]">
                  {offer.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65 md:text-[0.95rem]">
                  {offer.text}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
