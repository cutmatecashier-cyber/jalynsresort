import { fetchContactHero } from "./contact";
import { isHeroVideoUrl } from "./heroMedia";
import { fetchHomeHeroSlides, homeHeroMediaUrl, peekHomeHeroSlides } from "./homeHero";
import { fetchNewsHero } from "./news";
import { fetchRestaurantHero } from "./restaurant";
import { fetchRoomsHero } from "./rooms";
import { fetchScubaHero } from "./scuba";
import { fetchSpaHero } from "./spa";

export type CachedPageHero = {
  url: string | null;
  video: boolean;
};

const STORAGE_KEY = "jalyns:page-heroes";
const memory = new Map<string, CachedPageHero>();
const warmedUrls = new Set<string>();
const warmed: Array<HTMLImageElement | HTMLVideoElement> = [];

function readStore(): Record<string, CachedPageHero> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CachedPageHero>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function warmHeroUrl(url: string | null) {
  if (!url || url.startsWith("blob:") || warmedUrls.has(url)) return;
  warmedUrls.add(url);
  if (isHeroVideoUrl(url)) return;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  warmed.push(image);
}

const PAGE_HERO_PATHS: Record<string, string> = {
  "/spa": "spa",
  "/rooms": "rooms",
  "/restaurant": "restaurant",
  "/contact": "contact",
  "/scuba-diving": "scuba",
  "/news": "news",
};

/** Start the visible hero download before React paints. */
export function preloadStartupHeroes() {
  const path = window.location.pathname;
  if (path === "/" || path === "") {
    const first = peekHomeHeroSlides()?.[0];
    if (first && isHeroVideoUrl(first.image)) warmHeroUrl(homeHeroMediaUrl(first.image));
  } else {
    const cached = peekPageHero(PAGE_HERO_PATHS[path] ?? "");
    if (cached?.url) warmHeroUrl(cached.url);
  }
  void prefetchPageHeroes();
}

export function peekPageHero(key: string): CachedPageHero | null {
  const cached = memory.get(key);
  if (cached) return cached;
  const stored = readStore()[key];
  if (!stored || (stored.url !== null && typeof stored.url !== "string") || typeof stored.video !== "boolean") {
    return null;
  }
  memory.set(key, stored);
  warmHeroUrl(stored.url);
  return stored;
}

export function rememberPageHero(key: string, hero: CachedPageHero, warm = true) {
  if (hero.url?.startsWith("blob:")) return;
  memory.set(key, hero);
  if (warm) warmHeroUrl(hero.url);
  try {
    const all = readStore();
    all[key] = hero;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Private mode can block storage. The in-memory copy still prevents a flash.
  }
}

let prefetching: Promise<void> | null = null;

/** Load every page hero so the next navigation can paint it immediately. */
export function prefetchPageHeroes() {
  if (prefetching) return prefetching;
  prefetching = (async () => {
    try {
      const [home, spa, rooms, restaurant, contact, scuba, news] = await Promise.all([
        fetchHomeHeroSlides(),
        fetchSpaHero(),
        fetchRoomsHero(),
        fetchRestaurantHero(),
        fetchContactHero(),
        fetchScubaHero(),
        fetchNewsHero(),
      ]);
      for (const slide of home ?? []) {
        const url = homeHeroMediaUrl(slide.image);
        if (isHeroVideoUrl(url)) continue;
        warmHeroUrl(url);
      }
      const heroes = [
        { key: "spa", url: spa.url },
        { key: "rooms", url: rooms.url },
        { key: "restaurant", url: restaurant.url },
        { key: "contact", url: contact.url },
        { key: "scuba", url: scuba.url },
        { key: "news", url: news.url },
      ];
      for (const hero of heroes) {
        rememberPageHero(hero.key, { url: hero.url, video: isHeroVideoUrl(hero.url) }, false);
      }
    } catch {
      // Keep the last saved hero if a request fails.
    }
  })().finally(() => {
    prefetching = null;
  });
  return prefetching;
}
