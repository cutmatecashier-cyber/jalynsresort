import { getApiUrl } from "./api";
import { adminAuthHeaders } from "./adminAuth";
import { optimizeImageFile } from "./scuba";

export type RoomStatus = "available" | "unavailable";

export type Room = {
  id: string;
  name: string;
  description: string;
  size: string;
  max_capacity: string;
  beds: string;
  price_per_night: string;
  extra_person_charge: string;
  rules_policies: string;
  status: RoomStatus;
  amenities: string[];
  images: string[];
  sort_order: number;
};

export type RoomsVoucher = {
  enabled: boolean;
  percent: number;
};

export type RoomHighlight = {
  id: string;
  image: string;
};

/** @deprecated Use Room */
export type RoomPhoto = Room;

export type RoomsBackground = {
  url: string | null;
  path: string | null;
};

export const DEFAULT_ROOMS_HERO =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2400&q=80";

export const DEFAULT_ROOMS_CONTENT =
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2400&q=80";

export const DEFAULT_ROOMS: Room[] = [
  {
    id: "budget-double",
    name: "Budget Double Bedroom",
    description:
      "Discover affordability and comfort in our budget streetside room at Jalyn's Resort. Enjoy a cozy retreat with a comfortable Queen size bed, an en-suite bathroom, and a modest yet inviting ambiance. The large window provides a view of the lively street side of the resort. You have access to all amenities of the resort incl. 3 swimming pools. Our restaurant is just a short step away from your room.",
    size: "20m²",
    max_capacity: "2 guests",
    beds: "Queen size bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Air conditioned",
      "Ceiling Fans",
      "Private bathroom",
      "Shower",
      "Fridge",
      "Television",
      "Wireless Internet",
      "Closets in room",
      "Towels",
      "Swimming Pools",
    ],
    images: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 1,
  },
  {
    id: "standard-double",
    name: "Standard Double Bedroom",
    description:
      "Embrace tranquility in our Standard Room at Jalyn's Resort. Indulge in a peaceful garden view from your private terrace, accompanied by convenient kitchen facilities. This thoughtfully designed space ensures a comfortable and serene stay with modern amenities.",
    size: "25m²",
    max_capacity: "2 guests",
    beds: "King size bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Garden view",
      "Wireless Internet",
      "TV",
      "Fridge",
      "Patio",
      "Outdoor Setting",
      "Kitchenette",
      "Housekeeping",
      "Free Toiletries",
      "En-suite Bathroom",
      "Daily Room Service",
      "Tea/Coffee Maker",
      "Ceiling Fans",
      "Air conditioned",
    ],
    images: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 2,
  },
  {
    id: "studio-apartment",
    name: "Studio Apartment incl Kitchenette",
    description:
      "Make Jalyn's Resort your home away from home with our Studio Apartment, designed for long-term stays. Enjoy the convenience of a fully-equipped kitchenette and unwind on your private terrace with a soothing pool view. Immerse yourself in comfort and independence. It's the perfect setting for an extended retreat with all the amenities at your fingertips.",
    size: "35m²",
    max_capacity: "2 guests",
    beds: "King size bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Pool view",
      "Wireless Internet",
      "TV",
      "Internet Access",
      "Room Safe",
      "Fridge",
      "Linen and Towels Provided",
      "Kitchen supplies",
      "Kitchenette",
      "Air conditioned",
    ],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 3,
  },
  {
    id: "standard-pool",
    name: "Standard Pool Room",
    description:
      "Discover relaxation in our Standard Pool Room at Jalyn's Resort. Enjoy a pool view from your private terrace or balcony, creating a tranquil retreat. Unwind in comfort and soak in the serene ambiance, making your stay a delightful experience.",
    size: "20m²",
    max_capacity: "2 guests",
    beds: "Queen size bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Pool view",
      "Poolside terrace",
      "Wireless Internet",
      "TV",
      "Fridge",
      "Housekeeping",
      "Free Toiletries",
      "En-suite Bathroom",
      "Daily Room Service",
      "Tea/Coffee Maker",
      "Ceiling Fans",
      "Air conditioned",
    ],
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 4,
  },
  {
    id: "premium-pool",
    name: "Premium Pool Room",
    description:
      "Discover luxury in our Premium Pool Room, featuring serene pool and garden views. Enjoy cleanliness and comfort with all the modern amenities, and a private balcony where you can relax in peace.",
    size: "35m²",
    max_capacity: "2 guests",
    beds: "King size bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Garden view",
      "Wireless Internet",
      "TV",
      "Fridge",
      "Housekeeping",
      "Free Toiletries",
      "En-suite Bathroom",
      "Daily Room Service",
      "Tea/Coffee Maker",
      "Ceiling Fans",
      "Air conditioned",
    ],
    images: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 5,
  },
  {
    id: "premium-double",
    name: "Premium Double Bedroom",
    description:
      "Unwind in our Premium Double Bedroom at Jalyn's Resort, where every evening is a masterpiece with beautiful sunsets over the sea from your private balcony. Immerse yourself in the tranquil ambiance as the sun dips below the horizon, casting a warm glow and creating a magical backdrop for your coastal retreat.",
    size: "35m²",
    max_capacity: "2 guests",
    beds: "King size bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Pool view",
      "Wireless Internet",
      "TV",
      "Fridge",
      "Housekeeping",
      "Free Toiletries",
      "En-suite Bathroom",
      "Dining area",
      "Daily Room Service",
      "Tea/Coffee Maker",
      "Ceiling Fans",
      "Air conditioned",
    ],
    images: [
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 6,
  },
  {
    id: "family-room",
    name: "Family Room",
    description:
      "Our Family Room is right next to the two lower swimming pools, so your kids have easy swimming access, and you can keep an eye on them from the terrace or even inside the room.",
    size: "40m²",
    max_capacity: "4 guests",
    beds: "King bed & Queen bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Pool view",
      "Wireless Internet",
      "TV",
      "Swimming Pool",
      "Lounge Area",
      "Housekeeping",
      "Free Toiletries",
      "En-suite Bathroom",
      "Tea/Coffee Maker",
      "Closets in room",
      "Ceiling Fans",
      "Balcony",
      "Air-conditioning",
    ],
    images: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 7,
  },
  {
    id: "premium-2bed",
    name: "Premium 2-Bedroom Apartment",
    description:
      "Escape to luxury in our Premium 2-Bedroom Apartment at Jalyn's Resort. Enjoy mesmerizing seaviews from your private balcony that overlooks the entire resort. This spacious retreat features two bedrooms, seamlessly blending comfort and panoramic coastal beauty for an unforgettable stay by the sea.",
    size: "55m²",
    max_capacity: "4 guests",
    beds: "King bed & Queen bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Pool view",
      "Ceiling Fans",
      "Dining Setting",
      "Fridge",
      "Shower",
      "Closets in room",
      "Television",
      "Towels",
      "Wireless Internet",
      "TV",
      "Private bathroom",
      "Air conditioned",
      "Balcony",
    ],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 8,
  },
  {
    id: "2bed-lounge",
    name: "2-Bedroom Apartment incl Lounge and Kitchen",
    description:
      "Escape to the serenity of Jalyn's Resort with our inviting 2-Bedroom Apartment, where comfort meets breathtaking sea views. This spacious retreat features two cozy bedrooms, a stylish lounge for relaxation, and a fully-equipped kitchen for your convenience. Admire the sunrise over the sparkling waters from your private balcony, creating the perfect start to your day. Immerse yourself in coastal tranquillity without sacrificing the comforts of home. Whether you're traveling with family or friends, this thoughtfully designed apartment offers the ideal blend of space, comfort, and a picturesque backdrop for an unforgettable stay by the sea.",
    size: "60m²",
    max_capacity: "4–5 guests",
    beds: "King bed & Queen bed",
    price_per_night: "Contact for rates",
    extra_person_charge: "",
    rules_policies: "",
    status: "available",
    amenities: [
      "Bay view",
      "Wireless Internet",
      "Television",
      "TV",
      "Fridge",
      "Kitchen",
      "Internet Access",
      "Housekeeping",
      "Free Toiletries",
      "Daily Room Service",
      "Tea/Coffee Maker",
      "Closets in room",
      "Bath",
      "Bathroom amenities",
      "Balcony",
      "Air-conditioning",
    ],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80",
    ],
    sort_order: 9,
  },
];

