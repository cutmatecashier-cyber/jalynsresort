import { getApiUrl } from "./api";
import { postFormData } from "./formUpload";
import { isHeroVideoFile } from "./heroMedia";
import { supabase } from "./supabase";
import type { DivingRate, PadiScubaCourse } from "../types/database";

export const SCUBA_BUCKET = "scuba-diving";
export const SCUBA_HERO_FOLDER = "hero";
export const SCUBA_CONTENT_FOLDER = "content";
export const SCUBA_GALLERY_FOLDER = "gallery";

export const DEFAULT_SCUBA_HERO =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=2400&q=80";

export const DEFAULT_SCUBA_CONTENT =
  "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=2400&q=80";

export const DEFAULT_SCUBA_GALLERY: ScubaImage[] = [
  {
    path: "fallback-1",
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80",
    alt: "Scuba diver exploring a coral reef",
  },
  {
    path: "fallback-2",
    url: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=1400&q=80",
    alt: "Diver swimming through clear tropical water",
  },
  {
    path: "fallback-3",
    url: "https://images.unsplash.com/photo-1682687982501-1e58ab814714?auto=format&fit=crop&w=1400&q=80",
    alt: "Underwater sunlight over a reef",
  },
  {
    path: "fallback-4",
    url: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1400&q=80",
    alt: "Colorful coral and tropical fish",
  },
  {
    path: "fallback-5",
    url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1400&q=80",
    alt: "Aerial view of a tropical cove",
  },
  {
    path: "fallback-6",
    url: "https://images.unsplash.com/photo-1682687220208-22d7a854b19b?auto=format&fit=crop&w=1400&q=80",
    alt: "Diver above a reef wall",
  },
];

export type ScubaImage = {
  path: string;
  url: string;
  alt: string;
};

export type ScubaBackground = {
  url: string | null;
  path: string | null;
};

export type ScubaPageSettings = {
  pricesValidUntil: string;
};

export const MISSING_SCUBA_TABLES =
  "Scuba tables are missing. Run supabase/SCUBA_DIVING.sql in the Supabase SQL Editor, then refresh.";

export const DEFAULT_PRICES_VALID_UNTIL = "Dec 2024";

export const SCUBA_UPDATED_EVENT = "jalyns:scuba-updated";

export function notifyScubaUpdated() {
  window.dispatchEvent(new CustomEvent(SCUBA_UPDATED_EVENT));
}

export function displayPrice(price: string) {
  const trimmed = price.trim();
  if (!trimmed) return trimmed;
  if (/[a-zA-Z]/.test(trimmed) || trimmed.startsWith("₱")) return trimmed;
  const numeric = Number(trimmed.replace(/,/g, ""));
  if (Number.isFinite(numeric)) return `₱${numeric.toLocaleString("en-PH")}`;
  return trimmed;
}

