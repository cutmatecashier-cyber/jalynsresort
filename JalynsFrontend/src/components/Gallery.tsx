import { Reveal } from "./Reveal";

const photos = [
  {
    id: "aerial",
    alt: "Aerial view of the resort cove",
    src: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=900&q=80",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    id: "diver",
    alt: "Scuba diver exploring coral reef",
    src: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=900&q=80",
    className: "",
  },
  {
    id: "food",
    alt: "Fresh seafood platter at the restaurant",
    src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80",
    className: "",
  },
  {
    id: "room",
    alt: "Bright guest room with ocean light",
    src: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80",
    className: "",
  },
  {
    id: "pool",
    alt: "Resort pool at golden hour",
    src: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=900&q=80",
    className: "hidden md:block",
  },
] as const;

export function Gallery() {
  return (
    <section id="gallery" className="bg-foam px-5 py-16 md:px-8 md:py-20 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-stone uppercase">
              Gallery
            </p>
            <h2 className="mt-2 font-display text-4xl text-ink md:text-5xl">
              Moments by the water
            </h2>
          </div>
          <a
            href="#gallery"
            className="text-sm font-semibold text-ink/70 underline-offset-4 transition hover:text-ink hover:underline"
          >
            View all photos
          </a>
        </Reveal>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:grid-rows-2 md:gap-3">
          {photos.map((photo, index) => (
            <Reveal
              key={photo.id}
              delay={index * 80}
              variant="scale"
              className={`${photo.className || "aspect-square"} ${
                photo.className.includes("row-span")
                  ? "aspect-auto min-h-[16rem] md:min-h-0"
                  : photo.className.includes("hidden")
                    ? "aspect-square"
                    : ""
              }`}
            >
              <figure className="group h-full overflow-hidden rounded-xl">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
