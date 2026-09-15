function resolveApiUrl() {
  // Phone / LAN: same host as the page (ignore .env localhost).
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:3000`;
    }
  }

  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  return "http://localhost:3000";
}

/** Resolve at call time so mobile Wi‑Fi access works. */
export function getApiUrl() {
  return resolveApiUrl();
}

/**
 * Compatible export for older `${API_URL}/api/...` call sites.
 * Always resolves at string-coercion time (LAN-safe).
 */
export const API_URL = new Proxy(new String(""), {
  get(_target, prop) {
    const url = resolveApiUrl();
    if (prop === Symbol.toPrimitive || prop === "toString" || prop === "valueOf") {
      return () => url;
    }
    if (prop === Symbol.toStringTag) return "String";
    const value = Reflect.get(String.prototype, prop, url);
    return typeof value === "function" ? value.bind(url) : Reflect.get(Object(url), prop);
  },
}) as unknown as string;

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T & { success?: boolean; message?: string } }> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    message?: string;
  };

  return { ok: res.ok, status: res.status, data };
}
