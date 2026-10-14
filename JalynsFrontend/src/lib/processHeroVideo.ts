import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { HERO_VIDEO_MAX_SECONDS, videoTooLongMessage } from "./heroMedia";

export type HeroCrop = { x: number; y: number; w: number; h: number };

export const FULL_HERO_CROP: HeroCrop = { x: 0, y: 0, w: 1, h: 1 };

function even(value: number) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function quarterTurns(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

export function rotatedSize(width: number, height: number, rotation: number) {
  const turns = quarterTurns(rotation);
  const swap = turns === 90 || turns === 270;
  return { width: swap ? height : width, height: swap ? width : height, turns };
}

/** Draw one rotated frame. `fullFrame` fills the canvas with the whole frame; otherwise it fills the canvas with the crop. */
export function paintHeroFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  rotation: number,
  crop: HeroCrop,
  fullFrame: boolean,
) {
  const { width: rotW, height: rotH, turns } = rotatedSize(sourceWidth, sourceHeight, rotation);
  const canvas = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  if (fullFrame) {
    const scale = Math.min(canvas.width / rotW, canvas.height / rotH);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((turns * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2);
  } else {
    const cropW = Math.max(1, crop.w * rotW);
    const cropH = Math.max(1, crop.h * rotH);
    const scale = Math.min(canvas.width / cropW, canvas.height / cropH);
    ctx.scale(scale, scale);
    ctx.translate(-crop.x * rotW, -crop.y * rotH);
    ctx.translate(rotW / 2, rotH / 2);
    ctx.rotate((turns * Math.PI) / 180);
    ctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2);
  }
  ctx.restore();
}

function seekTo(video: HTMLVideoElement, time: number, exact = false) {
  const target = Math.min(Math.max(0, time), Math.max(0, (video.duration || time) - 0.001));
  if (Math.abs(video.currentTime - target) < (exact ? 0.0004 : 0.02)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
      reject(new Error("Could not read this video."));
    };
    video.addEventListener("seeked", done);
    video.addEventListener("error", fail);
    video.currentTime = target;
  });
}

function waitForMetadata(video: HTMLVideoElement) {
  if (video.readyState >= 1 && Number.isFinite(video.duration)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("Could not read this video. Use an MP4 file."));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", done);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("loadedmetadata", done);
    video.addEventListener("error", fail);
  });
}

function outputSize(videoWidth: number, videoHeight: number, rotation: number, crop: HeroCrop, maxEdge: number) {
  const { width: rotW, height: rotH } = rotatedSize(videoWidth, videoHeight, rotation);
  const cropW = Math.max(2, crop.w * rotW);
  const cropH = Math.max(2, crop.h * rotH);
  const scale = Math.min(1, maxEdge / Math.max(cropW, cropH));
  return {
    width: even(cropW * scale),
    height: even(cropH * scale),
  };
}

function targetBitrate(width: number, height: number) {
  return Math.round(Math.min(10_000_000, Math.max(6_000_000, width * height * 5)));
}

/** Prefer a sharper H.264 profile, then fall back if this browser cannot encode it. */
async function supportedEncoder(width: number, height: number) {
  const bitrate = targetBitrate(width, height);
  const codecs = ["avc1.640029", "avc1.640028", "avc1.4d0029", "avc1.4d0028", "avc1.42001f"];
  for (const codec of codecs) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate,
      framerate: 30,
      latencyMode: "quality",
      bitrateMode: "variable",
      avc: { format: "avc" },
    };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) return config;
    } catch {
      // This profile is unavailable. Try the next one.
    }
  }
  return null;
}

function isIdentityEdit(
  duration: number,
  start: number,
  end: number,
  rotation: number,
  crop: HeroCrop,
  maxSeconds: number,
) {
  return (
    quarterTurns(rotation) === 0 &&
    crop.x <= 0.001 &&
    crop.y <= 0.001 &&
    crop.w >= 0.999 &&
    crop.h >= 0.999 &&
    start <= 0.05 &&
    Math.abs(end - duration) <= 0.08 &&
    duration <= maxSeconds + 0.05
  );
}

type TrimmedAudio = {
  sampleRate: number;
  numberOfChannels: number;
  channelData: Float32Array[];
};

