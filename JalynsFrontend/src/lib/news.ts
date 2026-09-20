import { getApiUrl, resolveMediaUrl } from "./api";
import { adminAuthHeaders } from "./adminAuth";
import { optimizeImageFile } from "./scuba";

export type NewsKind = "news" | "offer" | "event";

export type NewsPackage = {
  title: string;
  price?: string;
  image?: string;
  amenities?: string[];
  body?: string;
};

export type NewsPost = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  body?: string;
  image: string;
  cta: string;
  href: string;
  kind: NewsKind;
  date: string;
  /** Highlight rate shown on detail (e.g. ₱18,000/month) */
  price?: string;
  /** Extra photos for the detail gallery */
  gallery?: string[];
  /** Room / offer packages with rates & amenities (like Rooms section) */
  packages?: NewsPackage[];
  /** YouTube embed URL (e.g. https://www.youtube.com/embed/…) */
  videoUrl?: string;
};

export type NewsBackground = {
  url: string | null;
  path: string | null;
};

export const DEFAULT_NEWS_HERO =
  "https://svxqrxduopqwggqbamhh.supabase.co/storage/v1/object/public/news-page/posts/studio-apartments-available--01-pools-and-solar-1-b63856.jpg";

export const NEWS_HERO_UPDATED_EVENT = "jalyns:news-hero-updated";

export function notifyNewsHeroUpdated() {
  window.dispatchEvent(new CustomEvent(NEWS_HERO_UPDATED_EVENT));
}

/** Fallback seed — from https://jalynsresort.com/resort-news-offers-events/ */
export const DEFAULT_NEWS_POSTS: NewsPost[] = [
  {
    id: "studio-apartments-available-for-long-term-rental-at-jalyns-resort",
    category: "News",
    kind: "news",
    date: "2024-08-20",
    title: "Studio Apartments available for long-term rental at Jalyn’s Resort",
    excerpt:
      "Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and the relaxed Mangrove Cove lifestyle.",
    image: "/uploads/news/pools-and-solar-1.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/studio-apartments-available-for-long-term-rental-at-jalyns-resort/",
  },
  {
    id: "phidex-2024-dive-expo",
    category: "Events",
    kind: "event",
    date: "2024-03-20",
    title: "PHIDEX 2024 Dive Expo",
    excerpt:
      "The 2024 Philippines International Dive Expo was a great success, and we were proud to represent Puerto Galera diving with Jalyn’s Resort Dive Center.",
    image:
      "/uploads/news/429317172-1651854885631461-47893951982924994-n.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/phidex-2024-dive-expo/",
  },
  {
    id: "our-commitment-to-responsible-ecotourism-in-marine-protected-areas",
    category: "News",
    kind: "news",
    date: "2023-12-06",
    title: "Our Commitment to Responsible Ecotourism in Marine Protected Areas",
    excerpt:
      "Jalyn’s Resort and Jalyn’s Resort Dive Center are proud to announce our commitment to promoting responsible ecotourism in marine protected areas.",
    image: "/uploads/news/hawksbill-turtle-puerto-galera.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/our-commitment-to-responsible-ecotourism-in-marine-protected-areas/",
  },
  {
    id: "padi-advanced-open-water-students-review",
    category: "News",
    kind: "news",
    date: "2023-11-30",
    title: "PADI Advanced Open Water Students Review",
    excerpt:
      "Jalyn’s Resort Scuba Diving Center offers everything from daily fun dives and exciting night dives, to full PADI courses for advancing divers.",
    image:
      "/uploads/news/padi-advanced-open-water-students-puerto-galera.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/padi-advanced-open-water-students-review/",
  },
  {
    id: "scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site",
    category: "News",
    kind: "news",
    date: "2023-11-06",
    title: "Scuba Diving with a huge school of Jacks at Canyons dive site",
    excerpt:
      "“Canyons” is Puerto Galera’s signature exhilarating drift dive, not for novice divers. Drop in at the right time and you may swim with a huge school of jacks.",
    image:
      "/uploads/news/scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site/",
  },
  {
    id: "rooms-scuba-diving-special-offer",
    category: "Special Offers",
    kind: "offer",
    date: "2023-09-17",
    title: "Rooms & Scuba Diving Special Offer!",
    excerpt:
      "To mark the Sabang Oktoberfest celebration Jalyn’s Resort is offering 5 days/4 nights accommodation and scuba diving packages.",
    image:
      "/uploads/news/rooms-diving-special-offer-jalyns-resort-puerto-galera.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/rooms-scuba-diving-special-offer/",
  },
  {
    id: "single-double-rooms-available-for-long-term-rental-at-jalyns-resort",
    category: "News",
    kind: "news",
    date: "2023-09-08",
    title: "Single & Double Rooms available for long-term rental at Jalyn’s Resort",
    excerpt:
      "Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and easy access to diving and dining.",
    image: "/uploads/news/pools-and-solar-1.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/single-double-rooms-available-for-long-term-rental-at-jalyns-resort/",
  },
  {
    id: "sabang-oktoberfest-2023",
    category: "Events",
    kind: "event",
    date: "2023-07-31",
    title: "Sabang Oktoberfest 2023",
    excerpt:
      "If you are going to be in Puerto Galera this October, be sure to check out Sabang Oktoberfest — music, food, and celebration along the beach strip.",
    image:
      "/uploads/news/sabang-oktoberfest-2023-puerto-galera.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/sabang-oktoberfest-2023/",
  },
  {
    id: "apartments-available-for-long-term-rental-at-jalyns-resort-puerto-galera",
    category: "News",
    kind: "news",
    date: "2023-06-08",
    title: "Apartments Available for Long-Term Rental at Jalyn’s Resort, Puerto Galera",
    excerpt:
      "Jalyn’s Resort is pleased to announce that we now have One and Two-Bedroom apartments available for longer stays in Puerto Galera.",
    image:
      "/uploads/news/jalyns-resort-puerto-galera-main-building.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/apartments-available-for-long-term-rental-at-jalyns-resort-puerto-galera/",
  },
  {
    id: "puerto-galera-aldaw-kapiya-an-festival-2023",
    category: "Events",
    kind: "event",
    date: "2023-06-05",
    title: "Puerto Galera Aldaw Kapiya-An Festival 2023",
    excerpt:
      "From June 5th – 12th 2023, Puerto Galera hosted the Aldaw Kapiya-An Festival — culture, community, and celebration across the municipality.",
    image:
      "/uploads/news/puerto-galera-independence-day-festival-1.jpg",
    cta: "Read more",
    href: "https://jalynsresort.com/puerto-galera-aldaw-kapiya-an-festival-2023/",
  },
];

