import { supabase } from "./supabase";

/**
 * Prefer a refreshed JWT — stale access tokens often surface as
 * "Auth session missing!" from Supabase Auth.
 */
export async function freshAccessToken(): Promise<string> {
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

/** Headers for admin API calls (survives Vite proxy dropping Authorization). */
export async function adminAuthHeaders(json = true): Promise<Record<string, string>> {
  const token = await freshAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-access-token": token,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}
