import { isHeroVideoUrl } from "./heroMedia";

const ready = new Set<string>();
const pending = new Map<string, Promise<void>>();
/** Keep in-flight images alive. A local Image() is otherwise only referenced by its own onload, so the browser can collect it and the load never finishes. */
const retainedImages = new Set<HTMLImageElement>();

export function isMediaReady(url: string | null | undefined) {
  return Boolean(url && ready.has(url));
}

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    retainedImages.add(image);
    const finish = () => {
      retainedImages.delete(image);
      resolve();
    };
    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().then(finish).catch(finish);
        return;
      }
      finish();
    };
    image.onerror = finish;
    image.decoding = "async";
    image.src = url;
  });
}

const parkedVideos: HTMLVideoElement[] = [];

/** Buffer the next clip in one hidden player. The visible hero must not share this request. */
function preloadVideo(url: string) {
  return new Promise<void>((resolve) => {
    const video = document.createElement("video");
    parkedVideos.push(video);
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.oncanplaythrough = () => resolve();
    video.onerror = () => resolve();
    video.src = url;
  });
}

/** Decode a photo, or buffer a hero video until it can play, before it is shown. */
export function preloadMedia(url: string | null | undefined, video = false): Promise<void> {
  if (!url) return Promise.resolve();
  if (ready.has(url)) return Promise.resolve();
  const existing = pending.get(url);
  if (existing) return existing;

  const load = video || isHeroVideoUrl(url) ? preloadVideo(url) : preloadImage(url);

  const task = load.finally(() => {
    ready.add(url);
    pending.delete(url);
  });
  pending.set(url, task);
  return task;
}

export function preloadMediaList(urls: Array<string | null | undefined>, video = false) {
  return Promise.all(urls.map((url) => preloadMedia(url, video))).then(() => undefined);
}

/**
 * Decode a hero photo before the page reveals it.
 * Videos are left to the single on-screen player so a second request cannot stall it.
 */
export async function preloadHeroMedia(url: string | null | undefined) {
  if (!url || isHeroVideoUrl(url)) return;
  await preloadMedia(url);
}
