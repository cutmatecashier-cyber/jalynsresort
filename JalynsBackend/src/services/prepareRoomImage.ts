import sharp from 'sharp'

const TAG_COMPRESSION = 0x0103
const TAG_STRIP_OFFSETS = 0x0111
const TAG_STRIP_BYTE_COUNTS = 0x0117
const TAG_SUB_IFD = 0x014a
const TAG_JPEG_OFFSET = 0x0201
const TAG_JPEG_LENGTH = 0x0202
const TAG_EXIF_IFD = 0x8769

type Reader = {
  u16: (offset: number) => number
  u32: (offset: number) => number
}

const DISPLAYABLE = /^image\/(jpe?g|png|webp|gif)$/i
const RAW_NAME =
  /\.(nef|nrw|cr2|cr3|arw|dng|orf|rw2|raf|srw|raw|pef|x3f)$/i

function needsConvert(file: Express.Multer.File) {
  const name = file.originalname || ''
  const mime = (file.mimetype || '').toLowerCase()
  if (RAW_NAME.test(name) || mime.includes('nikon') || mime.includes('raw') || mime === 'image/nef') {
    return true
  }
  return !DISPLAYABLE.test(mime)
}

function readerFor(buffer: Buffer, littleEndian: boolean): Reader {
  return {
    u16: (offset) => (littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset)),
    u32: (offset) => (littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset)),
  }
}

function readLongs(
  buffer: Buffer,
  read: Reader,
  entry: number,
  type: number,
  count: number,
): number[] {
  const size = type === 3 ? 2 : type === 4 ? 4 : 0
  if (!size || count <= 0 || count > 64) return []
  const total = size * count
  let base = entry + 8
  if (total > 4) {
    base = read.u32(entry + 8)
    if (base <= 0 || base + total > buffer.length) return []
  }
  const values: number[] = []
  for (let i = 0; i < count; i += 1) {
    const offset = base + i * size
    if (offset + size > buffer.length) break
    values.push(size === 2 ? read.u16(offset) : read.u32(offset))
  }
  return values
}

function pushJpeg(found: Buffer[], buffer: Buffer, offset: number, length: number) {
  if (length < 20_000 || offset < 0 || offset + length > buffer.length) return
  const slice = buffer.subarray(offset, offset + length)
  if (slice[0] !== 0xff || slice[1] !== 0xd8) return
  found.push(Buffer.from(slice))
}

/** Nikon NEF is a TIFF container. Preview JPEGs live in IFDs and SubIFDs. */
function jpegsFromTiff(buffer: Buffer): Buffer[] {
  if (buffer.length < 16) return []
  const littleEndian = buffer[0] === 0x49 && buffer[1] === 0x49
  const bigEndian = buffer[0] === 0x4d && buffer[1] === 0x4d
  if (!littleEndian && !bigEndian) return []
  const read = readerFor(buffer, littleEndian)
  if (read.u16(2) !== 42) return []

  const found: Buffer[] = []
  const seen = new Set<number>()

  function walk(ifdOffset: number, depth: number) {
    if (depth > 8 || ifdOffset <= 0 || ifdOffset + 2 > buffer.length || seen.has(ifdOffset)) return
    seen.add(ifdOffset)
    const count = read.u16(ifdOffset)
    if (count <= 0 || count > 400 || ifdOffset + 2 + count * 12 + 4 > buffer.length) return

    let jpegOffset = 0
    let jpegLength = 0
    let compression = 0
    const subIfds: number[] = []
    const strips: number[] = []
    const stripCounts: number[] = []

    for (let i = 0; i < count; i += 1) {
      const entry = ifdOffset + 2 + i * 12
      const tag = read.u16(entry)
      const type = read.u16(entry + 2)
      const n = read.u32(entry + 4)
      if (tag === TAG_JPEG_OFFSET) jpegOffset = read.u32(entry + 8)
      else if (tag === TAG_JPEG_LENGTH) jpegLength = read.u32(entry + 8)
      else if (tag === TAG_COMPRESSION) compression = read.u16(entry + 8)
      else if (tag === TAG_SUB_IFD || tag === TAG_EXIF_IFD) {
        subIfds.push(...readLongs(buffer, read, entry, type, n))
      } else if (tag === TAG_STRIP_OFFSETS) {
        strips.push(...readLongs(buffer, read, entry, type, n))
      } else if (tag === TAG_STRIP_BYTE_COUNTS) {
        stripCounts.push(...readLongs(buffer, read, entry, type, n))
      }
    }

    pushJpeg(found, buffer, jpegOffset, jpegLength)
    if (compression === 6 || compression === 7) {
      for (let i = 0; i < strips.length; i += 1) {
        pushJpeg(found, buffer, strips[i] ?? 0, stripCounts[i] ?? 0)
      }
    }

    for (const sub of subIfds) walk(sub, depth + 1)
    walk(read.u32(ifdOffset + 2 + count * 12), depth + 1)
  }

  walk(read.u32(4), 0)
  return found
}

