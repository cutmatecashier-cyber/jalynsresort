import { getApiUrl } from "./api";
import { optimizeImageFile } from "./scuba";
import { supabase } from "./supabase";

export const DEFAULT_CONTACT_HERO =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2400&q=80";

export const DEFAULT_CONTACT_CONTENT =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2400&q=80";

export type ContactBackground = {
  url: string | null;
  path: string | null;
};

export const CONTACT_UPDATED_EVENT = "jalyns:contact-updated";

export function notifyContactUpdated() {
  window.dispatchEvent(new CustomEvent(CONTACT_UPDATED_EVENT));
}

export function subscribeContactBackgrounds(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(CONTACT_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CONTACT_UPDATED_EVENT, handler);
}

function apiMessage(body: { message?: string } | null, fallback: string) {
  return body?.message?.trim() || fallback;
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

async function fetchBackground(path: string): Promise<ContactBackground> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, { cache: "no-store" });
    const body = await readJson<{
      success?: boolean;
      background?: ContactBackground;
    }>(res);
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
    notifyContactUpdated();
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
    const body = await readJson<{ success?: boolean; message?: string }>(res);
    if (!res.ok) return apiMessage(body, "Could not remove image.");
    notifyContactUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not remove image.";
  }
}

export async function fetchContactHero(): Promise<ContactBackground> {
  return fetchBackground("/api/contact/hero");
}

export async function fetchContactContentBackground(): Promise<ContactBackground> {
  return fetchBackground("/api/contact/content-background");
}

export async function uploadContactHeroWithResult(file: File) {
  return uploadBackgroundWithResult("/api/contact/hero", file);
}

export async function uploadContactContentBackgroundWithResult(file: File) {
  return uploadBackgroundWithResult("/api/contact/content-background", file);
}

export async function removeContactHero() {
  return removeBackground("/api/contact/hero");
}

export async function removeContactContentBackground() {
  return removeBackground("/api/contact/content-background");
}