/** @deprecated use DEFAULT_NEWS_POSTS — kept for older imports */
export const NEWS_POSTS = DEFAULT_NEWS_POSTS;

export const NEWS_UPDATED_EVENT = "jalyns:news-updated";

export function newsMediaUrl(url: string | null | undefined) {
  if (!url) return "";
  // Prefer local API uploads so photos survive if the old WordPress site is removed.
  if (/^(data:|blob:)/i.test(url)) return url;
  const wpMatch = url.match(
    /^https?:\/\/(?:www\.)?jalynsresort\.com\/(wp-content\/uploads\/.+)$/i,
  );
  if (wpMatch) {
    return `https://i0.wp.com/jalynsresort.com/${wpMatch[1]}?w=1400&quality=78&strip=info`;
  }
  return resolveMediaUrl(url) || "";
}

export function notifyNewsUpdated(posts?: NewsPost[]) {
  window.dispatchEvent(
    new CustomEvent(NEWS_UPDATED_EVENT, {
      detail: { posts },
    }),
  );
}

export function newsCategoryCounts(posts: NewsPost[] = DEFAULT_NEWS_POSTS) {
  return {
    news: posts.filter((p) => p.kind === "news").length,
    event: posts.filter((p) => p.kind === "event").length,
    offer: posts.filter((p) => p.kind === "offer").length,
  };
}

export function formatNewsDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }),
    year: d.getFullYear(),
  };
}

