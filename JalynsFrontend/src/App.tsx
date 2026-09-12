import { Footer } from "./components/Footer";
import { Gallery } from "./components/Gallery";
import { Hero } from "./components/Hero";
import { Rooms } from "./components/Rooms";
import { Services } from "./components/Services";
import { Testimonials } from "./components/Testimonials";
import { WhyStay } from "./components/WhyStay";

function App() {
  return (
    <main className="bg-foam">
      <Hero />
      <Services />
      <Rooms />
      <WhyStay />
      <Testimonials />
      <Gallery />
      <section id="news" className="sr-only" aria-hidden="true" />
      <Footer />
    </main>
  );
}

export default App;