export function formatPricesValidUntil(monthValue: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue.trim());
  if (!match) return monthValue.trim() || DEFAULT_PRICES_VALID_UNTIL;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return DEFAULT_PRICES_VALID_UNTIL;
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function pricesValidUntilToMonthInput(label: string) {
  const trimmed = label.trim();
  const direct = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (direct) return trimmed;
  const parsed = new Date(`${trimmed} 1`);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function apiMessage(body: { message?: string } | null, fallback: string) {
  const message = body?.message?.trim();
  if (!message) return fallback;
  if (/Scuba tables are missing|Could not find the table|relation .* does not exist/i.test(message)) {
    return MISSING_SCUBA_TABLES;
  }
  return message;
}

async function authHeaders(json = true): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Admin session expired. Please log in again.");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

/** Hero and listing photos: about 2000px WebP, small enough to upload and display quickly. */
export const DISPLAY_IMAGE_OPTIMIZE = {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 0.84,
  maxBytes: 1_200_000,
} as const;

/**
 * Resize oversized photos and encode WebP when the browser can.
 * Files that are already small enough are returned unchanged.
 */
export async function optimizeImageFile(
  file: File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    /** Re-encode only if larger than this (bytes), unless dimensions also exceed max. */
    maxBytes?: number;
    /**
     * Honor maxWidth/maxBytes strictly (no JPEG “keep original phone photo” floors).
     * Use for small UI images (menu dishes, thumbs) so uploads stay fast.
     */
    strict?: boolean;
  },
): Promise<File> {
  const maxWidth = options?.maxWidth ?? DISPLAY_IMAGE_OPTIMIZE.maxWidth;
  const maxHeight = options?.maxHeight ?? DISPLAY_IMAGE_OPTIMIZE.maxHeight;
  const quality = Math.min(0.88, Math.max(0.72, options?.quality ?? DISPLAY_IMAGE_OPTIMIZE.quality));
  const maxBytes = options?.maxBytes ?? DISPLAY_IMAGE_OPTIMIZE.maxBytes;

  // Browsers cannot decode camera RAW or some phone formats. The server converts them.
  if (
    /\.(nef|nrw|cr2|cr3|arw|dng|orf|rw2|raf|srw|raw|pef|x3f|heic|heif|tiff?)$/i.test(file.name) ||
    /nikon-nef|raw|(?:^|\/)nef$|heic|heif|tiff/i.test(file.type)
  ) {
    return file;
  }

  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  let probe: ImageBitmap;
  try {
    probe = await createImageBitmap(file);
  } catch {
    return file;
  }
  const srcW = probe.width;
  const srcH = probe.height;
  probe.close();
  if (!srcW || !srcH) return file;

  const scale = Math.min(1, maxWidth / srcW, maxHeight / srcH);
  const withinDims = scale >= 0.999;
  const alreadySmall =
    withinDims &&
    file.size <= Math.min(maxBytes, 900_000) &&
    (file.type === "image/webp" || /^image\/jpe?g$/i.test(file.type));
  if (alreadySmall) return file;

  const targetW = Math.max(1, Math.round(srcW * (withinDims ? 1 : scale)));
  const targetH = Math.max(1, Math.round(srcH * (withinDims ? 1 : scale)));
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      resizeWidth: targetW,
      resizeHeight: targetH,
      resizeQuality: "medium",
    });
  } catch {
    return file;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);

    const base = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
    const webp = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/webp", quality);
    });
    if (webp && (webp.size < file.size || !withinDims || file.size > maxBytes)) {
      return new File([webp], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
    }
    if (withinDims && file.size <= maxBytes) return file;

    const jpeg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/jpeg", quality);
    });
    if (!jpeg) return file;
    return new File([jpeg], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

export async function fetchDivingRates() {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/rates`, { cache: "no-store" });
    const body = await readJson<{ success?: boolean; message?: string; rates?: DivingRate[] }>(res);
    if (!res.ok) {
      return { rows: [] as DivingRate[], error: apiMessage(body, "Could not load diving rates.") };
    }
    return { rows: Array.isArray(body.rates) ? body.rates : [], error: null as string | null };
  } catch {
    return {
      rows: [] as DivingRate[],
      error: "Cannot reach the server. Make sure the backend is running.",
    };
  }
}

export async function fetchPadiCourses() {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/courses`, { cache: "no-store" });
    const body = await readJson<{
      success?: boolean;
      message?: string;
      courses?: PadiScubaCourse[];
    }>(res);
    if (!res.ok) {
      return {
        rows: [] as PadiScubaCourse[],
        error: apiMessage(body, "Could not load PADI courses."),
      };
    }
    return {
      rows: Array.isArray(body.courses) ? body.courses : [],
      error: null as string | null,
    };
  } catch {
    return {
      rows: [] as PadiScubaCourse[],
      error: "Cannot reach the server. Make sure the backend is running.",
    };
  }
}

export async function createDivingRate(service: string, price: string) {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/rates`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ service, price }),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not add service.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not add service.";
  }
}

export async function updateDivingRate(id: number, service: string, price: string) {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/rates/${id}`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ service, price }),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not update service.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not update service.";
  }
}

export async function deleteDivingRate(id: number) {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/rates/${id}`, {
      method: "DELETE",
      headers: await authHeaders(false),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not delete service.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not delete service.";
  }
}

export async function createPadiCourse(course: string, details: string, price: string) {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/courses`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ course, details, price }),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not add course.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not add course.";
  }
}

export async function updatePadiCourse(
  id: number,
  course: string,
  details: string,
  price: string,
) {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/courses/${id}`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ course, details, price }),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not update course.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not update course.";
  }
}

export async function deletePadiCourse(id: number) {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/courses/${id}`, {
      method: "DELETE",
      headers: await authHeaders(false),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not delete course.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not delete course.";
  }
}

export async function fetchScubaHero(): Promise<ScubaBackground> {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/hero`, { cache: "no-store" });
    const body = await readJson<{
      success?: boolean;
      background?: ScubaBackground;
    }>(res);
    if (!res.ok) return { url: null, path: null };
    return body.background ?? { url: null, path: null };
  } catch {
    return { url: null, path: null };
  }
}

export async function fetchScubaContentBackground(): Promise<ScubaBackground> {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/content-background`, { cache: "no-store" });
    const body = await readJson<{
      success?: boolean;
      background?: ScubaBackground;
    }>(res);
    if (!res.ok) return { url: null, path: null };
    return body.background ?? { url: null, path: null };
  } catch {
    return { url: null, path: null };
  }
}

