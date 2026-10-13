import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { HERO_VIDEO_MAX_BYTES, HERO_VIDEO_MAX_SECONDS } from "../lib/heroMedia";
import {
  FULL_HERO_CROP,
  exportHeroVideo,
  paintHeroFrame,
  rotatedSize,
  type HeroCrop,
} from "../lib/processHeroVideo";

type DragMode = "move" | "nw" | "ne" | "sw" | "se";
const MIN_CROP = 0.12;

type Props = {
  source: string;
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onApply: (file: File) => void | Promise<void>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nextCrop(mode: DragMode, start: HeroCrop, dx: number, dy: number): HeroCrop {
  if (mode === "move") {
    return {
      ...start,
      x: clamp(start.x + dx, 0, 1 - start.w),
      y: clamp(start.y + dy, 0, 1 - start.h),
    };
  }
  if (mode === "se") {
    return {
      ...start,
      w: clamp(start.w + dx, MIN_CROP, 1 - start.x),
      h: clamp(start.h + dy, MIN_CROP, 1 - start.y),
    };
  }
  if (mode === "sw") {
    const x = clamp(start.x + dx, 0, start.x + start.w - MIN_CROP);
    return { x, y: start.y, w: start.w + (start.x - x), h: clamp(start.h + dy, MIN_CROP, 1 - start.y) };
  }
  if (mode === "ne") {
    const y = clamp(start.y + dy, 0, start.y + start.h - MIN_CROP);
    return { x: start.x, y, w: clamp(start.w + dx, MIN_CROP, 1 - start.x), h: start.h + (start.y - y) };
  }
  const x = clamp(start.x + dx, 0, start.x + start.w - MIN_CROP);
  const y = clamp(start.y + dy, 0, start.y + start.h - MIN_CROP);
  return { x, y, w: start.w + (start.x - x), h: start.h + (start.y - y) };
}

export function VideoAdjustDialog({ source, file, busy = false, onCancel, onApply }: Props) {
  const titleId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef<{ mode: DragMode; x: number; y: number; crop: HeroCrop } | null>(null);
  const trimTrackRef = useRef<HTMLDivElement>(null);
  const trimDragRef = useRef<{
    mode: "start" | "end" | "range";
    originX: number;
    width: number;
    trim: { start: number; end: number };
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<HeroCrop>(FULL_HERO_CROP);
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState({ start: 0, end: 0 });
  const [previewTime, setPreviewTime] = useState(0);
  const [includeSound, setIncludeSound] = useState(false);
  const [ready, setReady] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  function paint(fullFrame: boolean, atCrop = crop) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (fullFrame) {
      const rotated = rotatedSize(video.videoWidth, video.videoHeight, rotation);
      const scale = Math.min(1, 960 / Math.max(rotated.width, rotated.height));
      const width = Math.max(1, Math.round(rotated.width * scale));
      const height = Math.max(1, Math.round(rotated.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }
    paintHeroFrame(ctx, video, video.videoWidth, video.videoHeight, rotation, atCrop, fullFrame);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    setReady(false);
    setLoadError(null);
    setRotation(0);
    setCrop(FULL_HERO_CROP);
    setIncludeSound(false);
    setPreviewTime(0);
    const onReady = () => {
      if (cancelled) return;
      const length = video.duration;
      if (!Number.isFinite(length) || length <= 0) {
        setLoadError("Could not read this video. Use an MP4 file.");
        return;
      }
      const end = Math.min(HERO_VIDEO_MAX_SECONDS, length);
      setDuration(length);
      setTrim({ start: 0, end });
      setPreviewTime(0);
      const show = () => {
        if (!cancelled) {
          setReady(true);
          paint(true, FULL_HERO_CROP);
        }
      };
      if (video.readyState >= 2) show();
      else video.addEventListener("seeked", show, { once: true });
      video.currentTime = 0;
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", () => {
      if (!cancelled) setLoadError("Could not read this video. Use an MP4 file.");
    });
    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onReady);
    };
    // The first frame is painted once metadata is ready. Later edits redraw explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, file]);

  useEffect(() => {
    if (!ready || previewing) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    const draw = () => {
      if (!cancelled) paint(true);
    };
    video.addEventListener("seeked", draw);
    if (Math.abs(video.currentTime - previewTime) > 0.03) video.currentTime = previewTime;
    else draw();
    return () => {
      cancelled = true;
      video.removeEventListener("seeked", draw);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rotation, previewTime, previewing]);

  useEffect(() => {
    if (busy) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !working) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel, working]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function rotateBy(delta: number) {
    if (busy || working) return;
    setPreviewing(false);
    setRotation((current) => (current + delta + 360) % 360);
    setCrop(FULL_HERO_CROP);
  }

  function resetEdits() {
    if (busy || working) return;
    const video = videoRef.current;
    video?.pause();
    setPreviewing(false);
    setRotation(0);
    setCrop(FULL_HERO_CROP);
    setIncludeSound(false);
    const end = Math.min(HERO_VIDEO_MAX_SECONDS, duration || 0);
    setTrim({ start: 0, end });
    setPreviewTime(0);
    setSaveError(null);
  }

  function point(event: PointerEvent<HTMLElement>) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  function onDragStart(event: PointerEvent<HTMLElement>, mode: DragMode) {
    if (busy || working || previewing) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    dragRef.current = { mode, x: p.x, y: p.y, crop };
  }

  function onDragMove(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const p = point(event);
    setCrop(nextCrop(drag.mode, drag.crop, p.x - drag.x, p.y - drag.y));
  }

  function onDragEnd() {
    dragRef.current = null;
  }

  function onTrimPointerDown(event: PointerEvent<HTMLElement>, mode: "start" | "end" | "range") {
    if (!ready || busy || working || !duration) return;
    const track = trimTrackRef.current;
    if (!track) return;
    event.preventDefault();
    event.stopPropagation();
    videoRef.current?.pause();
    setPreviewing(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    trimDragRef.current = {
      mode,
      originX: event.clientX,
      width: track.getBoundingClientRect().width,
      trim: { ...trim },
    };
  }

  function onTrimPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = trimDragRef.current;
    if (!drag || drag.width <= 0 || !duration) return;
    const delta = ((event.clientX - drag.originX) / drag.width) * duration;
    const minSpan = 0.2;
    const maxSpan = Math.min(HERO_VIDEO_MAX_SECONDS, duration);
    const origin = drag.trim;
    if (drag.mode === "start") {
      let start = clamp(origin.start + delta, 0, origin.end - minSpan);
      const end = origin.end;
      if (end - start > maxSpan) start = end - maxSpan;
      setTrim({ start, end });
      setPreviewTime(start);
      return;
    }
    if (drag.mode === "end") {
      let end = clamp(origin.end + delta, origin.start + minSpan, duration);
      const start = origin.start;
      if (end - start > maxSpan) end = start + maxSpan;
      setTrim({ start, end });
      setPreviewTime(Math.max(start, end - 0.05));
      return;
    }
    const span = Math.min(maxSpan, Math.max(minSpan, origin.end - origin.start));
    const start = clamp(origin.start + delta, 0, Math.max(0, duration - span));
    setTrim({ start, end: start + span });
    setPreviewTime(start);
  }

  function onTrimPointerEnd() {
    trimDragRef.current = null;
  }

  async function playPreview() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready || working) return;
    if (previewing) {
      video.pause();
      setPreviewing(false);
      paint(true);
      return;
    }
    setPreviewing(true);
    setSaveError(null);
    const rotated = rotatedSize(video.videoWidth, video.videoHeight, rotation);
    const cropW = Math.max(1, crop.w * rotated.width);
    const cropH = Math.max(1, crop.h * rotated.height);
    const scale = Math.min(1, 960 / Math.max(cropW, cropH));
    canvas.width = Math.max(2, Math.round(cropW * scale));
    canvas.height = Math.max(2, Math.round(cropH * scale));
    video.pause();
    video.muted = !includeSound;
    video.volume = 1;
    video.currentTime = trim.start;
    await new Promise<void>((resolve) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
    });
    await video.play();
    const step = () => {
      if (video.paused || video.currentTime >= trim.end) {
        video.pause();
        setPreviewing(false);
        paint(true);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) paintHeroFrame(ctx, video, video.videoWidth, video.videoHeight, rotation, crop, false);
      if (typeof video.requestVideoFrameCallback === "function") video.requestVideoFrameCallback(() => step());
      else requestAnimationFrame(step);
    };
    if (typeof video.requestVideoFrameCallback === "function") video.requestVideoFrameCallback(() => step());
    else requestAnimationFrame(step);
  }

  async function apply() {
    if (busy || working || !ready) return;
    if (trim.end - trim.start > HERO_VIDEO_MAX_SECONDS + 0.05) {
      setSaveError("Hero videos must be 5 seconds or shorter.");
      return;
    }
    videoRef.current?.pause();
    setPreviewing(false);
    setWorking(true);
    setSaveError(null);
    setProgress("Preparing video…");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const exported = await exportHeroVideo({
        file,
        start: trim.start,
        end: trim.end,
        rotation,
        crop,
        includeSound,
        signal: controller.signal,
        onProgress: (ratio) => setProgress(`Preparing video… ${Math.round(ratio * 100)}%`),
      });
      if (exported.size > HERO_VIDEO_MAX_BYTES) {
        throw new Error("The edited video is still too large. Try a shorter clip.");
      }
      await onApply(exported);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not prepare this video.");
      setWorking(false);
      setProgress(null);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    videoRef.current?.pause();
    if (!working) onCancel();
  }

  const locked = busy || working;
  const clipLength = Math.max(0, trim.end - trim.start);

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/60 p-4" role="presentation" onClick={() => !locked && cancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(92vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-foam text-ink shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div>
            <h3 id={titleId} className="font-display text-2xl">
              Edit hero video
            </h3>
            <p className="mt-1 text-sm text-ink/70">
              Trim to 5 seconds or less, choose whether to keep the sound, then crop or rotate if needed.
              Preview plays the edited clip.
            </p>
          </div>
          <button type="button" disabled={locked} onClick={cancel} className="btn-press rounded-full border border-ink/15 px-3 py-1.5 text-sm font-semibold disabled:opacity-60">
            Close
          </button>
        </div>

        <div className="relative mx-5 mt-4 flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#111] p-4 sm:mx-6">
          <video
            ref={videoRef}
            src={source}
            muted={!previewing || !includeSound}
            playsInline
            preload="auto"
            className="pointer-events-none absolute bottom-2 left-2 h-8 w-8 opacity-0"
          />
          {loadError ? (
            <p className="text-sm font-medium text-white" role="alert">{loadError}</p>
          ) : ready ? (
            <div ref={frameRef} className="relative inline-block max-w-full touch-none select-none">
              <canvas ref={canvasRef} className="block max-h-[min(46vh,480px)] w-auto max-w-full" />
              {previewing ? null : (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/55" style={{ height: `${crop.y * 100}%` }} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55" style={{ height: `${(1 - crop.y - crop.h) * 100}%` }} />
                  <div className="pointer-events-none absolute left-0 bg-black/55" style={{ top: `${crop.y * 100}%`, height: `${crop.h * 100}%`, width: `${crop.x * 100}%` }} />
                  <div className="pointer-events-none absolute right-0 bg-black/55" style={{ top: `${crop.y * 100}%`, height: `${crop.h * 100}%`, width: `${(1 - crop.x - crop.w) * 100}%` }} />
                  <div
                    className="absolute cursor-move border-2 border-white"
                    style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
                    onPointerDown={(event) => onDragStart(event, "move")}
                    onPointerMove={onDragMove}
                    onPointerUp={onDragEnd}
                    onPointerCancel={onDragEnd}
                  >
                    {(
                      [
                        ["nw", "left-1.5 top-1.5 cursor-nwse-resize"],
                        ["ne", "right-1.5 top-1.5 cursor-nesw-resize"],
                        ["sw", "bottom-1.5 left-1.5 cursor-nesw-resize"],
                        ["se", "bottom-1.5 right-1.5 cursor-nwse-resize"],
                      ] as const
                    ).map(([mode, place]) => (
                      <span
                        key={mode}
                        className={`absolute h-7 w-7 rounded-md border-2 border-white bg-sky ${place}`}
                        onPointerDown={(event) => onDragStart(event, mode)}
                        onPointerMove={onDragMove}
                        onPointerUp={onDragEnd}
                        onPointerCancel={onDragEnd}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/80">Loading video…</p>
          )}
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
          {duration > HERO_VIDEO_MAX_SECONDS ? (
            <p className="text-sm text-ink/75">
              This video is {duration.toFixed(1)}s. Choose a section of {HERO_VIDEO_MAX_SECONDS} seconds or less.
            </p>
          ) : null}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
              <span>Keep {trim.start.toFixed(1)}s – {trim.end.toFixed(1)}s</span>
              <span>{clipLength.toFixed(1)}s / {HERO_VIDEO_MAX_SECONDS}s max</span>
            </div>
            <div
              ref={trimTrackRef}
              className="relative mx-3 h-14 touch-none select-none rounded-xl bg-ink/15"
              role="group"
              aria-label="Video trim"
            >
              <div
                className="absolute top-3 bottom-3 cursor-grab rounded-lg bg-sky active:cursor-grabbing"
                style={{
                  left: `${duration ? (trim.start / duration) * 100 : 0}%`,
                  width: `${duration ? Math.max(((trim.end - trim.start) / duration) * 100, 0) : 0}%`,
                }}
                onPointerDown={(event) => onTrimPointerDown(event, "range")}
                onPointerMove={onTrimPointerMove}
                onPointerUp={onTrimPointerEnd}
                onPointerCancel={onTrimPointerEnd}
              />
              {(
                [
                  ["start", trim.start, "Trim start"],
                  ["end", trim.end, "Trim end"],
                ] as const
              ).map(([mode, time, label]) => (
                <div
                  key={mode}
                  role="slider"
                  aria-label={label}
                  aria-valuemin={0}
                  aria-valuemax={duration || 0}
                  aria-valuenow={time}
                  aria-disabled={!ready || locked}
                  className="absolute top-1 bottom-1 z-10 w-6 -translate-x-1/2 cursor-ew-resize rounded-md border-2 border-white bg-ink"
                  style={{ left: `${duration ? (time / duration) * 100 : 0}%` }}
                  onPointerDown={(event) => onTrimPointerDown(event, mode)}
                  onPointerMove={onTrimPointerMove}
                  onPointerUp={onTrimPointerEnd}
                  onPointerCancel={onTrimPointerEnd}
                />
              ))}
            </div>
            <p className="text-sm text-ink/60">
              The highlighted section is kept. Drag either edge to change the start or end, or drag the highlighted section to move it.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div role="radiogroup" aria-label="Video sound" className="inline-flex w-fit rounded-full border border-ink/15 p-1">
              <button
                type="button"
                role="radio"
                aria-checked={includeSound}
                disabled={locked || !ready}
                onClick={() => setIncludeSound(true)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${includeSound ? "bg-sky text-white" : "text-ink"} disabled:opacity-60`}
              >
                Include sound
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!includeSound}
                disabled={locked || !ready}
                onClick={() => setIncludeSound(false)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${includeSound ? "text-ink" : "bg-sky text-white"} disabled:opacity-60`}
              >
                Mute video
              </button>
            </div>
            <p className="text-sm text-ink/70">
              {includeSound ? "Original audio will be kept in the saved video." : "The saved video will be silent."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={locked || !ready} onClick={() => rotateBy(-90)} className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-60">
                Rotate left
              </button>
              <button type="button" disabled={locked || !ready} onClick={() => rotateBy(90)} className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-60">
                Rotate right
              </button>
              <button type="button" disabled={locked || !ready} onClick={() => void playPreview()} className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-60">
                {previewing ? "Stop" : "Preview"}
              </button>
              <button type="button" disabled={locked || !ready} onClick={resetEdits} className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-60">
                Reset
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {progress ? <p className="text-sm text-ink/70">{progress}</p> : null}
              {saveError ? (
                <p className="text-sm font-medium text-red-700" role="alert">{saveError}</p>
              ) : null}
              <button type="button" disabled={locked || !ready || clipLength > HERO_VIDEO_MAX_SECONDS + 0.05} onClick={() => void apply()} className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60">
                {locked ? "Saving…" : "Save video"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
