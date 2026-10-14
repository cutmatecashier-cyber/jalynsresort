import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { useMediaReady } from "../lib/useMediaReady";

type BlockProps = {
  className?: string;
  dark?: boolean;
};

/** Opaque placeholder with a light shimmer. Stays still when reduced motion is on. */
export function Skeleton({ className = "", dark = false }: BlockProps) {
  return (
    <span
      aria-hidden
      className={`skeleton-block ${dark ? "skeleton-block-dark" : ""} ${className}`.trim()}
    />
  );
}

/** Photo slot that stays a skeleton until the file is decoded, then paints immediately. */
export function ReadyImage({
  src,
  className = "",
  alt = "",
  style,
  dark = false,
  loading,
  ...imgProps
}: ImgHTMLAttributes<HTMLImageElement> & { src: string; dark?: boolean }) {
  const lazy = loading === "lazy";
  const rootRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(!lazy);
  useEffect(() => {
    if (!lazy) {
      setInView(true);
      return;
    }
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, src]);
  const ready = useMediaReady(src, false, inView);
  const positioned = className.includes("absolute");
  return (
    <span
      ref={rootRef}
      className={`${positioned ? "" : "relative"} block overflow-hidden ${className}`}
      style={style}
    >
      {ready ? (
        <img src={src} alt={alt} loading={loading} className="h-full w-full object-cover" {...imgProps} />
      ) : (
        <Skeleton
          className={`absolute inset-0 h-full w-full rounded-[inherit] ${dark ? "skeleton-block-dark" : ""}`}
        />
      )}
    </span>
  );
}

export function LoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center"
    >
      <p className="text-sm font-medium text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-press mt-3 inline-flex rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}

