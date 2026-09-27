import { createPortal } from "react-dom";
import { GalleryPager } from "./GalleryPager";

type Slide = { url: string; alt: string };

type GalleryLightboxProps = {
  images: Slide[];
  index: number;
  onClose: () => void;
  onSelect: (index: number) => void;
};

const edgeButton = {
  position: "fixed" as const,
  top: "max(0.85rem, env(safe-area-inset-top))",
  zIndex: 210,
};

export function GalleryLightbox({ images, index, onClose, onSelect }: GalleryLightboxProps) {
  const image = images[index];
  if (!image || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 pt-20"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery image"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        className="inline-flex h-11 items-center rounded-full border-2 border-white bg-black/80 px-4 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
        style={{ ...edgeButton, right: "max(0.85rem, env(safe-area-inset-right))" }}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        Close
      </button>
      <img
        src={image.url}
        alt={image.alt}
        className="max-h-[86vh] max-w-full rounded-xl object-contain"
        onClick={(event) => event.stopPropagation()}
      />
      {images.length > 1 ? (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2"
          onClick={(event) => event.stopPropagation()}
        >
          <GalleryPager count={images.length} active={index} tone="light" onSelect={onSelect} />
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
