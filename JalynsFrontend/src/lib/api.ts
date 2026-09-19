function resolveApiUrl() {
  if (typeof window !== "undefined") {
    // Dev (Vite): proxy /api + /uploads on the same origin so phones only need :5173.
    // Avoids Windows firewall blocking :3000 while the page itself loads.
    if (import.meta.env.DEV) {
      return "";
    }

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
 * Turn relative `/uploads/...` (or localhost absolute URLs) into a URL that works
 * on the current device — including phones on LAN.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        const base = getApiUrl();
        if (!base) {
          return `${window.location.origin}${parsed.pathname}${parsed.search}`;
        }
        return `${base.replace(/\/$/, "")}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  const base = getApiUrl().replace(/\/$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
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
