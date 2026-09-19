import { getApiUrl, resolveMediaUrl } from "./api";
import { optimizeImageFile } from "./scuba";
import { supabase } from "./supabase";

export type SpaService = {
  id: string;
  category_id: string;
  name: string;
  mins: number | null;
  rate: string;
  sort_order: number;
};

export type SpaCategory = {
  id: string;
  label: string;
  note: string | null;
  image_url: string | null;
  sort_order: number;
  services: SpaService[];
};

export const SPA_UPDATED_EVENT = "jalyns:spa-updated";
export const SPA_BACKGROUNDS_UPDATED_EVENT = "jalyns:spa-backgrounds-updated";

export const DEFAULT_SPA_HERO =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2400&q=80";

export const DEFAULT_SPA_CONTENT =
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=2000&q=80";

export type SpaBackground = {
  url: string | null;
  path: string | null;
};

export type SpaGalleryImage = {
  path: string;
  url: string;
  alt: string;
};

export const DEFAULT_SPA_GALLERY: SpaGalleryImage[] = [
  {
    path: "fallback-1",
    url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    alt: "Restorative spa massage",
  },
  {
    path: "fallback-2",
    url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
    alt: "Hot stone spa treatment",
  },
  {
    path: "fallback-3",
    url: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1200&q=80",
    alt: "Facial spa treatment",
  },
];

export function spaMediaUrl(url: string | null | undefined) {
  return resolveMediaUrl(url) ?? "";
}

export function notifySpaUpdated(categories?: SpaCategory[]) {
  window.dispatchEvent(
    new CustomEvent(SPA_UPDATED_EVENT, {
      detail: { categories },
    }),
  );
}

export function notifySpaBackgroundsUpdated() {
  window.dispatchEvent(new CustomEvent(SPA_BACKGROUNDS_UPDATED_EVENT));
}

export function subscribeSpaBackgrounds(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(SPA_BACKGROUNDS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(SPA_BACKGROUNDS_UPDATED_EVENT, handler);
}

function apiMessage(body: { message?: string } | null, fallback: string) {
  return body?.message?.trim() || fallback;
}

async function fetchBackground(path: string): Promise<SpaBackground> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, { cache: "no-store" });
    const body = (await res.json()) as {
      success?: boolean;
      background?: SpaBackground;
    };
    if (!res.ok) return { url: null, path: null };
    return body.background ?? { url: null, path: null };
  } catch {
    return { url: null, path: null };
  }
}

async function uploadBackgroundWithResult(path: string, file: File) {
  try {
    const optimized = await optimizeImageFile(file, {
      maxWidth: 3840,
      maxHeight: 2560,
      quality: 0.96,
      maxBytes: 7_000_000,
    });
    const form = new FormData();
    form.append("image", optimized);
    const res = await fetch(`${getApiUrl()}${path}`, {
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
        error: apiMessage(body, "Could not upload image."),
        path: null as string | null,
        url: null as string | null,
      };
    }
    notifySpaBackgroundsUpdated();
    return { error: null as string | null, path: body.path ?? null, url: body.url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not upload image.",
      path: null as string | null,
      url: null as string | null,
    };
  }
}

async function removeBackground(path: string) {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      method: "DELETE",
      headers: await authHeaders(false),
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) return apiMessage(body, "Could not remove image.");
    notifySpaBackgroundsUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not remove image.";
  }
}

export async function fetchSpaHero(): Promise<SpaBackground> {
  return fetchBackground("/api/spa/hero");
}

export async function fetchSpaContentBackground(): Promise<SpaBackground> {
  return fetchBackground("/api/spa/content-background");
}

export async function uploadSpaHeroWithResult(file: File) {
  return uploadBackgroundWithResult("/api/spa/hero", file);
}

export async function uploadSpaContentBackgroundWithResult(file: File) {
  return uploadBackgroundWithResult("/api/spa/content-background", file);
}

export async function removeSpaHero() {
  return removeBackground("/api/spa/hero");
}

export async function removeSpaContentBackground() {
  return removeBackground("/api/spa/content-background");
}

