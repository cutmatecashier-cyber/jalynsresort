import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { adminAuthHeaders } from "../lib/adminAuth";
import { getApiUrl } from "../lib/api";

type Crop = { x: number; y: number; w: number; h: number };
type DragMode = "move" | "nw" | "ne" | "sw" | "se";

const MIN_CROP = 0.12;
const START_CROP: Crop = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };

type PhotoAdjustDialogProps = {
  source: string;
  busy?: boolean;
  progress?: string | null;
  onCancel: () => void;
  onApply: (file: File) => void | Promise<void>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nextCrop(mode: DragMode, start: Crop, dx: number, dy: number): Crop {
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
    return {
      x,
      y: start.y,
      w: start.w + (start.x - x),
      h: clamp(start.h + dy, MIN_CROP, 1 - start.y),
    };
  }
  if (mode === "ne") {
    const y = clamp(start.y + dy, 0, start.y + start.h - MIN_CROP);
    return {
      x: start.x,
      y,
      w: clamp(start.w + dx, MIN_CROP, 1 - start.x),
      h: start.h + (start.y - y),
    };
  }
  const x = clamp(start.x + dx, 0, start.x + start.w - MIN_CROP);
  const y = clamp(start.y + dy, 0, start.y + start.h - MIN_CROP);
  return {
    x,
    y,
    w: start.w + (start.x - x),
    h: start.h + (start.y - y),
  };
}

async function loadImage(source: string) {
  let url = source;
  let owned: string | null = null;
  if (!/^(blob:|data:)/i.test(source)) {
    const headers = await adminAuthHeaders(false);
    const res = await fetch(
      `${getApiUrl()}/api/rooms/source-image?url=${encodeURIComponent(source)}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(data?.message || "Could not load this photo.");
    }
    const blob = await res.blob();
    owned = URL.createObjectURL(blob);
    url = owned;
  }
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Could not read this photo."));
    element.src = url;
  });
  return { image, owned };
}

function renderAdjusted(image: HTMLImageElement, rotation: number, crop: Crop) {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  const rotW = rotation % 180 === 0 ? srcW : srcH;
  const rotH = rotation % 180 === 0 ? srcH : srcW;
  const cropW = Math.max(1, crop.w * rotW);
  const cropH = Math.max(1, crop.h * rotH);
  const scale = Math.min(1, 2400 / Math.max(cropW, cropH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropW * scale));
  canvas.height = Math.max(1, Math.round(cropH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not save this photo.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-crop.x * rotW, -crop.y * rotH);
  ctx.translate(rotW / 2, rotH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(image, -srcW / 2, -srcH / 2);
  ctx.restore();
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not save this photo."));
          return;
        }
        resolve(new File([blob], "room-photo.jpg", { type: "image/jpeg", lastModified: Date.now() }));
      },
      "image/jpeg",
      0.92,
    );
  });
}

function previewUrl(image: HTMLImageElement, rotation: number) {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  const rotW = rotation % 180 === 0 ? srcW : srcH;
  const rotH = rotation % 180 === 0 ? srcH : srcW;
  const scale = Math.min(1, 1400 / Math.max(rotW, rotH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rotW * scale));
  canvas.height = Math.max(1, Math.round(rotH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(image, -srcW / 2, -srcH / 2);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function PhotoAdjustDialog({
  source,
  busy = false,
  progress,
  onCancel,
  onApply,
}: PhotoAdjustDialogProps) {
  const titleId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ mode: DragMode; x: number; y: number; crop: Crop } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<Crop>(START_CROP);
  const [preview, setPreview] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let owned: string | null = null;
    setLoadError(null);
    setPreview("");
    setRotation(0);
    setCrop(START_CROP);
    imageRef.current = null;
    void loadImage(source)
      .then((loaded) => {
        if (cancelled) {
          if (loaded.owned) URL.revokeObjectURL(loaded.owned);
          return;
        }
        owned = loaded.owned;
        imageRef.current = loaded.image;
        setPreview(previewUrl(loaded.image, 0));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load this photo.");
        }
      });
    return () => {
      cancelled = true;
      if (owned) URL.revokeObjectURL(owned);
    };
  }, [source]);

  useEffect(() => {
    if (busy) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  function rotateBy(delta: number) {
    const image = imageRef.current;
    if (!image || busy || working) return;
    const next = (rotation + delta + 360) % 360;
    setRotation(next);
    setCrop(START_CROP);
    setPreview(previewUrl(image, next));
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
    if (busy || working) return;
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

  async function apply() {
    const image = imageRef.current;
    if (!image || busy || working) return;
    setWorking(true);
    setSaveError(null);
    try {
      await onApply(await renderAdjusted(image, rotation, crop));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this photo.");
      setWorking(false);
    }
  }

  const locked = busy || working;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={() => !locked && onCancel()}
    >
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
              Cut and rotate
            </h3>
            <p className="mt-1 text-sm text-ink/70">
              Drag the box to move it. Drag a corner to cut the photo.
              {progress ? ` ${progress}` : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={locked}
            onClick={onCancel}
            className="btn-press rounded-full border border-ink/15 px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mx-5 mt-4 flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#111] p-4 sm:mx-6">
          {loadError ? (
            <p className="text-sm font-medium text-white" role="alert">
              {loadError}
            </p>
          ) : preview ? (
            <div ref={frameRef} className="relative inline-block max-w-full touch-none select-none">
              <img
                src={preview}
                alt=""
                draggable={false}
                className="block max-h-[min(52vh,560px)] w-auto max-w-full"
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 bg-black/55"
                style={{ height: `${crop.y * 100}%` }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55"
                style={{ height: `${(1 - crop.y - crop.h) * 100}%` }}
              />
              <div
                className="pointer-events-none absolute left-0 bg-black/55"
                style={{
                  top: `${crop.y * 100}%`,
                  height: `${crop.h * 100}%`,
                  width: `${crop.x * 100}%`,
                }}
              />
              <div
                className="pointer-events-none absolute right-0 bg-black/55"
                style={{
                  top: `${crop.y * 100}%`,
                  height: `${crop.h * 100}%`,
                  width: `${(1 - crop.x - crop.w) * 100}%`,
                }}
              />
              <div
                className="absolute cursor-move border-2 border-white"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
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
            </div>
          ) : (
            <p className="text-sm text-white/80">Loading photo…</p>
          )}
        </div>

        <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={locked || !preview}
              onClick={() => rotateBy(-90)}
              className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Rotate left
            </button>
            <button
              type="button"
              disabled={locked || !preview}
              onClick={() => rotateBy(90)}
              className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Rotate right
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {saveError ? (
              <p className="text-sm font-medium text-red-700" role="alert">
                {saveError}
              </p>
            ) : null}
            <button
              type="button"
              disabled={locked || !preview}
              onClick={() => void apply()}
              className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60"
            >
              {locked ? "Saving…" : "Save photo"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
