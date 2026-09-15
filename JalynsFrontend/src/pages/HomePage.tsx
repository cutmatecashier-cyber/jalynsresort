import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Gallery } from "../components/Gallery";
import { Hero } from "../components/Hero";
import { News } from "../components/News";
import { Rooms } from "../components/Rooms";
import { Services } from "../components/Services";
import { Testimonials } from "../components/Testimonials";
import { WhyStay } from "../components/WhyStay";
import { useAuth } from "../context/AuthContext";

/** Existing homepage — signed-in identity lives in the hero side for staff. */
export function HomePage() {
  const { isApproved } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#diving") {
      navigate("/scuba-diving", { replace: true });
    } else if (hash === "#spa") {
      navigate("/spa", { replace: true });
    }
  }, [navigate]);

  return (
    <main className="bg-foam">
      <Hero />
      <Services />
      <Rooms />
      <Testimonials />
      <Gallery />
      <News />
      <WhyStay />
      <Footer />

      <span className="sr-only">{isApproved ? "staff" : "guest"}</span>
    </main>
  );
}