function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function RoomCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading rooms" className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[1.35rem] border border-ink/8 bg-white shadow-[0_10px_30px_rgba(12,18,16,0.04)]"
        >
          <div className="grid lg:grid-cols-2">
            <Skeleton className="aspect-[4/3] rounded-none lg:aspect-auto lg:min-h-[22rem]" />
            <div className="flex flex-col gap-3 p-5 sm:p-6 lg:min-h-[22rem] lg:p-7">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-8 w-2/3 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-11/12 rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <Skeleton className="mt-2 h-4 w-3/5 rounded-md" />
              <div className="mt-auto grid grid-cols-2 gap-3 border-y border-ink/8 py-3 sm:grid-cols-3">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="col-span-2 h-10 rounded-lg sm:col-span-1" />
              </div>
              <Skeleton className="h-10 w-28 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function MenuSkeleton() {
  return (
    <LoadingRegion
      label="Loading menu"
      className="mt-5 grid gap-4 md:mt-6 md:grid-cols-[11.5rem_minmax(0,1fr)] lg:grid-cols-[12.5rem_minmax(0,1fr)]"
    >
      <div className="hidden flex-col gap-2 rounded-2xl bg-mist/70 p-2.5 md:flex">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 rounded-lg" />
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden md:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <ul className="flex flex-col gap-3 md:border-l md:border-ink/8 md:pl-5 lg:pl-6">
        {Array.from({ length: 4 }, (_, index) => (
          <li
            key={index}
            className="flex gap-3 rounded-2xl border border-ink/8 bg-white p-2.5 shadow-[0_4px_14px_rgba(12,18,16,0.05)]"
          >
            <Skeleton className="h-[5.5rem] w-[5.5rem] shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
              <Skeleton className="h-4 w-2/3 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

export function SpaServicesSkeleton() {
  return (
    <LoadingRegion label="Loading spa services" className="mt-3.5">
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-3 grid overflow-hidden rounded-2xl border border-ink/8 bg-white lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <Skeleton className="hidden min-h-[14rem] rounded-none lg:block" />
        <div className="divide-y divide-ink/8 px-4 py-2 sm:px-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function NewsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading news" className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl bg-white shadow-[0_8px_22px_rgba(12,18,16,0.05)]"
        >
          <Skeleton className="aspect-[16/10] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-5 w-4/5 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function NewsDetailSkeleton() {
  return (
    <LoadingRegion label="Loading story" className="mt-6 space-y-4">
      <Skeleton className="h-3 w-24 rounded-md" />
      <Skeleton className="h-10 w-4/5 rounded-lg" />
      <Skeleton className="h-4 w-40 rounded-md" />
      <Skeleton className="aspect-[16/10] w-full rounded-2xl sm:aspect-[2/1]" />
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-11/12 rounded-md" />
      <Skeleton className="h-4 w-3/4 rounded-md" />
    </LoadingRegion>
  );
}

export function HomeOfferSkeleton() {
  return (
    <LoadingRegion
      label="Loading offers"
      className="mx-auto mt-2 grid w-full max-w-[90rem] gap-5 pb-16 sm:mt-4 sm:gap-6 sm:pb-20 md:grid-cols-3 md:gap-6 md:pb-24 lg:gap-8"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl bg-white/90 shadow-sm">
          <Skeleton className="aspect-[16/11] rounded-none bg-white/20" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function ReviewCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading reviews" className="mt-4 grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-ink/8 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-11/12 rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function GalleryGridSkeleton() {
  return (
    <LoadingRegion label="Loading gallery" className="grid grid-cols-2 gap-2 md:grid-cols-4 md:grid-rows-2 md:gap-3">
      <Skeleton className="col-span-2 aspect-[4/3] rounded-xl md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[22rem]" />
      <Skeleton className="aspect-square rounded-xl" />
      <Skeleton className="aspect-square rounded-xl" />
      <Skeleton className="aspect-square rounded-xl" />
      <Skeleton className="aspect-square rounded-xl" />
    </LoadingRegion>
  );
}

export function PriceRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <LoadingRegion
      label="Loading prices"
      className="overflow-hidden rounded-2xl border border-[#0b1d33]/8 bg-white/85"
    >
      <Skeleton className="h-12 rounded-none bg-[#0b1d33]/80" />
      <div className="divide-y divide-[#0b1d33]/8 px-4 lg:px-6">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-4">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function MemberRowsSkeleton() {
  return (
    <LoadingRegion label="Loading members" className="mt-8 space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 rounded-2xl border border-ink/8 bg-white p-4"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-3 w-56 rounded-md" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </LoadingRegion>
  );
}

/** Full-viewport stand-in for a page hero: nav, title, and media, with no real copy. */
export function HeroSkeleton() {
  return (
    <div className="absolute inset-0 z-40 bg-[#243036]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <div className="flex items-center justify-between gap-4 px-5 pt-4 sm:px-8 sm:pt-5">
        <Skeleton dark className="h-11 w-28 rounded-full" />
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 md:flex">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} dark className="h-3 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton dark className="h-10 w-28 rounded-full" />
      </div>
      <div className="absolute inset-x-0 bottom-0 px-5 pb-14 sm:px-8 sm:pb-16 lg:px-12">
        <Skeleton dark className="h-3 w-56 max-w-full rounded-full" />
        <Skeleton dark className="mt-4 h-12 w-full max-w-xl rounded-lg sm:h-14" />
        <Skeleton dark className="mt-3 h-8 w-2/3 max-w-md rounded-lg" />
        <Skeleton dark className="mt-4 h-4 w-full max-w-lg rounded-md" />
        <Skeleton dark className="mt-2 h-4 w-4/5 max-w-md rounded-md" />
        <Skeleton dark className="mt-6 h-10 w-36 rounded-full" />
      </div>
    </div>
  );
}

/** Homepage rooms / scuba / feature card while its photos and copy are still preparing. */
export function FeaturePanelSkeleton() {
  return (
    <LoadingRegion label="Loading section">
      <div className="grid gap-8 rounded-[1.5rem] bg-[#243036] p-5 sm:gap-10 sm:p-7 md:grid-cols-2 md:items-center md:p-10 lg:p-12">
        <div>
          <Skeleton dark className="h-3 w-40 rounded-full" />
          <Skeleton dark className="mt-4 h-10 w-4/5 rounded-lg" />
          <Skeleton dark className="mt-4 h-4 w-full rounded-md" />
          <Skeleton dark className="mt-2 h-4 w-11/12 rounded-md" />
          <Skeleton dark className="mt-2 h-4 w-3/4 rounded-md" />
          <Skeleton dark className="mt-6 h-10 w-36 rounded-full" />
        </div>
        <Skeleton dark className="aspect-[5/4] w-full rounded-2xl" />
      </div>
    </LoadingRegion>
  );
}

export function ServicesSkeleton() {
  return (
    <LoadingRegion
      label="Loading services"
      className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-ink/6 bg-white">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 px-3 py-5 sm:px-4">
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-2/3 rounded-md" />
            <Skeleton className="mt-3 h-3 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** Full-screen section such as spa, restaurant, or news on the home page. */
export function FullBleedSkeleton({ id }: { id?: string }) {
  return (
    <section id={id} className="relative min-h-[100svh] overflow-hidden bg-[#243036]" aria-busy="true">
      <span className="sr-only">Loading section</span>
      <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <Skeleton dark className="h-3 w-40 rounded-full" />
        <Skeleton dark className="mt-4 h-12 w-full max-w-lg rounded-lg" />
        <Skeleton dark className="mt-3 h-4 w-full max-w-md rounded-md" />
        <Skeleton dark className="mt-2 h-4 w-2/3 max-w-sm rounded-md" />
        <Skeleton dark className="mt-6 h-10 w-36 rounded-full" />
      </div>
    </section>
  );
}

/** Cards under a page hero while that page's photos and copy are still preparing. */
export function PageBodySkeleton() {
  return (
    <LoadingRegion label="Loading page" className="relative z-0 px-4 py-10 sm:px-6 md:px-8 lg:px-10 xl:px-12">
      <div className="rounded-3xl bg-white p-6 sm:p-10">
        <Skeleton className="h-3 w-32 rounded-full" />
        <Skeleton className="mt-4 h-10 w-2/3 max-w-md rounded-lg" />
        <Skeleton className="mt-4 h-4 w-full rounded-md" />
        <Skeleton className="mt-2 h-4 w-11/12 rounded-md" />
        <Skeleton className="mt-2 h-4 w-4/5 rounded-md" />
        <Skeleton className="mt-6 h-10 w-32 rounded-full" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-52 rounded-3xl" />
      </div>
    </LoadingRegion>
  );
}

export function GalleryStageSkeleton() {
  return (
    <LoadingRegion label="Loading gallery" className="mx-auto w-full max-w-5xl">
      <Skeleton className="aspect-[16/10] w-full rounded-[22px] sm:aspect-[16/8]" />
    </LoadingRegion>
  );
}
