import { getApiUrl } from "./api";
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

export function spaMediaUrl(url: string | null | undefined) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = getApiUrl().replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function notifySpaUpdated(categories?: SpaCategory[]) {
  window.dispatchEvent(
    new CustomEvent(SPA_UPDATED_EVENT, {
      detail: { categories },
    }),
  );
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
  const headers = await authHeaders(false);
  const body = new FormData();
  body.append("image", file);
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
