import { getApiUrl } from "./api";
import { optimizeImageFile } from "./scuba";
import { supabase } from "./supabase";

export const DEFAULT_RESTAURANT_HERO =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2400&q=80";

export const DEFAULT_RESTAURANT_CONTENT =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2400&q=80";

export type RestaurantBackground = {
  url: string | null;
  path: string | null;
};

export type RestaurantReview = {
  id: string;
  user_id: string | null;
  guest_name: string;
  rating: number;
  comment: string;
  admin_reply: string | null;
  admin_reply_by: string | null;
  admin_reply_name: string | null;
  admin_reply_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export const RESTAURANT_UPDATED_EVENT = "jalyns:restaurant-updated";

export function notifyRestaurantUpdated() {
  window.dispatchEvent(new CustomEvent(RESTAURANT_UPDATED_EVENT));
}

export function subscribeRestaurantBackgrounds(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(RESTAURANT_UPDATED_EVENT, handler);
  return () => window.removeEventListener(RESTAURANT_UPDATED_EVENT, handler);
}

function apiMessage(body: { message?: string } | null, fallback: string) {
  return body?.message?.trim() || fallback;
}

async function freshAccessToken(): Promise<string> {
  // Prefer a refreshed JWT — stale access tokens often surface as "Auth session missing!".
  const refreshed = await supabase.auth.refreshSession();
  let token = refreshed.data.session?.access_token ?? null;

  if (!token) {
    const current = await supabase.auth.getSession();
    token = current.data.session?.access_token ?? null;
  }

  if (!token) {
    throw new Error("Admin session expired. Please sign in again, then retry.");
  }
  return token;
}

async function authHeaders(json = true): Promise<Record<string, string>> {
  const token = await freshAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    // Survives Vite proxy cases that drop Authorization.
    "x-access-token": token,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function optionalAuthHeaders(json = true): Promise<Record<string, string>> {
  try {
    const token = await freshAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "x-access-token": token,
    };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  } catch {
    const headers: Record<string, string> = {};
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function fetchBackground(path: string): Promise<RestaurantBackground> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, { cache: "no-store" });
    const body = await readJson<{
      success?: boolean;
      background?: RestaurantBackground;
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
    notifyRestaurantUpdated();
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
    notifyRestaurantUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not remove image.";
  }
}

export async function fetchRestaurantHero(): Promise<RestaurantBackground> {
  return fetchBackground("/api/restaurant/hero");
}

export async function fetchRestaurantContentBackground(): Promise<RestaurantBackground> {
  return fetchBackground("/api/restaurant/content-background");
}

export async function uploadRestaurantHeroWithResult(file: File) {
  return uploadBackgroundWithResult("/api/restaurant/hero", file);
}

export async function uploadRestaurantContentBackgroundWithResult(file: File) {
  return uploadBackgroundWithResult("/api/restaurant/content-background", file);
}

export async function removeRestaurantHero() {
  return removeBackground("/api/restaurant/hero");
}

export async function removeRestaurantContentBackground() {
  return removeBackground("/api/restaurant/content-background");
}

export async function fetchRestaurantReviews(): Promise<RestaurantReview[]> {
  const res = await fetch(`${getApiUrl()}/api/reviews/restaurant`, { cache: "no-store" });
  const body = await readJson<{
    success?: boolean;
    message?: string;
    reviews?: RestaurantReview[];
  }>(res);
  if (!res.ok) throw new Error(apiMessage(body, "Could not load reviews."));
  return Array.isArray(body.reviews) ? body.reviews : [];
}

export async function createRestaurantReview(input: {
  guest_name: string;
  rating: number;
  comment: string;
}): Promise<{ review: RestaurantReview; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/reviews/restaurant`, {
    method: "POST",
    headers: await optionalAuthHeaders(true),
    body: JSON.stringify(input),
  });
  const body = await readJson<{
    success?: boolean;
    message?: string;
    review?: RestaurantReview;
  }>(res);
  if (!res.ok || !body.review) {
    throw new Error(apiMessage(body, "Could not save your review."));
  }
  return {
    review: body.review,
    message: body.message ?? "Thank you! Your review has been posted.",
  };
}

export async function replyToRestaurantReview(
  reviewId: string,
  reply: string,
): Promise<{ review: RestaurantReview | null; error: string | null }> {
  try {
    const token = await freshAccessToken();
    const res = await fetch(`${getApiUrl()}/api/reviews/restaurant/${reviewId}/reply`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-access-token": token,
        "Content-Type": "application/json",
      },
      // Body token survives proxies that drop Authorization.
      body: JSON.stringify({ reply, access_token: token }),
    });
    const body = await readJson<{
      success?: boolean;
      message?: string;
      review?: RestaurantReview;
    }>(res);
    if (!res.ok || !body.review) {
      return { review: null, error: apiMessage(body, "Could not save reply.") };
    }
    return { review: body.review, error: null };
  } catch (err) {
    return {
      review: null,
      error: err instanceof Error ? err.message : "Could not save reply.",
    };
  }
}

export async function deleteRestaurantReviewReply(
  reviewId: string,
): Promise<{ review: RestaurantReview | null; error: string | null }> {
  try {
    const token = await freshAccessToken();
    const res = await fetch(`${getApiUrl()}/api/reviews/restaurant/${reviewId}/reply`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-access-token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: token }),
    });
    const body = await readJson<{
      success?: boolean;
      message?: string;
      review?: RestaurantReview;
    }>(res);
    if (!res.ok || !body.review) {
      return { review: null, error: apiMessage(body, "Could not delete reply.") };
    }
    return { review: body.review, error: null };
  } catch (err) {
    return {
      review: null,
      error: err instanceof Error ? err.message : "Could not delete reply.",
    };
  }
}
