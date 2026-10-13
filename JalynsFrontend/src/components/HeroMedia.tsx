import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { heroVideoHasSound, isHeroVideoUrl } from "../lib/heroMedia";
import { peekHeroPoster, peekPrimedHeroVideo, primeHeroVideo, subscribeHeroPrime } from "../lib/primeHeroVideo";

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
}: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const [useFallback, setUseFallback] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [muted, setMuted] = useState(true);
  const [poster, setPoster] = useState<string | null>(() => peekHeroPoster(src));
  const [playSrc, setPlaySrc] = useState<string | null>(() => peekPrimedHeroVideo(src)?.blobUrl ?? null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    setUseFallback(false);
    setSoundBlocked(false);
    setMuted(true);
    setMoving(false);
    setPoster(peekHeroPoster(src));
    setPlaySrc(peekPrimedHeroVideo(src)?.blobUrl ?? null);
  }, [src]);

  const shown = useFallback ? fallbackSrc : src;
  const playVideo = Boolean(shown) && !useFallback && (video || isHeroVideoUrl(shown));
  const withSound = playVideo && soundControl && heroVideoHasSound(shown);

  useEffect(() => {
    if (!playVideo || !shown) return;
    let cancelled = false;
    const apply = () => {
      const nextPoster = peekHeroPoster(shown);
      const primed = peekPrimedHeroVideo(shown);
      if (nextPoster) setPoster(nextPoster);
      if (primed?.blobUrl) setPlaySrc(primed.blobUrl);
    };
    apply();
    const unsubscribe = subscribeHeroPrime((url) => {
      if (url === shown) apply();
    });
    if (!peekPrimedHeroVideo(shown)) {
      void primeHeroVideo(shown)
        .then(() => {
          if (!cancelled) apply();
        })
        .catch(() => {
          if (!cancelled) setPlaySrc(shown);
        });
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [shown, playVideo]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playVideo || !playSrc) return;
    let cancelled = false;
    let started = false;
    const localFile = playSrc.startsWith("blob:");

    const startPlayback = () => {
      if (!withSound) {
        el.muted = true;
        setMuted(true);
        void el.play().catch(() => undefined);
        return;
      }
      el.muted = false;
      el.volume = 1;
      setMuted(false);
      void el.play()
        .then(() => {
          if (cancelled) return;
          if (el.paused || el.muted) {
            el.muted = true;
            setMuted(true);
            setSoundBlocked(true);
            void el.play().catch(() => undefined);
            return;
          }
          setMuted(false);
          setSoundBlocked(false);
        })
        .catch(() => {
          if (cancelled) return;
          el.muted = true;
          setMuted(true);
          setSoundBlocked(true);
          void el.play().catch(() => undefined);
        });
    };

    const begin = () => {
      if (cancelled || started) return;
      if (localFile) {
        if (el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      } else if (el.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        return;
      }
      started = true;
      startPlayback();
    };

    let toldParent = false;
    const reveal = () => {
      if (cancelled) return;
      setMoving(true);
      if (!toldParent) {
        toldParent = true;
        onPlayingRef.current?.();
      }
    };

    el.addEventListener("loadeddata", begin);
    el.addEventListener("canplay", begin);
    el.addEventListener("canplaythrough", begin);
    el.addEventListener("playing", reveal);
    begin();

    return () => {
      cancelled = true;
      el.removeEventListener("loadeddata", begin);
      el.removeEventListener("canplay", begin);
      el.removeEventListener("canplaythrough", begin);
      el.removeEventListener("playing", reveal);
    };
  }, [playSrc, withSound, playVideo]);

  if (!shown) return null;

  if (playVideo) {
    return (
      <>
        <div className={`${className} overflow-hidden`}>
          <div className="relative h-full w-full">
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
              onError={() => {
                if (fallbackSrc && fallbackSrc !== shown) setUseFallback(true);
              }}
            />
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

  return (
    <img
      key={shown}
      src={shown}
      alt={alt}
      className={className}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
    />
  );
}