/** Fallback when the preview is not referenced by a standard TIFF tag. */
function jpegsByScan(buffer: Buffer): Buffer[] {
  const found: Buffer[] = []
  const length = buffer.length
  let i = 0
  while (i < length - 3 && found.length < 8) {
    if (buffer[i] !== 0xff || buffer[i + 1] !== 0xd8 || buffer[i + 2] !== 0xff) {
      i += 1
      continue
    }
    const limit = Math.min(length - 1, i + 20 * 1024 * 1024)
    let end = -1
    for (let j = i + 2; j < limit; j += 1) {
      if (buffer[j] === 0xff && buffer[j + 1] === 0xd9) {
        end = j + 2
        break
      }
    }
    if (end > 0 && end - i >= 20_000) {
      found.push(Buffer.from(buffer.subarray(i, end)))
      i = end
    } else {
      i += 1
    }
  }
  return found
}

async function largestReadableJpeg(candidates: Buffer[]) {
  const ranked = [...candidates].sort((a, b) => b.length - a.length).slice(0, 6)
  let best: { buffer: Buffer; pixels: number } | null = null
  for (const candidate of ranked) {
    try {
      const meta = await sharp(candidate, { failOn: 'none' }).metadata()
      if (meta.format !== 'jpeg' || !meta.width || !meta.height || meta.width < 400) continue
      const pixels = meta.width * meta.height
      if (!best || pixels > best.pixels) best = { buffer: candidate, pixels }
    } catch {
      // Not a real JPEG preview.
    }
  }
  return best?.buffer ?? null
}

async function encodeJpeg(buffer: Buffer) {
  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer()
}

async function embeddedJpeg(buffer: Buffer) {
  const fromTiff = jpegsFromTiff(buffer)
  return largestReadableJpeg(fromTiff.length ? fromTiff : jpegsByScan(buffer))
}

/**
 * Browsers cannot render camera RAW or some phone formats.
 * JPG, PNG, WEBP, and GIF pass through. Everything else becomes a JPEG.
 */
export async function prepareRoomImage(file: Express.Multer.File): Promise<Express.Multer.File> {
  if (!file?.buffer?.length || !needsConvert(file)) return file

  const raw = RAW_NAME.test(file.originalname || '')
  let jpeg: Buffer | null = null
  if (raw) {
    const embedded = await embeddedJpeg(file.buffer)
    if (embedded) jpeg = await encodeJpeg(embedded)
  }
  if (!jpeg) {
    try {
      jpeg = await encodeJpeg(file.buffer)
    } catch {
      const embedded = await embeddedJpeg(file.buffer)
      if (embedded) jpeg = await encodeJpeg(embedded)
    }
  }
  if (!jpeg?.length) {
    throw new Error('Could not read this image. Try JPG, PNG, WEBP, or another photo.')
  }

  const base = (file.originalname || 'photo').replace(/\.[^.]+$/, '') || 'photo'
  return {
    ...file,
    buffer: jpeg,
    size: jpeg.length,
    mimetype: 'image/jpeg',
    originalname: `${base}.jpg`,
  }
}
