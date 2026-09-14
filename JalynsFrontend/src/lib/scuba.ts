import { supabase } from "./supabase";
import type { DivingRate, PadiScubaCourse } from "../types/database";

export const SCUBA_BUCKET = "scuba-diving";
export const SCUBA_HERO_FOLDER = "hero";
export const SCUBA_CONTENT_FOLDER = "content";
export const SCUBA_GALLERY_FOLDER = "gallery";

/** Stable filenames so the saved background always resolves without relying on list order. */
const STABLE_HERO_PATH = `${SCUBA_HERO_FOLDER}/current.webp`;
const STABLE_CONTENT_PATH = `${SCUBA_CONTENT_FOLDER}/current.webp`;

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

export const MISSING_SCUBA_TABLES =
  "Scuba tables are missing. Run supabase/SCUBA_DIVING.sql in the Supabase SQL Editor, then refresh.";

function isMissingTable(message: string, code?: string) {
  return (
    code === "PGRST205" ||
    /could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message) ||
    /schema cache/i.test(message)
  );
}

export function scubaErrorMessage(error: { message: string; code?: string } | null, fallback: string) {
  if (!error) return fallback;
  if (isMissingTable(error.message, error.code)) return MISSING_SCUBA_TABLES;
  return error.message || fallback;
}

export function displayPrice(price: string) {
  const trimmed = price.trim();
  if (!trimmed) return trimmed;
  if (/[a-zA-Z]/.test(trimmed) || trimmed.startsWith("₱")) return trimmed;
  const numeric = Number(trimmed.replace(/,/g, ""));
  if (Number.isFinite(numeric)) return `₱${numeric.toLocaleString("en-PH")}`;
  return trimmed;
}

