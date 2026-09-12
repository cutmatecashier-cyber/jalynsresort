import { Footer } from "../components/Footer";
import { Gallery } from "../components/Gallery";
import { Hero } from "../components/Hero";
import { Rooms } from "../components/Rooms";
import { Services } from "../components/Services";
import { Testimonials } from "../components/Testimonials";
import { WhyStay } from "../components/WhyStay";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../lib/permissions";

/** Existing homepage — staff strip shows identity + sign out only. */
export function HomePage() {
  const { isApproved, role, approvalStatus, can, profile, signOut } = useAuth();
  const showStaff = can.canViewDashboardExtras(role, approvalStatus);

  return (
    <main className="bg-foam">
      {showStaff ? (
        <div className="relative z-50 border-b border-white/10 bg-black text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-2.5 text-sm sm:px-6 md:px-8 lg:px-10">
            <p className="min-w-0 truncate text-white/85">
              Signed in as <span className="font-semibold text-sky">{profile?.name}</span>
              <span className="text-white/50"> · </span>
              {roleLabel(role)}
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="shrink-0 rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-semibold transition hover:bg-white/10 sm:text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      <Hero />
      <Services />
      <Rooms />
      <WhyStay />
      <Testimonials />
      <Gallery />
      <section id="news" className="sr-only" aria-hidden="true" />
      <Footer />

      <span className="sr-only">{isApproved ? "staff" : "guest"}</span>
    </main>
  );
}
