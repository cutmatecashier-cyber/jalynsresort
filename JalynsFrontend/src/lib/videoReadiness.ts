/** Have Future Data — playback can start, but it may stall immediately. */
export const HAVE_FUTURE_DATA = 3;
/** Have Enough Data — the browser expects playback to continue. */
export const HAVE_ENOUGH_DATA = 4;

/** Hero uploads are about 3 seconds, so those clips are buffered through. Longer clips can start once a few seconds are ahead. */
const SHORT_CLIP_SECONDS = 4;
const LONG_CLIP_BUFFER_SECONDS = 3;

type BufferedRanges = {
  length: number;
  start: (index: number) => number;
  end: (index: number) => number;
};

export type VideoSnapshot = {
  readyState: number;
  paused: boolean;
  ended: boolean;
  seeking: boolean;
  currentTime: number;
  duration: number;
  buffered: BufferedRanges;
};

export function bufferedAhead(video: VideoSnapshot): number {
  const time = video.currentTime;
  const ranges = video.buffered;
  for (let index = 0; index < ranges.length; index += 1) {
    const start = ranges.start(index);
    const end = ranges.end(index);
    if (time >= start - 0.05 && time <= end + 0.05) return Math.max(0, end - time);
  }
  return 0;
}

/** Enough bytes are buffered to start without an immediate stall. Playback may still be paused. */
export function videoHasSmoothBuffer(video: VideoSnapshot): boolean {
  if (video.seeking || video.readyState < HAVE_FUTURE_DATA) return false;

  const ahead = bufferedAhead(video);
  const covered = video.currentTime + ahead;
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    return video.readyState >= HAVE_ENOUGH_DATA && ahead >= LONG_CLIP_BUFFER_SECONDS;
  }
  if (duration <= SHORT_CLIP_SECONDS) return covered >= duration - 0.25;
  if (ahead >= LONG_CLIP_BUFFER_SECONDS) return true;
  return video.readyState >= HAVE_ENOUGH_DATA && ahead >= 1.5;
}

/**
 * True only when playback has started and enough of the clip is buffered
 * to keep going. `canplay` alone is not enough.
 */
export function videoReadyForSmoothPlayback(video: VideoSnapshot): boolean {
  if (video.paused || video.ended || video.currentTime <= 0) return false;
  return videoHasSmoothBuffer(video);
}