export async function fetchScubaGallery(): Promise<ScubaImage[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/gallery`, { cache: "no-store" });
    const body = await readJson<{ success?: boolean; images?: ScubaImage[] }>(res);
    if (!res.ok) return [];
    return Array.isArray(body.images) ? body.images : [];
  } catch {
    return [];
  }
}

export async function uploadScubaHeroWithResult(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  try {
    const optimized = isHeroVideoFile(file) ? file : await optimizeImageFile(file, DISPLAY_IMAGE_OPTIMIZE);
    const form = new FormData();
    form.append("image", optimized);
    const res = await postFormData(
      `${getApiUrl()}/api/scuba/hero`,
      await authHeaders(false),
      form,
      onProgress,
      signal,
    );
    const body = res.data as {
      success?: boolean;
      message?: string;
      path?: string;
      url?: string;
    };
    if (!res.ok || !body.url) {
      return {
        error: apiMessage(body, "Could not upload image."),
        path: null as string | null,
        url: null as string | null,
      };
    }
    notifyScubaUpdated();
    return { error: null as string | null, path: body.path ?? null, url: body.url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not upload image.",
      path: null as string | null,
      url: null as string | null,
    };
  }
}

export async function uploadScubaHero(file: File) {
  return (await uploadScubaHeroWithResult(file)).error;
}

export async function removeScubaHero() {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/hero`, {
      method: "DELETE",
      headers: await authHeaders(false),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not remove image.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not remove image.";
  }
}

export async function uploadScubaContentBackgroundWithResult(file: File) {
  try {
    const optimized = await optimizeImageFile(file, DISPLAY_IMAGE_OPTIMIZE);
    const form = new FormData();
    form.append("image", optimized);
    const res = await fetch(`${getApiUrl()}/api/scuba/content-background`, {
      method: "POST",
      headers: await authHeaders(false),
      body: form,
    });
    const body = await readJson<{
      success?: boolean;
      message?: string;
      path?: string;
      url?: string;
    }>(res);
    if (!res.ok || !body.url) {
      return {
        error: apiMessage(body, "Could not upload image."),
        path: null as string | null,
        url: null as string | null,
      };
    }
    notifyScubaUpdated();
    return { error: null as string | null, path: body.path ?? null, url: body.url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not upload image.",
      path: null as string | null,
      url: null as string | null,
    };
  }
}

export async function uploadScubaContentBackground(file: File) {
  return (await uploadScubaContentBackgroundWithResult(file)).error;
}

export async function removeScubaContentBackground() {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/content-background`, {
      method: "DELETE",
      headers: await authHeaders(false),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not remove image.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not remove image.";
  }
}

export async function uploadScubaGalleryImages(
  files: File[],
  onProgress?: (done: number, total: number) => void,
) {
  const unique = new Map<string, File>();
  for (const file of files) {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (!unique.has(key)) unique.set(key, file);
  }
  const list = Array.from(unique.values());
  if (!list.length) return null;

  try {
    onProgress?.(0, list.length);
    const optimizedFiles: File[] = [];
    for (let i = 0; i < list.length; i += 1) {
      optimizedFiles.push(
        await optimizeImageFile(list[i], {
          maxWidth: 2200,
          maxHeight: 2200,
          quality: 0.92,
          maxBytes: 5_000_000,
        }),
      );
      onProgress?.(i + 1, list.length);
    }

    const form = new FormData();
    for (const file of optimizedFiles) form.append("images", file);
    const res = await fetch(`${getApiUrl()}/api/scuba/gallery`, {
      method: "POST",
      headers: await authHeaders(false),
      body: form,
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not upload gallery image.");
    onProgress?.(list.length, list.length);
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not upload gallery image.";
  }
}

export async function replaceScubaGalleryImage(path: string, file: File) {
  try {
    const optimized = await optimizeImageFile(file, {
      maxWidth: 2200,
      maxHeight: 2200,
      quality: 0.92,
      maxBytes: 5_000_000,
    });
    const form = new FormData();
    form.append("image", optimized);
    form.append("path", path);
    const res = await fetch(`${getApiUrl()}/api/scuba/gallery`, {
      method: "PUT",
      headers: await authHeaders(false),
      body: form,
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not replace image.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not replace image.";
  }
}

export async function deleteScubaGalleryImage(path: string) {
  try {
    const res = await fetch(
      `${getApiUrl()}/api/scuba/gallery?path=${encodeURIComponent(path)}`,
      {
        method: "DELETE",
        headers: await authHeaders(false),
      },
    );
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not delete image.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not delete image.";
  }
}

export async function fetchScubaPageSettings(): Promise<ScubaPageSettings> {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/settings`, { cache: "no-store" });
    const body = await readJson<{
      success?: boolean;
      settings?: ScubaPageSettings;
    }>(res);
    if (!res.ok || !body.settings) {
      return { pricesValidUntil: DEFAULT_PRICES_VALID_UNTIL };
    }
    return {
      pricesValidUntil: body.settings.pricesValidUntil || DEFAULT_PRICES_VALID_UNTIL,
    };
  } catch {
    return { pricesValidUntil: DEFAULT_PRICES_VALID_UNTIL };
  }
}

export async function saveScubaPageSettings(settings: ScubaPageSettings) {
  try {
    const res = await fetch(`${getApiUrl()}/api/scuba/settings`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(settings),
    });
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not save price validity date.");
    notifyScubaUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not save price validity date.";
  }
}

/** Same-tab refresh after admin writes (Spa-style). Replaces Supabase realtime. */
export function subscribeScubaTables(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(SCUBA_UPDATED_EVENT, handler);
  return () => window.removeEventListener(SCUBA_UPDATED_EVENT, handler);
}
