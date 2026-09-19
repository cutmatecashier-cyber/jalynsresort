import { getApiUrl } from "./api";
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

/** Resize only when needed — keeps original bytes/format whenever possible. */
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
  const maxWidth = options?.maxWidth ?? 2560;
  const maxHeight = options?.maxHeight ?? 2560;
  const quality =
    options?.quality != null
      ? Math.min(1, Math.max(0.55, options.quality))
      : 0.93;
  const maxBytes = options?.maxBytes ?? 8_000_000;
  const strict = Boolean(options?.strict);

  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  const isJpeg = /^image\/jpe?g$/i.test(file.type);
  const isPng = file.type === "image/png";

  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;

    // JPEG: preserve original bytes for large hero-style uploads unless oversized.
    // `strict` (menu dishes, etc.) always respects caller maxWidth/maxBytes.
    if (isJpeg) {
      const jpegMaxEdge = strict
        ? Math.max(maxWidth, maxHeight)
        : Math.max(maxWidth, maxHeight, 4500);
      const jpegMaxBytes = strict ? maxBytes : Math.max(maxBytes, 12_000_000);
      const scale = Math.min(1, jpegMaxEdge / width, jpegMaxEdge / height);
      if (scale >= 0.999 && file.size <= jpegMaxBytes) {
        return file; // keep original JPEG bytes
      }

      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);

      const jpegQuality = strict ? quality : Math.max(quality, 0.98);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), "image/jpeg", jpegQuality);
      });
      if (!blob || (!strict && blob.size >= file.size * 0.98)) return file;

      const base = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
      return new File([blob], `${base}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }

    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    const needsResize = scale < 0.999;
    const needsShrink = file.size > maxBytes;

    // Already within size + dimension limits → keep the original file untouched.
    if (!needsResize && !needsShrink) return file;

    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    // PNG stays lossless. Other formats → high-quality JPEG only when needed.
    const keepPng = isPng && !needsShrink && !strict;
    const mime = keepPng ? "image/png" : "image/jpeg";
    const ext = keepPng ? "png" : "jpg";

    const blob = await new Promise<Blob | null>((resolve) => {
      if (keepPng) {
        canvas.toBlob((value) => resolve(value), mime);
      } else {
        canvas.toBlob((value) => resolve(value), mime, Math.max(quality, strict ? quality : 0.95));
      }
    });
    if (!blob) return file;

    // If re-encode didn't help and we only wanted a shrink, keep original.
    if (!needsResize && !strict && blob.size >= file.size * 0.92) return file;

    const base = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
    return new File([blob], `${base}.${ext}`, {
      type: mime,
      lastModified: Date.now(),
    });
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

export async function uploadScubaHeroWithResult(file: File) {
  try {
    const optimized = await optimizeImageFile(file, {
      maxWidth: 3840,
      maxHeight: 2560,
      quality: 0.96,
      maxBytes: 7_000_000,
    });
    const form = new FormData();
    form.append("image", optimized);
    const res = await fetch(`${getApiUrl()}/api/scuba/hero`, {
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
    const optimized = await optimizeImageFile(file, {
      maxWidth: 3840,
      maxHeight: 2560,
      quality: 0.96,
      maxBytes: 7_000_000,
    });
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
