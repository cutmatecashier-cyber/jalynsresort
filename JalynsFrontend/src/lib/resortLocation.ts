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
