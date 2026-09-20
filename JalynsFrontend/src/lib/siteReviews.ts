import { getApiUrl } from "./api";
import { supabase } from "./supabase";

export type SiteReview = {
  id: string;
  user_id: string | null;
  guest_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

function apiMessage(body: { message?: string } | null, fallback: string) {
  return body?.message?.trim() || fallback;
}

async function optionalAuthHeaders(): Promise<Record<string, string>> {
  try {
    const refreshed = await supabase.auth.refreshSession();
    let token = refreshed.data.session?.access_token ?? null;
    if (!token) {
      const current = await supabase.auth.getSession();
      token = current.data.session?.access_token ?? null;
    }
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      "x-access-token": token,
      "Content-Type": "application/json",
    };
  } catch {
    return { "Content-Type": "application/json" };
  }
}

export async function fetchSiteReviews(): Promise<SiteReview[]> {
  const res = await fetch(`${getApiUrl()}/api/reviews/site`, { cache: "no-store" });
  const body = (await res.json()) as {
    success?: boolean;
    message?: string;
    reviews?: SiteReview[];
  };
  if (!res.ok) throw new Error(apiMessage(body, "Could not load reviews."));
  return Array.isArray(body.reviews) ? body.reviews : [];
}

export async function createSiteReview(input: {
  guest_name: string;
  rating: number;
  comment: string;
}): Promise<{ review: SiteReview; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/reviews/site`, {
    method: "POST",
    headers: await optionalAuthHeaders(),
    body: JSON.stringify(input),
  });
  const body = (await res.json()) as {
    success?: boolean;
    message?: string;
    review?: SiteReview;
  };
  if (!res.ok || !body.review) {
    throw new Error(apiMessage(body, "Could not save your review."));
  }
  return {
    review: body.review,
    message: body.message ?? "Thank you! Your review has been posted.",
  };
}