function namedVideoFile(data: BlobPart, originalName: string, includeSound: boolean) {
  const base =
    (originalName.replace(/\.[^.]+$/, "") || "hero").replace(/-sound$/i, "").replace(/[^\w.-]+/g, "-") ||
    "hero";
  return new File([data], `${base}${includeSound ? "-sound" : ""}.mp4`, {
    type: "video/mp4",
    lastModified: Date.now(),
  });
}

/** Returns null when the file has no decodable audio. That is not an error. */
async function decodeTrimmedAudio(file: File, start: number, end: number): Promise<TrimmedAudio | null> {
  if (typeof AudioContext === "undefined") return null;
  let audioContext: AudioContext | null = null;
  try {
    audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(await file.arrayBuffer());
    const channels = Math.min(2, decoded.numberOfChannels);
    const startSample = Math.max(0, Math.floor(start * decoded.sampleRate));
    const endSample = Math.min(decoded.length, Math.ceil(end * decoded.sampleRate));
    const length = endSample - startSample;
    if (channels < 1 || length < 1) return null;

    const sampleRate = 48000;
    const outputLength = Math.max(1, Math.ceil((length / decoded.sampleRate) * sampleRate));
    const offline = new OfflineAudioContext(channels, outputLength, sampleRate);
    const buffer = offline.createBuffer(channels, length, decoded.sampleRate);
    for (let channel = 0; channel < channels; channel += 1) {
      buffer.copyToChannel(decoded.getChannelData(channel).slice(startSample, endSample), channel);
    }
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    return {
      sampleRate: rendered.sampleRate,
      numberOfChannels: rendered.numberOfChannels,
      channelData: Array.from({ length: rendered.numberOfChannels }, (_, index) => rendered.getChannelData(index).slice()),
    };
  } catch {
    return null;
  } finally {
    void audioContext?.close();
  }
}

function encodeTrimmedAudio(muxer: Muxer<ArrayBufferTarget>, audio: TrimmedAudio) {
  const frameCount = 1024;
  const total = audio.channelData[0]?.length ?? 0;
  if (!total) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const encoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? undefined),
      error: (error) => reject(error instanceof Error ? error : new Error("Could not keep this video's sound.")),
    });
    encoder.configure({
      codec: "mp4a.40.2",
      sampleRate: audio.sampleRate,
      numberOfChannels: audio.numberOfChannels,
      bitrate: 128_000,
    });
    for (let offset = 0; offset < total; offset += frameCount) {
      const count = Math.min(frameCount, total - offset);
      const planar = new Float32Array(frameCount * audio.numberOfChannels);
      for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
        planar.set(audio.channelData[channel].subarray(offset, offset + count), channel * frameCount);
      }
      const data = new AudioData({
        format: "f32-planar",
        sampleRate: audio.sampleRate,
        numberOfFrames: frameCount,
        numberOfChannels: audio.numberOfChannels,
        timestamp: Math.round((offset / audio.sampleRate) * 1_000_000),
        data: planar,
      });
      encoder.encode(data);
      data.close();
    }
    void encoder
      .flush()
      .then(() => {
        encoder.close();
        resolve();
      })
      .catch(reject);
  });
}

/**
 * Bake trim, crop, rotation, and the sound choice into a new MP4.
 * An unedited clip within the duration limit is returned as-is when sound is kept.
 * Mute always re-encodes so the saved file has no audio track.
 */