export const ROOMS_UPDATED_EVENT = "jalyns:rooms-updated";

function cloneDefaults() {
  return DEFAULT_ROOMS.map((r) => ({
    ...r,
    amenities: [...r.amenities],
    images: [...r.images],
  }));
}

function normalizeClientRoom(
  row: Partial<Room> & {
    image?: string;
    capacity?: string;
    price?: string;
  },
  index: number,
): Room | null {
  const images = Array.isArray(row.images)
    ? row.images.filter((u): u is string => typeof u === "string" && Boolean(u.trim()))
    : typeof row.image === "string" && row.image.trim()
      ? [row.image.trim()]
      : [];
  if (!images.length) return null;
  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `room-${index}`,
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : `Room ${index + 1}`,
    description: typeof row.description === "string" ? row.description : "",
    size: typeof row.size === "string" ? row.size : "",
    max_capacity:
      typeof row.max_capacity === "string" && row.max_capacity
        ? row.max_capacity
        : typeof row.capacity === "string"
          ? row.capacity
          : "",
    beds: typeof row.beds === "string" ? row.beds : "",
    price_per_night:
      typeof row.price_per_night === "string" && row.price_per_night
        ? row.price_per_night
        : typeof row.price === "string"
          ? row.price
          : "",
    extra_person_charge:
      typeof row.extra_person_charge === "string" ? row.extra_person_charge : "",
    rules_policies: typeof row.rules_policies === "string" ? row.rules_policies : "",
    status: row.status === "unavailable" ? "unavailable" : "available",
    amenities: Array.isArray(row.amenities)
      ? row.amenities.filter((a): a is string => typeof a === "string" && Boolean(a.trim()))
      : [],
    images,
    sort_order:
      typeof row.sort_order === "number" && Number.isFinite(row.sort_order)
        ? row.sort_order
        : index + 1,
  };
}

