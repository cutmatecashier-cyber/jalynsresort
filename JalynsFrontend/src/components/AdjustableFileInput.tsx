import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HERO_MEDIA_ACCEPT, isHeroVideoFile } from "../lib/heroMedia";
import { ROOM_IMAGE_ACCEPT } from "../lib/rooms";
import { PhotoAdjustDialog } from "./PhotoAdjustDialog";
import { VideoAdjustDialog } from "./VideoAdjustDialog";

const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };

type Props = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  capture?: "user" | "environment";
  id?: string;
  className?: string;
  /** Hero backgrounds can be an image or a short MP4. */
  allowVideo?: boolean;
  onFiles: (files: File[]) => void;
};

function canPreview(file: File) {
  if (/\.(nef|nrw|cr2|cr3|arw|dng|orf|rw2|raf|srw|raw|pef|x3f|heic|heif|tiff?)$/i.test(file.name)) {
    return false;
  }
  if (file.type === "image/heic" || file.type === "image/heif" || file.type === "image/tiff") {
    return false;
  }
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|jpe|png|gif|webp|bmp|avif)$/i.test(file.name);
}

function jpegName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

export const AdjustableFileInput = forwardRef<HTMLInputElement, Props>(function AdjustableFileInput(
  {
    accept,
    multiple = false,
    disabled = false,
    capture,
    id,
    className = "hidden",
    allowVideo = false,
    onFiles,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const restRef = useRef<File[]>([]);
  const doneRef = useRef<File[]>([]);
  const urlRef = useRef<string | null>(null);
  const totalRef = useRef(0);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;
  const [source, setSource] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("photo.jpg");
  const [progress, setProgress] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const acceptValue = accept ?? (allowVideo ? HERO_MEDIA_ACCEPT : ROOM_IMAGE_ACCEPT);

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  function clearUrl() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  function finish() {
    clearUrl();
    setSource(null);
    setVideoFile(null);
    setProgress(null);
    const done = doneRef.current;
    doneRef.current = [];
    restRef.current = [];
    if (done.length) onFilesRef.current(done);
  }

  function advance() {
    clearUrl();
    const next = restRef.current.shift();
    if (!next) {
      finish();
      return;
    }
    const index = totalRef.current - restRef.current.length;
    if (allowVideo && isHeroVideoFile(next)) {
      const url = URL.createObjectURL(next);
      urlRef.current = url;
      setVideoFile(next);
      setSource(url);
      return;
    }
    if (!canPreview(next)) {
      doneRef.current.push(next);
      advance();
      return;
    }
    const url = URL.createObjectURL(next);
    urlRef.current = url;
    setFileName(jpegName(next.name));
    setProgress(totalRef.current > 1 ? `Photo ${index} of ${totalRef.current}.` : null);
    setSource(url);
  }

  function onPick(list: FileList | null) {
    setPickError(null);
    const files = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (!files.length) return;
    restRef.current = files;
    doneRef.current = [];
    totalRef.current = files.length;
    advance();
  }

  function cancel() {
    restRef.current = [];
    finish();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        id={id}
        accept={acceptValue}
        multiple={multiple}
        capture={capture}
        disabled={disabled}
        className={className}
        onChange={(event) => onPick(event.target.files)}
      />
      {pickError
        ? createPortal(
            <div
              className="fixed inset-x-4 bottom-4 z-[260] mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-800 shadow-xl"
              role="alert"
            >
              <p>{pickError}</p>
              <button
                type="button"
                onClick={() => setPickError(null)}
                className="btn-press mt-3 rounded-full border border-red-300 px-3 py-1.5 text-sm font-semibold"
              >
                OK
              </button>
            </div>,
            document.body,
          )
        : null}
      {source && videoFile ? (
        <VideoAdjustDialog
          key={source}
          source={source}
          file={videoFile}
          onCancel={cancel}
          onApply={(next) => {
            doneRef.current.push(next);
            advance();
          }}
        />
      ) : null}
      {source && !videoFile ? (
        <PhotoAdjustDialog
          key={source}
          source={source}
          fileName={fileName}
          initialCrop={FULL_CROP}
          progress={progress}
          onCancel={cancel}
          onApply={(next) => {
            doneRef.current.push(next);
            advance();
          }}
        />
      ) : null}
    </>
  );
});
