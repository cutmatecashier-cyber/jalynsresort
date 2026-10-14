import { useEffect, useState } from "react";
import { isMediaReady, preloadMedia } from "./preloadMedia";

/** True once the file is decoded (photo) or fully downloaded (video). */
export function useMediaReady(
  url: string | null | undefined,
  video = false,
  enabled = true,
) {
  const [ready, setReady] = useState(() => !url || (enabled && isMediaReady(url)));

  useEffect(() => {
    if (!url) {
      setReady(true);
      return;
    }
    if (!enabled) {
      setReady(false);
      return;
    }
    if (isMediaReady(url)) {
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void preloadMedia(url, video).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [url, video, enabled]);

  return ready;
}