export async function fetchSpaCategories(): Promise<SpaCategory[]> {
  const res = await fetch(`${getApiUrl()}/api/spa`, { cache: "no-store" });
  const body = (await res.json()) as {
    success?: boolean;
    message?: string;
    categories?: SpaCategory[];
  };
  if (!res.ok) {
    throw new Error(body.message ?? "Could not load spa treatments.");
  }
  return Array.isArray(body.categories) ? body.categories : [];
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

export async function uploadSpaImage(file: File) {
  const optimized = await optimizeImageFile(file, {
    maxWidth: 4500,
    maxHeight: 4500,
    quality: 0.98,
    maxBytes: 12_000_000,
  });
  const headers = await authHeaders(false);
  const body = new FormData();
  body.append("image", optimized);
  const res = await fetch(`${getApiUrl()}/api/spa/upload`, {
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

export async function createSpaCategory(input: {
  label: string;
  note?: string | null;
  image_url?: string | null;
  sort_order?: number;
}) {
  const res = await fetch(`${getApiUrl()}/api/spa/categories`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    category?: Omit<SpaCategory, "services">;
  };
  if (!res.ok || !data.category) {
    throw new Error(data.message ?? "Could not create category.");
  }
  return data.category;
}

export async function updateSpaCategory(
  id: string,
  input: {
    label: string;
    note?: string | null;
    image_url?: string | null;
    sort_order?: number;
  },
) {
  const res = await fetch(`${getApiUrl()}/api/spa/categories/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    category?: Omit<SpaCategory, "services">;
  };
  if (!res.ok || !data.category) {
    throw new Error(data.message ?? "Could not update category.");
  }
  return data.category;
}

export async function deleteSpaCategory(id: string) {
  const res = await fetch(`${getApiUrl()}/api/spa/categories/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok) throw new Error(data.message ?? "Could not delete category.");
}

export async function createSpaService(input: {
  category_id: string;
  name: string;
  mins?: number | null;
  rate: string;
  sort_order?: number;
}) {
  const res = await fetch(`${getApiUrl()}/api/spa/services`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    service?: SpaService;
  };
  if (!res.ok || !data.service) {
    throw new Error(data.message ?? "Could not create service.");
  }
  return data.service;
}

export async function updateSpaService(
  id: string,
  input: {
    category_id: string;
    name: string;
    mins?: number | null;
    rate: string;
    sort_order?: number;
  },
) {
  const res = await fetch(`${getApiUrl()}/api/spa/services/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    service?: SpaService;
  };
  if (!res.ok || !data.service) {
    throw new Error(data.message ?? "Could not update service.");
  }
  return data.service;
}

export async function deleteSpaService(id: string) {
  const res = await fetch(`${getApiUrl()}/api/spa/services/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok) throw new Error(data.message ?? "Could not delete service.");
}

export async function fetchSpaGallery(): Promise<SpaGalleryImage[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/spa/gallery`, { cache: "no-store" });
    const body = (await res.json()) as { success?: boolean; images?: SpaGalleryImage[] };
    if (!res.ok) return [];
    return Array.isArray(body.images) ? body.images : [];
  } catch {
    return [];
  }
}

export async function uploadSpaGalleryImages(
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
    const res = await fetch(`${getApiUrl()}/api/spa/gallery`, {
      method: "POST",
      headers: await authHeaders(false),
      body: form,
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) return apiMessage(body, "Could not upload gallery image.");
    onProgress?.(list.length, list.length);
    notifySpaBackgroundsUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not upload gallery image.";
  }
}

export async function replaceSpaGalleryImage(path: string, file: File) {
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
    const res = await fetch(`${getApiUrl()}/api/spa/gallery`, {
      method: "PUT",
      headers: await authHeaders(false),
      body: form,
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) return apiMessage(body, "Could not replace image.");
    notifySpaBackgroundsUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not replace image.";
  }
}

export async function deleteSpaGalleryImage(path: string) {
  try {
    const res = await fetch(
      `${getApiUrl()}/api/spa/gallery?path=${encodeURIComponent(path)}`,
      {
        method: "DELETE",
        headers: await authHeaders(false),
      },
    );
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) return apiMessage(body, "Could not delete image.");
    notifySpaBackgroundsUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not delete image.";
  }
}
