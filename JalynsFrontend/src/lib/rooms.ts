import { getApiUrl } from "./api";

export type RoomPhoto = {
  id: string;
  name: string;
  image: string;
};

export const DEFAULT_ROOMS: RoomPhoto[] = [
  {
    id: "deluxe",
    name: "Deluxe Room",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "suite",
    name: "Garden Suite",
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "family",
    name: "Family Room",
    image:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "ocean",
    name: "Ocean View",
    image:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80",
  },
];

export const ROOMS_UPDATED_EVENT = "jalyns:rooms-updated";

export function roomsMediaUrl(url: string) {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = getApiUrl().replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function notifyRoomsUpdated(rooms?: RoomPhoto[]) {
  window.dispatchEvent(
    new CustomEvent(ROOMS_UPDATED_EVENT, {
      detail: { rooms },
    }),
  );
}

export async function fetchRooms(): Promise<RoomPhoto[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/rooms`, { cache: "no-store" });
    const body = (await res.json()) as {
      success?: boolean;
      rooms?: RoomPhoto[];
    };
    if (res.ok && Array.isArray(body.rooms) && body.rooms.length > 0) {
      return body.rooms;
    }
  } catch {
    // keep defaults
  }
  return DEFAULT_ROOMS.map((r) => ({ ...r }));
}

export async function uploadRoomPhoto(
  file: File,
  token: string,
  options?: { name?: string; replaceId?: string },
) {
  const body = new FormData();
  body.append("image", file);
  if (options?.name) body.append("name", options.name);
  if (options?.replaceId) body.append("replaceId", options.replaceId);
  const res = await fetch(`${getApiUrl()}/api/rooms/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: RoomPhoto[];
    url?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not upload room photo.");
  }
  return data;
}

export async function deleteRoomPhoto(id: string, token: string) {
  const res = await fetch(`${getApiUrl()}/api/rooms/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: RoomPhoto[];
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not delete room photo.");
  }
  return data;
}

export async function resetRoomPhotos(token: string) {
  const res = await fetch(`${getApiUrl()}/api/rooms/reset`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    rooms?: RoomPhoto[];
  };
  if (!res.ok) {
    throw new Error(data.message ?? "Could not reset room photos.");
  }
  return data;
}
