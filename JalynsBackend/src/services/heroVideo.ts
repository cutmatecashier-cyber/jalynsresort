import { isHeroVideoFile } from './prepareRoomImage.js'

export const HERO_VIDEO_MAX_SECONDS = 5.3
export const HERO_VIDEO_MAX_BYTES = 40 * 1024 * 1024

type BoxRange = { body: number; end: number }

function findChild(buffer: Buffer, start: number, end: number, name: string): BoxRange | null {
  let offset = start
  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset)
    const type = buffer.toString('latin1', offset + 4, offset + 8)
    let header = 8
    if (size === 1) {
      if (offset + 16 > end) return null
      const large = buffer.readBigUInt64BE(offset + 8)
      if (large > BigInt(Number.MAX_SAFE_INTEGER)) return null
      size = Number(large)
      header = 16
    } else if (size === 0) {
      size = end - offset
    }
    if (size < header || offset + size > end) return null
    const body = offset + header
    const boxEnd = offset + size
    if (type === name) return { body, end: boxEnd }
    offset = boxEnd
  }
  return null
}

function mvhdSeconds(buffer: Buffer, body: number, end: number): number | null {
  if (body >= end) return null
  const version = buffer[body]
  if (version === 0) {
    if (body + 20 > end) return null
    const timescale = buffer.readUInt32BE(body + 12)
    const duration = buffer.readUInt32BE(body + 16)
    if (!timescale) return null
    return duration / timescale
  }
  if (version === 1) {
    if (body + 32 > end) return null
    const timescale = buffer.readUInt32BE(body + 20)
    const duration = Number(buffer.readBigUInt64BE(body + 24))
    if (!timescale) return null
    return duration / timescale
  }
  return null
}

/** Read movie duration from an MP4 `mvhd` box. Returns null when the file is not a readable MP4. */
export function readMp4DurationSeconds(buffer: Buffer): number | null {
  if (!buffer || buffer.length < 16) return null
  const moov = findChild(buffer, 0, buffer.length, 'moov')
  if (!moov) return null
  const mvhd = findChild(buffer, moov.body, moov.end, 'mvhd')
  if (!mvhd) return null
  const seconds = mvhdSeconds(buffer, mvhd.body, mvhd.end)
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  return seconds
}

/** The editor names kept-audio exports `*-sound.mp4`. Page URLs are rebuilt from that file name. */
export function heroVideoKeepsSound(file: { originalname?: string }) {
  return /-sound\.mp4$/i.test(file.originalname || '')
}

export function assertHeroVideo(file: Express.Multer.File) {
  if (!isHeroVideoFile(file)) {
    throw new Error('Please choose an MP4 video.')
  }
  if (!file.buffer?.length) {
    throw new Error('This video file is empty.')
  }
  if (file.size > HERO_VIDEO_MAX_BYTES || file.buffer.length > HERO_VIDEO_MAX_BYTES) {
    throw new Error('This video is too large. Keep hero videos under 40 MB.')
  }
  const seconds = readMp4DurationSeconds(file.buffer)
  if (seconds == null) {
    throw new Error('Could not read this video. Use an MP4 file.')
  }
  if (seconds > HERO_VIDEO_MAX_SECONDS) {
    throw new Error('Hero videos must be 5 seconds or shorter. Trim the video, then upload it again.')
  }
}
