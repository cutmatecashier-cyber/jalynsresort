import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { SpaTreatmentsSection } from "../components/SpaTreatmentsSection";
import { useAuth } from "../context/AuthContext";

const HERO_IMG =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2400&q=80";

const CONTENT_IMG =
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=2000&q=80";

const moments = [
  {
    src: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    alt: "Restorative spa massage",
  },
  {
    src: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
    alt: "Hot stone spa treatment",
  },
  {
    src: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1200&q=80",
    alt: "Facial spa treatment",
  },
] as const;

export function SpaPage() {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditSpa(role, approvalStatus);
  const isAdmin = can.canManageMembers(role, approvalStatus);

  return (
    <main className="overflow-x-clip bg-[#0c1210] text-ink">
      <section className="relative min-h-[100svh] overflow-hidden text-white">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="Spa wellness at Jalyn's Resort"
            className="absolute inset-0 h-full w-full object-cover object-center animate-ken-burns"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#0c1210]/45 to-[#0c1210]/88" />
        </div>

        <Navbar />

        <div
          className={`relative z-10 flex min-h-[100svh] flex-col justify-end px-5 pb-14 sm:px-6 sm:pb-20 md:px-8 lg:px-10 xl:px-12 ${
            isAdmin ? "pt-40" : "pt-36"
          }`}
        >
          <p className="animate-fade-up text-[0.65rem] font-semibold tracking-[0.28em] text-white/70 uppercase">
            Jalyn&apos;s SPA
          </p>
          <h1
            className="animate-fade-up mt-3 max-w-3xl font-display text-[2.35rem] leading-[1.08] sm:text-5xl md:text-6xl lg:text-[4.1rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Spa Treatments
          </h1>
          <p
            className="animate-fade-up mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-lg"
            style={{ animationDelay: "0.16s" }}
          >
            Relax, refresh, and invigorate — massage and beauty treatments arranged through our
            partner Spa Center.
          </p>
        </div>
      </section>

      <div className="relative isolate">
        <div
          aria-hidden
          className="pointer-events-none sticky top-0 -z-10 h-[100svh] w-full overflow-hidden bg-[#14201c]"
        >
          <img
            src={CONTENT_IMG}
            alt=""
            className="h-full w-full object-cover object-center"
            loading="eager"
          />
          <div className="absolute inset-0 bg-[#0c1210]/68" />
        </div>

        <div className="relative z-0 -mt-[100svh] px-5 pt-10 pb-16 sm:px-6 sm:pt-12 sm:pb-20 md:px-8 lg:px-10 lg:pb-24 xl:px-12">
          <SpaTreatmentsSection canEdit={canEdit} />

          <Reveal delay={70} variant="up">
            <section className="mt-8 sm:mt-10">
              <div className="mb-5 sm:mb-6">
                <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-white/50 uppercase">
                  Atmosphere
                </p>
                <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                  Soft light. Quiet hands.
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                {moments.map((photo) => (
                  <figure
                    key={photo.src}
                    className="group overflow-hidden rounded-[1.25rem] aspect-[4/5] sm:aspect-[3/4]"
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </figure>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal delay={100} variant="up">
            <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/25 bg-white/10 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)] backdrop-blur-md sm:mt-10 sm:p-8 lg:p-10">
              <h2 className="font-display text-2xl text-white sm:text-3xl">Book a session</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                Message us or ask reception — we&apos;ll help you choose a treatment around diving,
                dinner, or a slow morning by the water.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/contact"
                  className="btn-press inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/92"
                >
                  Contact us
                </Link>
              </div>
            </section>
          </Reveal>
        </div>
      </div>

      <Footer />
    </main>
  );
}
