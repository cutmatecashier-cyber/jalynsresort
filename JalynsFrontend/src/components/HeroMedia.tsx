import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { heroVideoHasSound, isHeroVideoUrl } from "../lib/heroMedia";
import { peekHeroPoster, peekPrimedHeroVideo } from "../lib/primeHeroVideo";
import { useMediaReady } from "../lib/useMediaReady";
import { videoHasSmoothBuffer, videoReadyForSmoothPlayback } from "../lib/videoReadiness";

type HeroMediaProps = {
  src: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
  /** Blob previews have no file extension, so the caller can mark them as video. */
  video?: boolean;
  fallbackSrc?: string | null;
  /** Live hero backgrounds can offer a play-sound control when the browser blocks unmuted autoplay. */
  soundControl?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  /** Fires once playback is actually moving, after the clip has buffered. */
  onPlaying?: () => void;
  /** Fires once the photo is decoded or the video can play. */
  onReady?: () => void;
};

export function HeroMedia({
  src,
  alt = "",
  className = "hero-media",
  priority = true,
  video = false,
  fallbackSrc = null,
  soundControl = false,
  loop = true,
  onEnded,
  onPlaying,
  onReady,
}: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onPlayingRef = useRef(onPlaying);
  const onReadyRef = useRef(onReady);
  onPlayingRef.current = onPlaying;
  onReadyRef.current = onReady;
  const [useFallback, setUseFallback] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [muted, setMuted] = useState(true);
  const [poster, setPoster] = useState<string | null>(() => peekHeroPoster(src));
  const [moving, setMoving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setUseFallback(false);
    setSoundBlocked(false);
    setMuted(true);
    setMoving(false);
    setFailed(false);
    setNeedsTap(false);
    setPoster(peekHeroPoster(src));
  }, [src]);

  const shown = useFallback ? fallbackSrc : src;
  const playVideo = Boolean(shown) && !useFallback && (video || isHeroVideoUrl(shown));
  const withSound = playVideo && soundControl && heroVideoHasSound(shown);
  const imageReady = useMediaReady(playVideo ? null : shown);

  useEffect(() => {
    if (playVideo || !imageReady || !shown) return;
    onReadyRef.current?.();
  }, [playVideo, imageReady, shown]);

  const playSrc = (playVideo && shown && peekPrimedHeroVideo(shown)?.blobUrl) || shown;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playVideo || !playSrc) return;
    if (retryToken > 0) el.load();
    let cancelled = false;
    let started = false;
    let toldParent = false;

    const reveal = () => {
      if (cancelled || toldParent) return;
      toldParent = true;
      setMoving(true);
      onPlayingRef.current?.();
      onReadyRef.current?.();
      if (!withSound) return;
      el.muted = false;
      el.volume = 1;
      setMuted(false);
      void el.play().then(() => {
        if (cancelled || el.paused || el.muted) {
          el.muted = true;
          setMuted(true);
          setSoundBlocked(true);
          return;
        }
        setSoundBlocked(false);
      }).catch(() => {
        if (cancelled) return;
        el.muted = true;
        setMuted(true);
        setSoundBlocked(true);
      });
    };

    const consider = () => {
      if (cancelled || toldParent) return;
      if (videoReadyForSmoothPlayback(el)) reveal();
    };

    const startPlayback = () => {
      if (cancelled || started) return;
      if (!videoHasSmoothBuffer(el)) return;
      started = true;
      el.muted = true;
      setMuted(true);
      void el.play().then(consider).catch(() => {
        if (cancelled || toldParent) return;
        setNeedsTap(true);
        if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) reveal();
      });
    };

    const onMediaError = () => {
      if (cancelled || toldParent) return;
      if (fallbackSrc && fallbackSrc !== shown) {
        setUseFallback(true);
        return;
      }
      setFailed(true);
      toldParent = true;
      setMoving(true);
      onReadyRef.current?.();
    };

    const onBuffer = () => {
      startPlayback();
      consider();
    };

    el.addEventListener("loadeddata", startPlayback);
    el.addEventListener("canplay", onBuffer);
    el.addEventListener("canplaythrough", onBuffer);
    el.addEventListener("progress", onBuffer);
    el.addEventListener("playing", consider);
    el.addEventListener("timeupdate", consider);
    el.addEventListener("error", onMediaError);
    startPlayback();

    return () => {
      cancelled = true;
      el.removeEventListener("loadeddata", startPlayback);
      el.removeEventListener("canplay", onBuffer);
      el.removeEventListener("canplaythrough", onBuffer);
      el.removeEventListener("progress", onBuffer);
      el.removeEventListener("playing", consider);
      el.removeEventListener("timeupdate", consider);
      el.removeEventListener("error", onMediaError);
    };
  }, [playSrc, withSound, playVideo, shown, fallbackSrc, retryToken]);

  if (!shown) {
    return <span aria-hidden className={`skeleton-block skeleton-block-dark ${className}`} />;
  }

  if (playVideo) {
    return (
      <>
        <div className={`${className} overflow-hidden`}>
          <div className="relative h-full w-full">
            {!moving ? (
              <span aria-hidden className="skeleton-block skeleton-block-dark absolute inset-0 z-[2]" />
            ) : null}
            {poster ? (
              <img
                src={poster}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                  moving ? "opacity-0" : "opacity-100"
                }`}
              />
            ) : null}
            <video
              ref={videoRef}
              key={playSrc ?? "waiting"}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                moving ? "opacity-100" : "opacity-0"
              }`}
              src={playSrc ?? undefined}
              muted={muted}
              loop={loop}
              playsInline
              preload="auto"
              onEnded={onEnded}
            />
            {failed ? (
              <button
                type="button"
                className="absolute inset-0 z-[3] flex items-center justify-center bg-[#243036]/80 px-6 text-center text-sm font-semibold text-white"
                onClick={() => {
                  setFailed(false);
                  setMoving(false);
                  setRetryToken((token) => token + 1);
                }}
              >
                Video couldn’t load. Tap to retry.
              </button>
            ) : null}
            {needsTap && !failed ? (
              <button
                type="button"
                className="absolute inset-0 z-[3] flex items-center justify-center bg-black/35 text-sm font-semibold text-white"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  setNeedsTap(false);
                  el.muted = true;
                  setMuted(true);
                  void el.play().catch(() => setNeedsTap(true));
                }}
              >
                Tap to play
              </button>
            ) : null}
          </div>
        </div>
        {soundBlocked
          ? createPortal(
              <button
                type="button"
                className="fixed top-24 right-4 z-60 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-ink shadow-lg"
                onClick={(event) => {
                  event.stopPropagation();
                  const el = videoRef.current;
                  if (!el) return;
                  el.muted = false;
                  el.volume = 1;
                  setMuted(false);
                  void el.play().then(() => setSoundBlocked(false)).catch(() => {
                    el.muted = true;
                    setMuted(true);
                    setSoundBlocked(true);
                  });
                }}
              >
                Play sound
              </button>,
              document.body,
            )
          : null}
      </>
    );
  }

  return imageReady ? (
    <img
      key={shown}
      src={shown}
      alt={alt}
      className={className}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
    />
  ) : (
    <span aria-hidden className={`skeleton-block skeleton-block-dark ${className}`} />
  );
}