export async function fetchNewsPosts(): Promise<NewsPost[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/news`, { cache: "no-store" });
    const body = (await res.json()) as {
      success?: boolean;
      message?: string;
      posts?: NewsPost[];
    };
    if (res.ok && Array.isArray(body.posts) && body.posts.length > 0) {
      return body.posts.map((p) => ({
        ...p,
        href: p.href?.startsWith("/") ? p.href : `/news/${p.id}`,
        cta: p.cta || "Read more",
      }));
    }
  } catch {
    // fallback
  }
  return DEFAULT_NEWS_POSTS.map((p) => ({
    ...p,
    href: `/news/${p.id}`,
  }));
}

export async function fetchNewsPost(id: string): Promise<NewsPost | null> {
  const key = decodeURIComponent(String(id || "").trim());
  if (!key) return null;
  try {
    const res = await fetch(`${getApiUrl()}/api/news/${encodeURIComponent(key)}`, {
      cache: "no-store",
    });
    const body = (await res.json()) as {
      success?: boolean;
      post?: NewsPost;
    };
    if (res.ok && body.post) return body.post;
  } catch {
    // try list fallback below
  }
  const posts = await fetchNewsPosts();
  return (
    posts.find((p) => p.id === key) ??
    posts.find((p) => p.id.startsWith(`${key}-`)) ??
    null
  );
}

async function authHeaders(json = true): Promise<HeadersInit> {
  return adminAuthHeaders(json);
}

export async function uploadNewsImage(file: File) {
  const headers = await authHeaders(false);
  const body = new FormData();
  body.append("image", file);
  const res = await fetch(`${getApiUrl()}/api/news/upload`, {
    method: "POST",
    headers,
    body,
  });
  const data = (await res.json()) as { success?: boolean; message?: string; url?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message ?? "Could not upload image.");
  }
  return data.url;
}

export async function fetchNewsHero(): Promise<NewsBackground> {
  try {
    const res = await fetch(`${getApiUrl()}/api/news/hero`, { cache: "no-store" });
    const body = (await res.json()) as {
      success?: boolean;
      background?: NewsBackground;
    };
    if (!res.ok) return { url: null, path: null };
    return body.background ?? { url: null, path: null };
  } catch {
    return { url: null, path: null };
  }
}

export async function uploadNewsHeroWithResult(file: File) {
  try {
    const optimized = await optimizeImageFile(file, {
      maxWidth: 3840,
      maxHeight: 2560,
      quality: 0.96,
      maxBytes: 7_000_000,
    });
    const form = new FormData();
    form.append("image", optimized);
    const res = await fetch(`${getApiUrl()}/api/news/hero`, {
      method: "POST",
      headers: await authHeaders(false),
      body: form,
    });
    const body = (await res.json()) as {
      success?: boolean;
      message?: string;
      path?: string;
      url?: string;
    };
    if (!res.ok || !body.url) {
      return {
        error: body.message?.trim() || "Could not upload image.",
        path: null as string | null,
        url: null as string | null,
      };
    }
    notifyNewsHeroUpdated();
    return { error: null as string | null, path: body.path ?? null, url: body.url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not upload image.",
      path: null as string | null,
      url: null as string | null,
    };
  }
}

export async function removeNewsHero() {
  try {
    const res = await fetch(`${getApiUrl()}/api/news/hero`, {
      method: "DELETE",
      headers: await authHeaders(false),
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) return body.message?.trim() || "Could not remove image.";
    notifyNewsHeroUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not remove image.";
  }
}

export type NewsInput = {
  title: string;
  excerpt: string;
  body?: string;
  image: string;
  kind: NewsKind;
  date: string;
  cta?: string;
  href?: string;
  price?: string;
  gallery?: string[];
  packages?: NewsPackage[];
};

export async function createNewsPost(input: NewsInput) {
  const res = await fetch(`${getApiUrl()}/api/news`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    posts?: NewsPost[];
  };
  if (!res.ok || !data.posts) {
    throw new Error(data.message ?? "Could not create news post.");
  }
  return data.posts;
}

export async function updateNewsPost(id: string, input: NewsInput) {
  const res = await fetch(`${getApiUrl()}/api/news/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    posts?: NewsPost[];
  };
  if (!res.ok || !data.posts) {
    throw new Error(data.message ?? "Could not update news post.");
  }
  return data.posts;
}

export async function deleteNewsPost(id: string) {
  const res = await fetch(`${getApiUrl()}/api/news/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    posts?: NewsPost[];
  };
  if (!res.ok || !data.posts) {
    throw new Error(data.message ?? "Could not delete news post.");
  }
  return data.posts;
}
