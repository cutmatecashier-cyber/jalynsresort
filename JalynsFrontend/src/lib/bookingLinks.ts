import { getApiUrl } from "./api";
import { adminAuthHeaders } from "./adminAuth";

export type BookingLink = {
  id: string;
  name: string;
  url: string;
};

export const BOOKING_LINKS_EVENT = "jalyns:booking-links";

function apiMessage(body: { message?: string } | null, fallback: string) {
  return body?.message?.trim() || fallback;
}

export async function fetchBookingLinks(): Promise<BookingLink[]> {
  const res = await fetch(`${getApiUrl()}/api/booking-links`, { cache: "no-store" });
  const body = (await res.json()) as { message?: string; links?: BookingLink[] };
  if (!res.ok) throw new Error(apiMessage(body, "Could not load booking links."));
  return Array.isArray(body.links) ? body.links : [];
}

export async function fetchManagedBookingLinks(): Promise<BookingLink[]> {
  const res = await fetch(`${getApiUrl()}/api/booking-links/manage`, {
    cache: "no-store",
    headers: await adminAuthHeaders(),
  });
  const body = (await res.json()) as { message?: string; links?: BookingLink[] };
  if (!res.ok) throw new Error(apiMessage(body, "Could not load booking links."));
  return Array.isArray(body.links) ? body.links : [];
}

export async function saveBookingLinks(links: BookingLink[]): Promise<BookingLink[]> {
  const res = await fetch(`${getApiUrl()}/api/booking-links`, {
    method: "PUT",
    cache: "no-store",
    headers: await adminAuthHeaders(),
    body: JSON.stringify({
      links: links.map((link) => ({
        id: link.id,
        name: link.name.trim(),
        url: link.url.trim(),
      })),
    }),
  });
  const body = (await res.json()) as { message?: string; publicLinks?: BookingLink[] };
  if (!res.ok) throw new Error(apiMessage(body, "Could not save booking links."));
  return Array.isArray(body.publicLinks) ? body.publicLinks : [];
}
