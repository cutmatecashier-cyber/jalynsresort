import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ROOM_IMAGE_ACCEPT } from "../lib/rooms";
import { PhotoAdjustDialog } from "./PhotoAdjustDialog";

const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };

type Props = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  capture?: "user" | "environment";
  id?: string;
  className?: string;
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
  { accept = ROOM_IMAGE_ACCEPT, multiple = false, disabled = false, capture, id, className = "hidden", onFiles },
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
  const [fileName, setFileName] = useState("photo.jpg");
  const [progress, setProgress] = useState<string | null>(null);

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  function clearUrl() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  function finish() {
    clearUrl();
    setSource(null);
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
        accept={accept}
        multiple={multiple}
        capture={capture}
        disabled={disabled}
        className={className}
        onChange={(event) => onPick(event.target.files)}
      />
      {source ? (
        <PhotoAdjustDialog
          key={source}
          source={source}
          fileName={fileName}
          initialCrop={FULL_CROP}
          progress={progress}
          onCancel={cancel}
          onApply={(file) => {
            doneRef.current.push(file);
            advance();
          }}
        />
      ) : null}
    </>
  );
});
