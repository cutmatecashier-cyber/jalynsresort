import { isHeroVideoUrl } from "./heroMedia";

export type PrimedHeroVideo = {
  blobUrl: string;
  poster: string | null;
};

const ready = new Map<string, PrimedHeroVideo>();
const posters = new Map<string, string>();
const pending = new Map<string, Promise<PrimedHeroVideo>>();
const listeners = new Set<(url: string) => void>();

const POSTER_PREFIX = "jalyns:hero-poster:";

function notify(url: string) {
  for (const listener of listeners) listener(url);
}

function rememberPoster(url: string, poster: string) {
  posters.set(url, poster);
  try {
    localStorage.setItem(POSTER_PREFIX + url, poster);
  } catch {
    // A full-size frame can exceed storage. The in-memory copy still covers this visit.
  }
  notify(url);
}

export function peekHeroPoster(url: string | null | undefined): string | null {
  if (!url || !isHeroVideoUrl(url)) return null;
  const cached = posters.get(url);
  if (cached) return cached;
  try {
    const saved = localStorage.getItem(POSTER_PREFIX + url);
    if (!saved) return null;
    posters.set(url, saved);
    return saved;
  } catch {
    return null;
  }
}

export function peekPrimedHeroVideo(url: string | null | undefined): PrimedHeroVideo | null {
  if (!url) return null;
  return ready.get(url) ?? null;
}

export function subscribeHeroPrime(listener: (url: string) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function capturePoster(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const stop = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    video.onloadeddata = () => {
      try {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const scale = Math.min(1, 1280 / width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not draw the video frame.");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const poster = canvas.toDataURL("image/jpeg", 0.82);
        stop();
        resolve(poster);
      } catch (err) {
        stop();
        reject(err);
      }
    };
    video.onerror = () => {
      stop();
      reject(new Error("Could not read the video frame."));
    };
    video.src = url;
  });
}

/** Download the whole clip before playback, and keep the first frame for the wait. */
export function primeHeroVideo(url: string): Promise<PrimedHeroVideo> {
  if (!isHeroVideoUrl(url)) return Promise.reject(new Error("Not a hero video."));
  const done = ready.get(url);
  if (done) return Promise.resolve(done);
  const existing = pending.get(url);
  if (existing) return existing;

  const task = (async () => {
    const posterTask = capturePoster(url)
      .then((poster) => {
        rememberPoster(url, poster);
        return poster;
      })
      .catch(() => peekHeroPoster(url));

    const response = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
    if (!response.ok) throw new Error("Could not load video.");
    const blobUrl = URL.createObjectURL(await response.blob());
    const poster = await posterTask;
    const primed = { blobUrl, poster };
    ready.set(url, primed);
    notify(url);
    return primed;
  })().finally(() => {
    pending.delete(url);
  });

  pending.set(url, task);
  return task;
}
