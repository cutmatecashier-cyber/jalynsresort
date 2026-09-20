import { getApiUrl } from "./api";
import { adminAuthHeaders } from "./adminAuth";

export type GalleryPhoto = {
  id: string;
  alt: string;
  image: string;
};

export const DEFAULT_GALLERY: GalleryPhoto[] = [
  {
    id: "aerial",
    alt: "Aerial view of the resort cove",
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "diver",
    alt: "Scuba diver exploring coral reef",
    image:
      "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "food",
    alt: "Fresh seafood platter at the restaurant",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "room",
    alt: "Bright guest room with ocean light",
    image:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "pool",
    alt: "Resort pool at golden hour",
    image:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=900&q=80",
  },
];

export const GALLERY_UPDATED_EVENT = "jalyns:gallery-updated";

export function galleryMediaUrl(url: string) {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = getApiUrl().replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function notifyGalleryUpdated(photos?: GalleryPhoto[]) {
  window.dispatchEvent(
    new CustomEvent(GALLERY_UPDATED_EVENT, {
      detail: { photos },
    }),
  );
}

export async function fetchGallery(): Promise<GalleryPhoto[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/gallery?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const body = (await res.json()) as {
      success?: boolean;
      photos?: GalleryPhoto[];
    };
    // Trust API list even when shorter after deletes (do not fall back to defaults).
    if (res.ok && Array.isArray(body.photos)) {
      return body.photos;
    }
  } catch {
    // keep defaults only on network failure
  }
  return DEFAULT_GALLERY.map((p) => ({ ...p }));
}

export async function uploadGalleryPhoto(
  file: File,
  options?: { alt?: string; replaceId?: string },
) {
  const body = new FormData();
  body.append("image", file);
  if (options?.alt) body.append("alt", options.alt);
  if (options?.replaceId) body.append("replaceId", options.replaceId);
  const res = await fetch(`${getApiUrl()}/api/gallery/upload`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
    body,
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    photos?: GalleryPhoto[];
    url?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not upload gallery photo.");
  }
  return data;
}

export async function deleteGalleryPhoto(id: string) {
  const res = await fetch(`${getApiUrl()}/api/gallery/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await adminAuthHeaders(false),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    photos?: GalleryPhoto[];
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not delete gallery photo.");
  }
  return data;
}

export async function resetGalleryPhotos() {
  const res = await fetch(`${getApiUrl()}/api/gallery/reset`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    photos?: GalleryPhoto[];
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not reset gallery.");
  }
  return data;
}
