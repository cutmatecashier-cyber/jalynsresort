/** Jalyn's Resort & Restaurant — Western Nautical Hwy, Puerto Galera */
export const RESORT_LOCATION = {
  name: "Jalyn's Resort & Restaurant",
  addressLine: "Western Nautical Highway, Puerto Galera, Oriental Mindoro, Philippines",
  fullAddress:
    "Jalyn's Resort & Restaurant, Western Nautical Hwy, Puerto Galera, 5203 Oriental Mindoro, Philippines",
  // Jalyn's Resort Sabang — used for distance calculations
  lat: 13.513459,
  lng: 120.972437,
} as const;

export type ResortContactSettings = {
  contact_email: string;
  phone: string;
  facebook_url: string;
  updated_at?: string;
};

/** Extract up to 10 local PH mobile digits from any stored phone format. */
export function toLocalPhMobileDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length >= 12) return digits.slice(2, 12);
  if (digits.startsWith("0") && digits.length >= 11) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

/** Keep only digits and cap at 10 (for typing/paste). */
export function sanitizeLocalPhMobileInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/** Persist as +639476197535 */
export function formatPhMobileForStorage(local10: string): string {
  const digits = sanitizeLocalPhMobileInput(local10);
  return `+63${digits}`;
}

/** Display as +63 9476197535 */
export function formatPhMobileForDisplay(phone: string): string {
  const local = toLocalPhMobileDigits(phone);
  if (local.length === 10) return `+63 ${local}`;
  if (local.length > 0) return `+63 ${local}`;
  return phone.trim() || "+63";
}

export function isValidPhMobileLocal(local10: string): boolean {
  return /^\d{10}$/.test(local10);
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Embed map with a pin only — no Google place-info box (Open in Maps handles that). */
export function mapsEmbedUrl(lat: number, lng: number, zoom = 16) {
  return `https://maps.google.com/maps?q=${lat},${lng}&ll=${lat},${lng}&z=${zoom}&hl=en&output=embed`;
}

export function mapsOpenUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
