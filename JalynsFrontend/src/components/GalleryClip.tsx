import { useEffect, useRef, useState } from "react";
import { videoHasSmoothBuffer, videoReadyForSmoothPlayback } from "../lib/videoReadiness";

const posters = new Map<string, string>();

function capturePoster(url: string, video: HTMLVideoElement) {
  if (posters.has(url) || video.videoWidth < 2) return;
  try {
    const canvas = document.createElement("canvas");
    const scale = 320 / video.videoWidth;
    canvas.width = 320;
    canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    posters.set(url, canvas.toDataURL("image/jpeg", 0.72));
  } catch {
    // A cross-origin frame cannot be copied. The skeleton stays until playback.
  }
}

type GalleryClipProps = {
  src: string;
  alt: string;
  /** Only the visible slide downloads and plays. Neighbors stay on a poster or skeleton. */
  active: boolean;
  className?: string;
};

/**
 * One gallery video. Playback starts only after enough data is buffered,
 * and a spinner returns if playback later waits for more data.
 */
export function GalleryClip({ src, alt, active, className = "" }: GalleryClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [poster, setPoster] = useState<string | null>(() => posters.get(src) ?? null);
  const [showFrame, setShowFrame] = useState(false);
  const [buffering, setBuffering] = useState(active);
  const [failed, setFailed] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setPoster(posters.get(src) ?? null);
    setShowFrame(false);
    setBuffering(active);
    setFailed(false);
    setNeedsTap(false);
  }, [src, active]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !active) return;
    if (retryToken > 0) el.load();
    let cancelled = false;
    let started = false;

    const rememberFrame = () => {
      capturePoster(src, el);
      const shot = posters.get(src);
      if (shot) setPoster(shot);
    };

    const markPlaying = () => {
      if (cancelled || !videoReadyForSmoothPlayback(el)) return;
      setBuffering(false);
      setShowFrame(true);
      setNeedsTap(false);
      rememberFrame();
    };

    const start = () => {
      if (cancelled || started || !videoHasSmoothBuffer(el)) return;
      started = true;
      el.muted = true;
      void el.play().then(markPlaying).catch(() => {
        if (cancelled) return;
        setNeedsTap(true);
        setBuffering(false);
        if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) setShowFrame(true);
      });
    };

    const onWaiting = () => {
      if (cancelled || videoHasSmoothBuffer(el)) return;
      setBuffering(true);
    };

    const onError = () => {
      if (cancelled) return;
      setFailed(true);
      setBuffering(false);
    };

    const onEnded = () => {
      if (cancelled || el.loop) return;
      started = false;
      start();
    };

    el.addEventListener("loadstart", onWaiting);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("stalled", onWaiting);
    el.addEventListener("canplay", start);
    el.addEventListener("canplaythrough", start);
    el.addEventListener("progress", start);
    el.addEventListener("playing", markPlaying);
    el.addEventListener("timeupdate", markPlaying);
    el.addEventListener("error", onError);
    el.addEventListener("ended", onEnded);
    start();

    return () => {
      cancelled = true;
      el.pause();
      el.removeEventListener("loadstart", onWaiting);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("stalled", onWaiting);
      el.removeEventListener("canplay", start);
      el.removeEventListener("canplaythrough", start);
      el.removeEventListener("progress", start);
      el.removeEventListener("playing", markPlaying);
      el.removeEventListener("timeupdate", markPlaying);
      el.removeEventListener("error", onError);
      el.removeEventListener("ended", onEnded);
    };
  }, [active, src, retryToken]);

  if (!active) {
    if (poster) {
      return <img src={poster} alt="" draggable={false} className={`block object-cover ${className}`} />;
    }
    return <span aria-hidden className={`skeleton-block skeleton-block-dark ${className}`} />;
  }

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {!showFrame ? (
        poster ? (
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="skeleton-block skeleton-block-dark absolute inset-0" />
        )
      ) : null}
      <video
        ref={videoRef}
        className={`h-full w-full object-cover ${showFrame ? "opacity-100" : "opacity-0"}`}
        src={src}
        muted
        loop
        playsInline
        preload="auto"
        aria-label={alt}
      />
      {buffering && !failed && !needsTap ? (
        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#071525]/55">
            <span
              className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
              role="status"
              aria-label="Loading video"
            />
          </span>
        </span>
      ) : null}
      {failed ? (
        <button
          type="button"
          className="absolute inset-0 z-10 flex items-center justify-center bg-[#243036]/80 px-4 text-center text-sm font-semibold text-white"
          onClick={(event) => {
            event.stopPropagation();
            setFailed(false);
            setShowFrame(false);
            setBuffering(true);
            setRetryToken((token) => token + 1);
          }}
        >
          Video couldn’t load. Tap to retry.
        </button>
      ) : null}
      {needsTap && !failed ? (
        <button
          type="button"
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 text-sm font-semibold text-white"
          onClick={(event) => {
            event.stopPropagation();
            const el = videoRef.current;
            if (!el) return;
            setNeedsTap(false);
            setBuffering(true);
            el.muted = true;
            void el.play().then(() => {
              if (videoHasSmoothBuffer(el)) {
                setBuffering(false);
                setShowFrame(true);
              }
            }).catch(() => setNeedsTap(true));
          }}
        >
          Tap to play
        </button>
      ) : null}
    </span>
  );
}