function normalizeVoucher(raw: unknown): RoomsVoucher {
  const row = (raw && typeof raw === "object" ? raw : {}) as Partial<RoomsVoucher>;
  const percentRaw =
    typeof row.percent === "number"
      ? row.percent
      : typeof row.percent === "string"
        ? Number(row.percent)
        : 0;
  const percent = Number.isFinite(percentRaw) ? Math.min(100, Math.max(0, percentRaw)) : 0;
  return {
    enabled: Boolean(row.enabled) && percent > 0,
    percent,
  };
}

export const DEFAULT_ROOMS_VOUCHER: RoomsVoucher = {
  enabled: false,
  percent: 0,
};

/** Pull a numeric amount from price text like "1200", "₱1,200", "1200 / night". */
export function parsePriceAmount(value: string): number | null {
  const raw = value.trim();
  if (!raw || raw === "—") return null;
  if (/contact/i.test(raw) && !/\d/.test(raw)) return null;
  const digits = raw.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const num = Number(digits);
  return Number.isFinite(num) ? num : null;
}

export function formatPesoAmount(num: number): string {
  return `₱${num.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

/** Format a stored price string for display (no voucher). */
export function formatRoomPrice(value: string): string {
  const raw = value.trim();
  if (!raw || raw === "—") return "—";
  const amount = parsePriceAmount(raw);
  if (amount == null) {
    if (/[₱$€]|peso|contact|night|\/\s*night/i.test(raw)) return raw;
    return raw;
  }
  return formatPesoAmount(amount);
}

/** Apply rooms voucher to a price string — returns discounted display + original. */
export function applyVoucherToPrice(
  priceText: string,
  voucher: RoomsVoucher,
): {
  display: string;
  original: string | null;
  percent: number | null;
  discountedAmount: number | null;
} {
  const amount = parsePriceAmount(priceText);
  if (amount == null) {
    return {
      display: formatRoomPrice(priceText),
      original: null,
      percent: null,
      discountedAmount: null,
    };
  }
  const original = formatPesoAmount(amount);
  if (!voucher.enabled || voucher.percent <= 0) {
    return { display: original, original: null, percent: null, discountedAmount: amount };
  }
  const discounted = Math.max(0, Math.round(amount * (1 - Math.min(100, voucher.percent) / 100)));
  return {
    display: formatPesoAmount(discounted),
    original,
    percent: voucher.percent,
    discountedAmount: discounted,
  };
}

export function roomsMediaUrl(url: string) {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = getApiUrl().replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function notifyRoomsUpdated(
  rooms?: Room[],
  voucher?: RoomsVoucher,
  highlights?: RoomHighlight[],
) {
  window.dispatchEvent(
    new CustomEvent(ROOMS_UPDATED_EVENT, {
      detail: { rooms, voucher, highlights },
    }),
  );
}

export function subscribeRoomsUpdated(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(ROOMS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(ROOMS_UPDATED_EVENT, handler);
}

function apiMessage(body: { message?: string } | null, fallback: string) {
  return body?.message?.trim() || fallback;
}

function normalizeHighlights(raw: unknown): RoomHighlight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      const item = (row && typeof row === "object" ? row : {}) as Partial<RoomHighlight>;
      const image = typeof item.image === "string" ? item.image.trim() : "";
      if (!image) return null;
      return {
        id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `highlight-${i}`,
        image,
      };
    })
    .filter((h): h is RoomHighlight => Boolean(h));
}

export async function fetchRoomsCatalog(): Promise<{
  rooms: Room[];
  voucher: RoomsVoucher;
  highlights: RoomHighlight[];
}> {
  try {
    const res = await fetch(`${getApiUrl()}/api/rooms?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const body = (await res.json()) as {
      success?: boolean;
      rooms?: Array<Partial<Room> & { image?: string; capacity?: string; price?: string }>;
      voucher?: RoomsVoucher;
      highlights?: RoomHighlight[];
    };
    if (res.ok && Array.isArray(body.rooms)) {
      const rooms = body.rooms
        .map((row, i) => normalizeClientRoom(row, i))
        .filter((r): r is Room => Boolean(r))
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      const highlights = normalizeHighlights(body.highlights);
      if (rooms.length) {
        return { rooms, voucher: normalizeVoucher(body.voucher), highlights };
      }
      return {
        rooms: cloneDefaults(),
        voucher: normalizeVoucher(body.voucher),
        highlights,
      };
    }
  } catch {
    // keep defaults only on network failure
  }
  return {
    rooms: cloneDefaults(),
    voucher: { ...DEFAULT_ROOMS_VOUCHER },
    highlights: [],
  };
}