function publicImageUrl(path: string, cacheKey?: string) {
  const { data } = supabase.storage.from(SCUBA_BUCKET).getPublicUrl(path);
  const url = data.publicUrl;
  if (!cacheKey) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheKey)}`;
}

function isImageFile(name: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(name) && !name.startsWith(".");
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

async function urlExists(url: string) {
  try {
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) return true;
    // Some CDNs disallow HEAD — fall back to a tiny ranged GET.
    const get = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

/** Compress/resize images client-side before upload (keeps quality high). */
export async function optimizeImageFile(
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<File> {
  const maxWidth = options?.maxWidth ?? 1920;
  const maxHeight = options?.maxHeight ?? 1920;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  // Already small enough — keep the original file for best quality.
  if (file.size <= 900_000 && quality >= 0.9) return file;

  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    // Skip re-encoding when no resize is needed and quality target is already high.
    if (scale >= 1 && quality >= 0.92 && file.size <= 2_500_000) return file;

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

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/webp", quality);
    });
    if (!blob) return file;
    // Prefer original when compression barely helps or looks worse.
    if (blob.size >= file.size * 0.95) return file;

    const base = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

async function listFolderImages(folder: string) {
  const { data, error } = await supabase.storage.from(SCUBA_BUCKET).list(folder, {
    limit: 100,
    sortBy: { column: "updated_at", order: "desc" },
  });
  if (error || !data) return [];
  return data.filter((item) => item.name && isImageFile(item.name));
}

async function resolveFolderBackground(
  folder: string,
  stablePath: string,
): Promise<ScubaBackground> {
  const files = await listFolderImages(folder);
  const stable = files.find((file) => file.name.startsWith("current."));
  const newest = stable ?? files[0];

  if (newest) {
    const path = `${folder}/${newest.name}`;
    return {
      path,
      url: publicImageUrl(path, newest.updated_at ?? newest.created_at ?? String(Date.now())),
    };
  }

  // Fallback when list is empty/flaky but the stable object still exists.
  const probeUrl = publicImageUrl(stablePath, String(Date.now()));
  if (await urlExists(probeUrl)) {
    return { path: stablePath, url: probeUrl };
  }

  return { url: null, path: null };
}

async function uploadStableBackground(
  folder: string,
  _stablePath: string,
  file: File,
  optimizeOpts?: { maxWidth?: number; maxHeight?: number; quality?: number },
) {
  const optimized = await optimizeImageFile(file, optimizeOpts);
  const ext =
    optimized.type === "image/webp"
      ? "webp"
      : optimized.type === "image/png"
        ? "png"
        : optimized.type === "image/gif"
          ? "gif"
          : "jpg";
  const stablePath = `${folder}/current.${ext}`;

  const { error } = await supabase.storage.from(SCUBA_BUCKET).upload(stablePath, optimized, {
    cacheControl: "3600",
    upsert: true,
    contentType: optimized.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
  });
  if (error) {
    return { error: scubaErrorMessage(error, "Could not upload image."), path: null as string | null };
  }

  const leftovers = (await listFolderImages(folder))
    .filter((item) => `${folder}/${item.name}` !== stablePath)
    .map((item) => `${folder}/${item.name}`);
  if (leftovers.length) {
    await supabase.storage.from(SCUBA_BUCKET).remove(leftovers);
  }

  return {
    error: null as string | null,
    path: stablePath,
    url: publicImageUrl(stablePath, String(Date.now())),
  };
}

async function removeFolderImages(folder: string) {
  const files = await listFolderImages(folder);
  const paths = files.map((item) => `${folder}/${item.name}`);
  if (!paths.length) return null;
  const { error } = await supabase.storage.from(SCUBA_BUCKET).remove(paths);
  return error ? scubaErrorMessage(error, "Could not remove image.") : null;
}

export async function fetchDivingRates() {
  const { data, error } = await supabase.from("diving_rates").select("id, service, price").order("id");
  return {
    rows: (data as DivingRate[] | null) ?? [],
    error: error ? scubaErrorMessage(error, "Could not load diving rates.") : null,
  };
}

export async function fetchPadiCourses() {
  const { data, error } = await supabase
    .from("padi_scuba_courses")
    .select("id, course, details, price")
    .order("id");
  return {
    rows: (data as PadiScubaCourse[] | null) ?? [],
    error: error ? scubaErrorMessage(error, "Could not load PADI courses.") : null,
  };
}

export async function createDivingRate(service: string, price: string) {
  const { error } = await supabase.from("diving_rates").insert({ service, price });
  return error ? scubaErrorMessage(error, "Could not add service.") : null;
}

export async function updateDivingRate(id: number, service: string, price: string) {
  const { error } = await supabase.from("diving_rates").update({ service, price }).eq("id", id);
  return error ? scubaErrorMessage(error, "Could not update service.") : null;
}

export async function deleteDivingRate(id: number) {
  const { error } = await supabase.from("diving_rates").delete().eq("id", id);
  return error ? scubaErrorMessage(error, "Could not delete service.") : null;
}

export async function createPadiCourse(course: string, details: string, price: string) {
  const { error } = await supabase.from("padi_scuba_courses").insert({ course, details, price });
  return error ? scubaErrorMessage(error, "Could not add course.") : null;
}

export async function updatePadiCourse(id: number, course: string, details: string, price: string) {
  const { error } = await supabase
    .from("padi_scuba_courses")
    .update({ course, details, price })
    .eq("id", id);
  return error ? scubaErrorMessage(error, "Could not update course.") : null;
}

export async function deletePadiCourse(id: number) {
  const { error } = await supabase.from("padi_scuba_courses").delete().eq("id", id);
  return error ? scubaErrorMessage(error, "Could not delete course.") : null;
}

export async function fetchScubaHero(): Promise<ScubaBackground> {
  return resolveFolderBackground(SCUBA_HERO_FOLDER, STABLE_HERO_PATH);
}

export async function fetchScubaContentBackground(): Promise<ScubaBackground> {
  return resolveFolderBackground(SCUBA_CONTENT_FOLDER, STABLE_CONTENT_PATH);
}

export async function fetchScubaGallery(): Promise<ScubaImage[]> {
  const { data, error } = await supabase.storage.from(SCUBA_BUCKET).list(SCUBA_GALLERY_FOLDER, {
    limit: 100,
    sortBy: { column: "created_at", order: "asc" },
  });
  if (error || !data) return [];
  return data
    .filter((item) => item.name && isImageFile(item.name))
    .map((file) => {
      const path = `${SCUBA_GALLERY_FOLDER}/${file.name}`;
      return {
        path,
        url: publicImageUrl(path, file.updated_at ?? file.created_at ?? file.name),
        alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      };
    });
}

export async function uploadScubaHero(file: File) {
  const result = await uploadStableBackground(SCUBA_HERO_FOLDER, STABLE_HERO_PATH, file, {
    maxWidth: 3200,
    maxHeight: 2200,
    quality: 0.94,
  });
  return result.error;
}

export async function uploadScubaHeroWithResult(file: File) {
  return uploadStableBackground(SCUBA_HERO_FOLDER, STABLE_HERO_PATH, file, {
    maxWidth: 3200,
    maxHeight: 2200,
    quality: 0.94,
  });
}

export async function removeScubaHero() {
  return removeFolderImages(SCUBA_HERO_FOLDER);
}

export async function uploadScubaContentBackground(file: File) {
  const result = await uploadStableBackground(SCUBA_CONTENT_FOLDER, STABLE_CONTENT_PATH, file, {
    maxWidth: 3200,
    maxHeight: 2200,
    quality: 0.94,
  });
  return result.error;
}

export async function uploadScubaContentBackgroundWithResult(file: File) {
  return uploadStableBackground(SCUBA_CONTENT_FOLDER, STABLE_CONTENT_PATH, file, {
    maxWidth: 3200,
    maxHeight: 2200,
    quality: 0.94,
  });
}

export async function removeScubaContentBackground() {
  return removeFolderImages(SCUBA_CONTENT_FOLDER);
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

  let done = 0;
  onProgress?.(0, list.length);

  const queue = [...list];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length) {
      const file = queue.shift();
      if (!file) break;
      const optimized = await optimizeImageFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
      });
      const base = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "gallery";
      const path = `${SCUBA_GALLERY_FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base}.webp`;
      const { error } = await supabase.storage.from(SCUBA_BUCKET).upload(path, optimized, {
        cacheControl: "3600",
        upsert: false,
        contentType: optimized.type || "image/webp",
      });
      if (error) throw new Error(scubaErrorMessage(error, "Could not upload gallery image."));
      done += 1;
      onProgress?.(done, list.length);
    }
  });

  try {
    await Promise.all(workers);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not upload gallery image.";
  }
}

export async function replaceScubaGalleryImage(path: string, file: File) {
  const optimized = await optimizeImageFile(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.8,
  });
  const { error } = await supabase.storage.from(SCUBA_BUCKET).update(path, optimized, {
    cacheControl: "3600",
    upsert: true,
    contentType: optimized.type || "image/webp",
  });
  return error ? scubaErrorMessage(error, "Could not replace image.") : null;
}

export async function deleteScubaGalleryImage(path: string) {
  const { error } = await supabase.storage.from(SCUBA_BUCKET).remove([path]);
  return error ? scubaErrorMessage(error, "Could not delete image.") : null;
}

export function subscribeScubaTables(onChange: () => void) {
  const channel = supabase
    .channel("scuba-pricing")
    .on("postgres_changes", { event: "*", schema: "public", table: "diving_rates" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "padi_scuba_courses" }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

const SETTINGS_PATH = "settings/config.json";
export const DEFAULT_PRICES_VALID_UNTIL = "Dec 2024";

export type ScubaPageSettings = {
  pricesValidUntil: string;
};

export function formatPricesValidUntil(monthValue: string) {
  // Expects YYYY-MM from <input type="month">
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

export async function fetchScubaPageSettings(): Promise<ScubaPageSettings> {
  const { data, error } = await supabase.storage.from(SCUBA_BUCKET).download(SETTINGS_PATH);
  if (error || !data) {
    return { pricesValidUntil: DEFAULT_PRICES_VALID_UNTIL };
  }
  try {
    const json = JSON.parse(await data.text()) as Partial<ScubaPageSettings>;
    const pricesValidUntil = String(json.pricesValidUntil ?? "").trim();
    return {
      pricesValidUntil: pricesValidUntil || DEFAULT_PRICES_VALID_UNTIL,
    };
  } catch {
    return { pricesValidUntil: DEFAULT_PRICES_VALID_UNTIL };
  }
}

export async function saveScubaPageSettings(settings: ScubaPageSettings) {
  const payload: ScubaPageSettings = {
    pricesValidUntil: settings.pricesValidUntil.trim() || DEFAULT_PRICES_VALID_UNTIL,
  };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const { error } = await supabase.storage.from(SCUBA_BUCKET).upload(SETTINGS_PATH, blob, {
    cacheControl: "60",
    upsert: true,
    contentType: "application/json",
  });
  return error ? scubaErrorMessage(error, "Could not save price validity date.") : null;
}