export async function exportHeroVideo(options: {
  file: File;
  start: number;
  end: number;
  rotation: number;
  crop: HeroCrop;
  includeSound?: boolean;
  /** Defaults to the hero limit. The gallery passes its own longer limit. */
  maxSeconds?: number;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}): Promise<File> {
  const { file, rotation, crop, signal, onProgress } = options;
  const includeSound = options.includeSound === true;
  if (signal?.aborted) throw new Error("Video editing was cancelled.");

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await waitForMetadata(video);
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Could not read this video. Use an MP4 file.");
    }
    const maxSeconds = options.maxSeconds ?? HERO_VIDEO_MAX_SECONDS;
    const start = Math.max(0, Math.min(options.start, duration));
    const end = Math.min(duration, Math.max(start + 0.2, options.end));
    if (end - start > maxSeconds + 0.05) {
      throw new Error(videoTooLongMessage(maxSeconds));
    }
    const audio = includeSound ? await decodeTrimmedAudio(file, start, end) : null;
    if (isIdentityEdit(duration, start, end, rotation, crop, maxSeconds) && includeSound) {
      return namedVideoFile(file, file.name, Boolean(audio));
    }

    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
      throw new Error(
        `This browser cannot edit video. Use Chrome, Edge, or Safari, or upload an MP4 that is already ${maxSeconds} seconds or shorter.`,
      );
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) throw new Error("Could not read this video.");

    let size = outputSize(sourceWidth, sourceHeight, rotation, crop, 1920);
    let encoderConfig = await supportedEncoder(size.width, size.height);
    if (!encoderConfig) {
      size = outputSize(sourceWidth, sourceHeight, rotation, crop, 1280);
      encoderConfig = await supportedEncoder(size.width, size.height);
    }
    if (!encoderConfig) {
      throw new Error("This browser cannot export an MP4. Try Chrome, Edge, or Safari.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Could not prepare this video.");

    let muxAudio = audio;
    if (muxAudio) {
      if (typeof AudioEncoder === "undefined") {
        throw new Error("This browser cannot keep the video sound. Choose Mute video, or use Chrome, Edge, or Safari.");
      }
      const audioSupport = await AudioEncoder.isConfigSupported({
        codec: "mp4a.40.2",
        sampleRate: muxAudio.sampleRate,
        numberOfChannels: muxAudio.numberOfChannels,
        bitrate: 128_000,
      });
      if (!audioSupport.supported) {
        throw new Error("This browser cannot keep the video sound. Choose Mute video, or use Chrome, Edge, or Safari.");
      }
    }

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
      video: { codec: "avc", width: size.width, height: size.height },
      ...(muxAudio
        ? {
            audio: {
              codec: "aac" as const,
              sampleRate: muxAudio.sampleRate,
              numberOfChannels: muxAudio.numberOfChannels,
            },
          }
        : {}),
    });

    let encoderError: Error | null = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
      error: (error) => {
        encoderError = error instanceof Error ? error : new Error("Could not export this video.");
      },
    });
    encoder.configure(encoderConfig);

    await seekTo(video, start);
    await video.play();

    const span = Math.max(0.2, end - start);
    let frames = 0;
    let lastTimestamp = -1;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const stop = (error?: Error) => {
        if (settled) return;
        settled = true;
        video.pause();
        if (error) reject(error);
        else resolve();
      };
      const schedule = () => {
        if (settled) return;
        if (typeof video.requestVideoFrameCallback === "function") {
          video.requestVideoFrameCallback((_now, metadata) => capture(metadata.mediaTime));
        } else {
          requestAnimationFrame(() => capture(video.currentTime));
        }
      };
      const capture = (mediaTime: number) => {
        if (settled) return;
        if (signal?.aborted) {
          stop(new Error("Video editing was cancelled."));
          return;
        }
        if (encoderError) {
          stop(encoderError);
          return;
        }
        if (!Number.isFinite(mediaTime) || mediaTime >= end - 0.02 || video.ended) {
          stop();
          return;
        }
        const timestamp = Math.max(0, Math.round((mediaTime - start) * 1_000_000));
        if (timestamp > lastTimestamp) {
          paintHeroFrame(ctx, video, sourceWidth, sourceHeight, rotation, crop, false);
          const duration = lastTimestamp < 0 ? 33_333 : Math.max(1, timestamp - lastTimestamp);
          const frame = new VideoFrame(canvas, { timestamp, duration });
          encoder.encode(frame, { keyFrame: frames % 30 === 0 });
          frame.close();
          lastTimestamp = timestamp;
          frames += 1;
          onProgress?.(Math.min(0.92, (mediaTime - start) / span));
        }
        if (encoder.encodeQueueSize > 3) {
          video.pause();
          const waitStarted = performance.now();
          const resume = () => {
            if (settled) return;
            if (encoder.encodeQueueSize > 1 && performance.now() - waitStarted < 2500) {
              setTimeout(resume, 8);
              return;
            }
            void video.play().then(schedule).catch(() => stop(new Error("Could not read this video.")));
          };
          resume();
          return;
        }
        schedule();
      };
      schedule();
    });

    if (!frames) throw new Error("Could not read any frames from this video.");
    await encoder.flush();
    if (encoderError) throw encoderError;
    encoder.close();
    if (muxAudio) await encodeTrimmedAudio(muxer, muxAudio);
    muxer.finalize();
    onProgress?.(1);

    return namedVideoFile(target.buffer, file.name, Boolean(muxAudio));
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