export async function fetchRoomsVoucher(): Promise<RoomsVoucher> {
  try {
    const res = await fetch(`${getApiUrl()}/api/rooms/voucher?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const body = (await res.json()) as { success?: boolean; voucher?: RoomsVoucher };
    if (res.ok) return normalizeVoucher(body.voucher);
  } catch {
    // fall through
  }
  return { ...DEFAULT_ROOMS_VOUCHER };
}

export async function uploadRoomHighlights(files: File[]): Promise<RoomHighlight[]> {
  if (!files.length) throw new Error("Please choose at least one image.");
  const body = new FormData();
  for (const file of files) {
    const optimized = await optimizeImageFile(file, {
      maxWidth: 2200,
      maxHeight: 2200,
      quality: 0.92,
      maxBytes: 5_000_000,
    });
    body.append("images", optimized);
  }
  const res = await fetch(`${getApiUrl()}/api/rooms/highlights`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
    body,
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    highlights?: RoomHighlight[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not upload highlight photos."));
  const highlights = normalizeHighlights(data.highlights);
  notifyRoomsUpdated(undefined, undefined, highlights);
  return highlights;
}

export async function deleteRoomHighlightById(id: string): Promise<RoomHighlight[]> {
  const res = await fetch(`${getApiUrl()}/api/rooms/highlights/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await adminAuthHeaders(true),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    highlights?: RoomHighlight[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not delete highlight photo."));
  const highlights = normalizeHighlights(data.highlights);
  notifyRoomsUpdated(undefined, undefined, highlights);
  return highlights;
}

export async function fetchRooms(): Promise<Room[]> {
  return (await fetchRoomsCatalog()).rooms;
}

export type RoomBookingStatus = "pending" | "confirmed" | "completed";

export type RoomBooking = {
  id: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  full_name: string;
  email: string;
  phone: string;
  price_per_night: string | null;
  estimated_total: string | null;
  voucher_percent: number | null;
  status: RoomBookingStatus;
  created_at: string;
};

export type RoomBookingInput = {
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  fullName: string;
  email: string;
  phone: string;
  nights?: number;
  pricePerNight?: string | null;
  estimatedTotal?: string | null;
  voucherPercent?: number | null;
};

export async function submitRoomBooking(input: RoomBookingInput) {
  const res = await fetch(`${getApiUrl()}/api/rooms/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok) throw new Error(apiMessage(data, "Could not submit booking."));
  return data.message ?? "Booking request sent.";
}

export async function fetchRoomBookings(): Promise<RoomBooking[]> {
  const res = await fetch(`${getApiUrl()}/api/rooms/bookings?t=${Date.now()}`, {
    cache: "no-store",
    headers: await adminAuthHeaders(true),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    bookings?: RoomBooking[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not load bookings."));
  return Array.isArray(data.bookings) ? data.bookings : [];
}

export async function updateRoomBookingStatus(
  id: string,
  status: RoomBookingStatus,
): Promise<RoomBooking[]> {
  const res = await fetch(`${getApiUrl()}/api/rooms/bookings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await adminAuthHeaders(true),
    body: JSON.stringify({ status }),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    bookings?: RoomBooking[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not update booking."));
  return Array.isArray(data.bookings) ? data.bookings : [];
}

export async function updateRoomsVoucher(input: {
  enabled: boolean;
  percent: number;
}): Promise<RoomsVoucher> {
  const res = await fetch(`${getApiUrl()}/api/rooms/voucher`, {
    method: "PUT",
    headers: await adminAuthHeaders(true),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    voucher?: RoomsVoucher;
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not update voucher."));
  const voucher = normalizeVoucher(data.voucher ?? input);
  notifyRoomsUpdated(undefined, voucher);
  return voucher;
}

async function fetchBackground(path: string): Promise<RoomsBackground> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, { cache: "no-store" });
    const body = (await res.json()) as {
      success?: boolean;
      background?: RoomsBackground;
    };
    if (!res.ok) return { url: null, path: null };
    return body.background ?? { url: null, path: null };
  } catch {
    return { url: null, path: null };
  }
}

export async function fetchRoomsHero(): Promise<RoomsBackground> {
  return fetchBackground("/api/rooms/hero");
}

export async function fetchRoomsContentBackground(): Promise<RoomsBackground> {
  return fetchBackground("/api/rooms/content-background");
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
      headers: await adminAuthHeaders(false),
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
    notifyRoomsUpdated();
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
      headers: await adminAuthHeaders(false),
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) return apiMessage(body, "Could not remove image.");
    notifyRoomsUpdated();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not remove image.";
  }
}

export async function uploadRoomsHeroWithResult(file: File) {
  return uploadBackgroundWithResult("/api/rooms/hero", file);
}

export async function uploadRoomsContentBackgroundWithResult(file: File) {
  return uploadBackgroundWithResult("/api/rooms/content-background", file);
}

export async function removeRoomsHero() {
  return removeBackground("/api/rooms/hero");
}

export async function removeRoomsContentBackground() {
  return removeBackground("/api/rooms/content-background");
}

export type RoomFormInput = {
  name: string;
  description: string;
  size: string;
  max_capacity: string;
  beds: string;
  price_per_night: string;
  extra_person_charge: string;
  rules_policies: string;
  status: RoomStatus;
  amenities: string[];
};

export async function createRoomWithImage(file: File, input: RoomFormInput) {
  const optimized = await optimizeImageFile(file, {
    maxWidth: 2200,
    maxHeight: 2200,
    quality: 0.92,
    maxBytes: 5_000_000,
  });
  const body = new FormData();
  body.append("image", optimized);
  body.append("name", input.name?.trim() || "");
  body.append("description", input.description ?? "");
  body.append("size", input.size ?? "");
  body.append("max_capacity", input.max_capacity ?? "");
  body.append("beds", input.beds ?? "");
  body.append("price_per_night", input.price_per_night ?? "");
  body.append("extra_person_charge", input.extra_person_charge ?? "");
  body.append("rules_policies", input.rules_policies ?? "");
  body.append("status", input.status === "unavailable" ? "unavailable" : "available");
  body.append("amenities", JSON.stringify(Array.isArray(input.amenities) ? input.amenities : []));
  const res = await fetch(`${getApiUrl()}/api/rooms`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
    body,
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: Room[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not create room."));
  const rooms = Array.isArray(data.rooms)
    ? data.rooms
        .map((row, i) => normalizeClientRoom(row, i))
        .filter((r): r is Room => Boolean(r))
    : await fetchRooms();
  notifyRoomsUpdated(rooms);
  return rooms;
}

export async function updateRoomDetails(id: string, input: RoomFormInput) {
  const payload = {
    name: input.name?.trim() || "",
    description: input.description ?? "",
    size: input.size ?? "",
    max_capacity: input.max_capacity ?? "",
    beds: input.beds ?? "",
    price_per_night: input.price_per_night ?? "",
    extra_person_charge: input.extra_person_charge ?? "",
    rules_policies: input.rules_policies ?? "",
    status: input.status === "unavailable" ? "unavailable" : "available",
    amenities: Array.isArray(input.amenities) ? input.amenities : [],
  };
  const res = await fetch(`${getApiUrl()}/api/rooms/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: await adminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: Room[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not update room."));
  const rooms = Array.isArray(data.rooms)
    ? data.rooms
        .map((row, i) => normalizeClientRoom(row, i))
        .filter((r): r is Room => Boolean(r))
    : await fetchRooms();
  notifyRoomsUpdated(rooms);
  return rooms;
}

export async function deleteRoomById(id: string) {
  const res = await fetch(`${getApiUrl()}/api/rooms/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await adminAuthHeaders(false),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: Room[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not delete room."));
  const rooms = Array.isArray(data.rooms)
    ? data.rooms
        .map((row, i) => normalizeClientRoom(row, i))
        .filter((r): r is Room => Boolean(r))
    : await fetchRooms();
  notifyRoomsUpdated(rooms);
  return rooms;
}

export async function uploadRoomImages(id: string, files: File[]) {
  const form = new FormData();
  for (const file of files) {
    form.append(
      "images",
      await optimizeImageFile(file, {
        maxWidth: 2200,
        maxHeight: 2200,
        quality: 0.92,
        maxBytes: 5_000_000,
      }),
    );
  }
  const res = await fetch(`${getApiUrl()}/api/rooms/${encodeURIComponent(id)}/images`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
    body: form,
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: Room[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not upload room images."));
  const rooms = Array.isArray(data.rooms)
    ? data.rooms
        .map((row, i) => normalizeClientRoom(row, i))
        .filter((r): r is Room => Boolean(r))
    : await fetchRooms();
  notifyRoomsUpdated(rooms);
  return rooms;
}

export async function replaceRoomImageAt(id: string, imageIndex: number, file: File) {
  const optimized = await optimizeImageFile(file, {
    maxWidth: 2200,
    maxHeight: 2200,
    quality: 0.92,
    maxBytes: 5_000_000,
  });
  const form = new FormData();
  form.append("image", optimized);
  const res = await fetch(
    `${getApiUrl()}/api/rooms/${encodeURIComponent(id)}/images/${imageIndex}`,
    {
      method: "PUT",
      headers: await adminAuthHeaders(false),
      body: form,
    },
  );
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: Room[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not replace image."));
  const rooms = Array.isArray(data.rooms)
    ? data.rooms
        .map((row, i) => normalizeClientRoom(row, i))
        .filter((r): r is Room => Boolean(r))
    : await fetchRooms();
  notifyRoomsUpdated(rooms);
  return rooms;
}

export async function deleteRoomImageAt(id: string, imageIndex: number) {
  const res = await fetch(
    `${getApiUrl()}/api/rooms/${encodeURIComponent(id)}/images/${imageIndex}`,
    {
      method: "DELETE",
      headers: await adminAuthHeaders(false),
    },
  );
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: Room[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not delete image."));
  const rooms = Array.isArray(data.rooms)
    ? data.rooms
        .map((row, i) => normalizeClientRoom(row, i))
        .filter((r): r is Room => Boolean(r))
    : await fetchRooms();
  notifyRoomsUpdated(rooms);
  return rooms;
}

export async function resetRoomsCatalog() {
  const res = await fetch(`${getApiUrl()}/api/rooms/reset`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: Room[];
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not reset rooms."));
  const rooms = Array.isArray(data.rooms)
    ? data.rooms
        .map((row, i) => normalizeClientRoom(row, i))
        .filter((r): r is Room => Boolean(r))
    : cloneDefaults();
  notifyRoomsUpdated(rooms);
  return rooms;
}

/** @deprecated Prefer createRoomWithImage / replaceRoomImageAt */
export async function uploadRoomPhoto(
  file: File,
  options?: { name?: string; replaceId?: string },
) {
  const body = new FormData();
  body.append("image", file);
  if (options?.name) body.append("name", options.name);
  if (options?.replaceId) body.append("replaceId", options.replaceId);
  const res = await fetch(`${getApiUrl()}/api/rooms/upload`, {
    method: "POST",
    headers: await adminAuthHeaders(false),
    body,
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: Room[];
    url?: string;
  };
  if (!res.ok) throw new Error(apiMessage(data, "Could not upload room photo."));
  if (Array.isArray(data.rooms)) notifyRoomsUpdated(data.rooms);
  return data;
}

/** @deprecated Prefer deleteRoomById */
export async function deleteRoomPhoto(id: string) {
  return deleteRoomById(id);
}

/** @deprecated Prefer resetRoomsCatalog */
export async function resetRoomPhotos() {
  return { rooms: await resetRoomsCatalog() };
}
