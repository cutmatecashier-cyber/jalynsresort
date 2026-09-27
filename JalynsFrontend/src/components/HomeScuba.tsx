import { useEffect, useState } from "react";
import { CONTENT_CHANGED_EVENT } from "./ContentSync";
import { HomeFeaturePreview, type HomeFeatureSlide } from "./HomeFeaturePreview";
import {
  DEFAULT_SCUBA_GALLERY,
  fetchScubaGallery,
  SCUBA_UPDATED_EVENT,
  type ScubaImage,
} from "../lib/scuba";

function toSlides(images: ScubaImage[]): HomeFeatureSlide[] {
  return images
    .filter((image) => image.url)
    .map((image) => ({
      id: image.path,
      src: image.url,
      alt: image.alt || "Scuba diving at Jalyn's Resort",
    }));
}

export function HomeScuba() {
  const [slides, setSlides] = useState<HomeFeatureSlide[]>(() => toSlides(DEFAULT_SCUBA_GALLERY));

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchScubaGallery().then((images) => {
        if (cancelled) return;
        setSlides(toSlides(images.length ? images : DEFAULT_SCUBA_GALLERY));
      });
    };
    load();
    window.addEventListener(SCUBA_UPDATED_EVENT, load);
    window.addEventListener(CONTENT_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(SCUBA_UPDATED_EVENT, load);
      window.removeEventListener(CONTENT_CHANGED_EVENT, load);
    };
  }, []);

  return (
    <HomeFeaturePreview
      id="home-scuba"
      eyebrow="Scuba Diving"
      title="Responsible Scuba Diving"
      cta={{ to: "/scuba-diving", label: "Dive centre" }}
      slides={slides}
    >
      <p>
        Jalyn&apos;s Resort has pledged our ongoing support of Blue Alliance Philippines, an NGO
        committed to safeguarding marine ecosystems and improving the lives of coastal communities
        in North Oriental Mindoro, Philippines. At Our Dive Center we instruct divers how to follow
        best practices to minimize any harm to marine life. We also host speakers from Blue
        Alliance, and encourage our guest divers to do their part to help further the protection of
        our incredible oceans and marine life.
      </p>
      <p>
        Jalyn&apos;s Resort Dive Center offers daily fun dives, night dives as well as half and full
        day dive trips to the world class scuba diving sites of Puerto Galera. At our fully-equipped
        Dive Center we also offer PADI Scuba Diving courses from beginners to advanced divers.
      </p>
      <p>
        Our Dive Center has direct access to the beautiful Mangrove Cove, and our Bangka (outrigger)
        and Speedboat Dive boats are always available. PADI students also benefit from being able to
        do confined water instruction in our beautifully maintained swimming pool.
      </p>
    </HomeFeaturePreview>
  );
}
