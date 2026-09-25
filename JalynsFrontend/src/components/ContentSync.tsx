import { useEffect } from "react";
import { getApiUrl } from "../lib/api";
import { notifyHomeHeroUpdated, notifyHomeSectionUpdated } from "../lib/homeHero";
import { fetchGallery, notifyGalleryUpdated } from "../lib/gallery";
import { fetchNewsPosts, notifyNewsUpdated } from "../lib/news";
import { fetchRoomsCatalog, notifyRoomsUpdated } from "../lib/rooms";

export const CONTENT_CHANGED_EVENT = "jalyns:content-changed";
export const CONTENT_SYNC_CHANNEL = "jalyns-content-sync";

const POLL_MS = 2000;

/** Refresh media on this page only (used by poll + cross-tab messages). */
export function refreshLocalContent() {
  window.dispatchEvent(new Event(CONTENT_CHANGED_EVENT));
  notifyHomeHeroUpdated();
  notifyHomeSectionUpdated("whystay");
  notifyHomeSectionUpdated("news");
  void fetchRoomsCatalog().then((catalog) =>
    notifyRoomsUpdated(catalog.rooms, catalog.voucher, catalog.highlights),
  );
  void fetchGallery().then((photos) => notifyGalleryUpdated(photos));
  void fetchNewsPosts().then((posts) => notifyNewsUpdated(posts));
}

/** Call after an admin save so other tabs update instantly. */
export function broadcastContentChanged() {
  try {
    const channel = new BroadcastChannel(CONTENT_SYNC_CHANNEL);
    channel.postMessage({ type: "content-changed", at: Date.now() });
    channel.close();
  } catch {
    // unsupported
  }
}

async function fetchRevision(): Promise<string | null> {
  try {
    const res = await fetch(`${getApiUrl()}/api/content/revision`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { revision?: string };
    return typeof body.revision === "string" ? body.revision : null;
  } catch {
    return null;
  }
}

/**
 * Keeps guest UIs in sync when an admin edits photos/backgrounds.
 * - Polls revision every 2s (other devices / browsers)
 * - Listens on BroadcastChannel (other tabs on same browser)
 */
export function ContentSync() {
  useEffect(() => {
    let cancelled = false;
    let lastRevision: string | null = null;
    let timer = 0;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      const revision = await fetchRevision();
      if (cancelled || revision == null) return;
      if (lastRevision == null) {
        lastRevision = revision;
        return;
      }
      if (revision !== lastRevision) {
        lastRevision = revision;
        refreshLocalContent();
      }
    };

    void tick();
    timer = window.setInterval(() => void tick(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CONTENT_SYNC_CHANNEL);
      channel.onmessage = () => {
        if (!cancelled) {
          // Pull latest revision so poll does not double-fire immediately
          void fetchRevision().then((revision) => {
            if (revision != null) lastRevision = revision;
          });
          refreshLocalContent();
        }
      };
    } catch {
      channel = null;
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      channel?.close();
    };
  }, []);

  return null;
}
