import { getApiUrl } from "./api";
import { adminAuthHeaders } from "./adminAuth";
import { postFormData } from "./formUpload";
import { isHeroVideoFile } from "./heroMedia";
import { DISPLAY_IMAGE_OPTIMIZE, optimizeImageFile } from "./scuba";

export type HomeHeroSlide = {
  id: string;
  image: string;
  alt: string;
};

export const DEFAULT_HOME_SLIDES: HomeHeroSlide[] = [
  {
    id: "pool",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2400&q=80",
    alt: "Infinity pool overlooking a tropical bay at Jalyn's Resort",
  },
  {
    id: "cove",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2400&q=80",
    alt: "Resort lounge chairs facing turquoise water in Puerto Galera",
  },
  {
    id: "deck",
    image:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=2400&q=80",
    alt: "Sunset view from a seaside resort terrace",
  },
  {
    id: "bay",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80",
    alt: "Turquoise bay near Puerto Galera",
  },
];

const HOME_HERO_CACHE_KEY = "jalyns:home-hero-slides";
let memorySlides: HomeHeroSlide[] | null = null;

function rememberHomeHeroSlides(slides: HomeHeroSlide[]) {
  memorySlides = slides.map((slide) => ({ ...slide }));
  try {
    sessionStorage.setItem(HOME_HERO_CACHE_KEY, JSON.stringify(memorySlides));
  } catch {
    // Private mode can block storage. The in-memory copy still prevents a flash.
  }
}

export function peekHomeHeroSlides(): HomeHeroSlide[] | null {
  if (memorySlides?.length) return memorySlides.map((slide) => ({ ...slide }));
  try {
    const raw = sessionStorage.getItem(HOME_HERO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeHeroSlide[];
    if (!Array.isArray(parsed) || parsed.length !== DEFAULT_HOME_SLIDES.length) return null;
    if (!parsed.every((slide) => slide && typeof slide.image === "string" && typeof slide.id === "string")) {
      return null;
    }
    memorySlides = parsed.map((slide) => ({ ...slide }));
    return memorySlides.map((slide) => ({ ...slide }));
  } catch {
    return null;
  }
}

export const HOME_HERO_UPDATED_EVENT = "jalyns:home-hero-updated";
export const HOME_SECTION_UPDATED_EVENT = "jalyns:home-section-updated";

export type HomeSectionKey = "whystay" | "news" | "restaurant" | "spa";

export const DEFAULT_HOME_SECTIONS: Record<HomeSectionKey, string> = {
  whystay:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80",
  news: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=2400&q=80",
  restaurant:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2400&q=80",
  spa: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2400&q=80",
};

export function homeHeroMediaUrl(url: string) {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = getApiUrl().replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function notifyHomeHeroUpdated(slides?: HomeHeroSlide[]) {
  window.dispatchEvent(
    new CustomEvent(HOME_HERO_UPDATED_EVENT, {
      detail: { slides },
    }),
  );
}

export async function fetchHomeHeroSlides(): Promise<HomeHeroSlide[] | null> {
  try {
    const res = await fetch(`${getApiUrl()}/api/home/hero`, { cache: "no-store" });
    const body = (await res.json()) as {
      success?: boolean;
      slides?: HomeHeroSlide[];
    };
    if (res.ok && Array.isArray(body.slides) && body.slides.length > 0) {
      rememberHomeHeroSlides(body.slides);
      return body.slides;
    }
  } catch {
    // Keep the last known slides instead of flashing the defaults.
  }
  return null;
}

export async function uploadHomeHeroSlide(
  index: number,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  const payload = isHeroVideoFile(file) ? file : await optimizeImageFile(file, DISPLAY_IMAGE_OPTIMIZE);
  const body = new FormData();
  body.append("image", payload);
  body.append("index", String(index));
  const res = await postFormData(
    `${getApiUrl()}/api/home/hero/upload`,
    await adminAuthHeaders(false),
    body,
    onProgress,
    signal,
  );
  const data = res.data as {
    success?: boolean;
    message?: string;
    slides?: HomeHeroSlide[];
    url?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not upload background.");
  }
  if (data.slides?.length) rememberHomeHeroSlides(data.slides);
  return data;
}

export async function resetHomeHeroSlide(index: number) {
  const res = await fetch(`${getApiUrl()}/api/home/hero/${index}/reset`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    slides?: HomeHeroSlide[];
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not reset slide.");
  }
  return data;
}

export async function resetAllHomeHeroSlides() {
  const res = await fetch(`${getApiUrl()}/api/home/hero/reset-all`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    slides?: HomeHeroSlide[];
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not reset backgrounds.");
  }
  return data;
}

export function notifyHomeSectionUpdated(section: HomeSectionKey, url?: string) {
  window.dispatchEvent(
    new CustomEvent(HOME_SECTION_UPDATED_EVENT, {
      detail: { section, url },
    }),
  );
}

export async function fetchHomeSectionBackground(section: HomeSectionKey): Promise<string> {
  try {
    const res = await fetch(`${getApiUrl()}/api/home/sections/${section}`, {
      cache: "no-store",
    });
    const body = (await res.json()) as {
      success?: boolean;
      url?: string;
    };
    if (res.ok && body.url) return body.url;
  } catch {
    // keep default
  }
  return DEFAULT_HOME_SECTIONS[section];
}

export async function uploadHomeSectionBackground(section: HomeSectionKey, file: File) {
  const body = new FormData();
  body.append("image", file);
  const res = await fetch(`${getApiUrl()}/api/home/sections/${section}/upload`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
    body,
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    url?: string;
    sections?: Record<HomeSectionKey, string>;
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not upload background.");
  }
  return data;
}

export async function resetHomeSectionBackground(section: HomeSectionKey) {
  const res = await fetch(`${getApiUrl()}/api/home/sections/${section}/reset`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    url?: string;
    sections?: Record<HomeSectionKey, string>;
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not reset background.");
  }
  return data;
}
