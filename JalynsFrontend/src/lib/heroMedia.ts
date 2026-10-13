export const HERO_VIDEO_MAX_SECONDS = 5;
export const HERO_VIDEO_MAX_BYTES = 40 * 1024 * 1024;

export const HERO_MEDIA_ACCEPT =
  "image/jpeg,image/jpg,image/pjpeg,.jpg,.jpeg,.jpe,image/*,.png,.gif,.webp,.bmp,.tif,.tiff,.avif,.heic,.heif,.nef,.nrw,.cr2,.cr3,.arw,.dng,.orf,.rw2,.raf,.srw,.raw,.pef,video/mp4,.mp4";

export function isHeroVideoUrl(url: string | null | undefined) {
  if (!url) return false;
  const path = url.split("#")[0]?.split("?")[0] ?? "";
  return /\.mp4$/i.test(path);
}

/** Saved hero videos keep sound only when the file name marks that choice. */
export function heroVideoHasSound(url: string | null | undefined) {
  if (!url) return false;
  const path = url.split("#")[0]?.split("?")[0] ?? "";
  return /-sound\.mp4$/i.test(path);
}

export function isHeroVideoFile(file: File) {
  return file.type === "video/mp4" || /\.mp4$/i.test(file.name);
}

export const HERO_UPLOAD_HINT =
  "Upload an image, or an MP4 of any size. Trim the video to 5 seconds or less — only that short clip is saved. Each page keeps its own background.";
