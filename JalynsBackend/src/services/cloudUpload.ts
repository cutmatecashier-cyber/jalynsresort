import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'
import {
  assertGalleryVideo,
  assertHeroVideo,
  GALLERY_VIDEO_MAX_SECONDS,
  HERO_VIDEO_MAX_BYTES,
  HERO_VIDEO_MAX_SECONDS,
  heroVideoKeepsSound,
} from './heroVideo.js'
import { isHeroVideoFile, prepareRoomImage } from './prepareRoomImage.js'

const readyBuckets = new Set<string>()
export const MEDIA_CACHE_CONTROL = '31536000'

const BASE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/jpg',
  'video/mp4',
]

function extFromMime(mime: string) {
  if (mime === 'video/mp4') return 'mp4'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

function publicUrl(bucket: string, objectPath: string, cacheKey?: string) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath)
  const url = data.publicUrl
  if (!cacheKey) return url
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
}

function mergedMimeTypes(existing: string[] | null | undefined) {
  return Array.from(new Set([...(existing ?? []), ...BASE_MIME_TYPES]))
}

/** Create the bucket when missing, and allow MP4 hero videos on buckets that already exist. */
export async function ensurePublicMediaBucket(bucket: string) {
  if (readyBuckets.has(bucket)) return
  const { data } = await supabaseAdmin.storage.getBucket(bucket)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 40 * 1024 * 1024,
      allowedMimeTypes: BASE_MIME_TYPES,
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(
        /bucket|not found/i.test(error.message)
          ? `Storage bucket "${bucket}" is missing. Create it in Supabase (public), then try again.`
          : error.message || `Could not create bucket "${bucket}".`,
      )
    }
  } else {
    const currentLimit = Number(data.file_size_limit ?? 0)
    const allowed = mergedMimeTypes(data.allowed_mime_types)
    const needsVideo = !data.allowed_mime_types?.includes('video/mp4')
    const needsRoom = !Number.isFinite(currentLimit) || currentLimit < 40 * 1024 * 1024
    if (needsVideo || needsRoom) {
      const { error } = await supabaseAdmin.storage.updateBucket(bucket, {
        public: true,
        fileSizeLimit: Math.max(currentLimit || 0, 40 * 1024 * 1024),
        allowedMimeTypes: allowed,
      })
      if (error) {
        console.warn(`Could not update storage bucket "${bucket}" for video uploads: ${error.message}`)
      }
    }
  }
  readyBuckets.add(bucket)
}

export type CloudUploadInput = {
  bucket: string
  folder: string
  file: Express.Multer.File
  /** Optional stable filename without extension (e.g. current) */
  stableName?: string
  upsert?: boolean
  /** Hero uploads stay on the 3 second check. Gallery clips use the 10 second check. */
  videoPolicy?: 'hero' | 'gallery'
}

/**
 * Upload an image buffer to a public Supabase Storage bucket and return its public URL.
 * Used by Home / Rooms / Gallery / Spa treatment / News / Restaurant admin edits.
 */
async function removeSiblingObjects(bucket: string, folder: string, keepPath: string) {
  const prefix = folder.replace(/\/$/, '')
  const { data } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 100 })
  const leftovers = (data ?? [])
    .filter((item) => item.name && `${prefix}/${item.name}` !== keepPath)
    .map((item) => `${prefix}/${item.name}`)
  if (leftovers.length) {
    await supabaseAdmin.storage.from(bucket).remove(leftovers)
  }
}

export async function uploadPublicImage(input: CloudUploadInput): Promise<string> {
  const { bucket, folder, stableName, upsert = false } = input
  const video = isHeroVideoFile(input.file)
  const file = video ? input.file : await prepareRoomImage(input.file)
  if (video) {
    if (input.videoPolicy === 'gallery') assertGalleryVideo(file)
    else assertHeroVideo(file)
  }
  if (!file?.buffer?.length) {
    throw new Error(video ? 'Please choose an MP4 video.' : 'Please choose an image to upload.')
  }
  await ensurePublicMediaBucket(bucket)

  const ext = extFromMime(file.mimetype || (video ? 'video/mp4' : 'image/jpeg'))
  const base =
    (stableName || `${Date.now()}-${randomUUID().slice(0, 8)}`)
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-|-$/g, '') || `img-${Date.now()}`
  const folderPath = folder.replace(/\/$/, '')
  const objectBase = video && heroVideoKeepsSound(file) ? `${base}-sound` : base
  const objectPath = `${folderPath}/${objectBase}.${ext}`

  const { error } = await supabaseAdmin.storage.from(bucket).upload(objectPath, file.buffer, {
    cacheControl: MEDIA_CACHE_CONTROL,
    upsert: upsert || Boolean(stableName),
    contentType: file.mimetype || (video ? 'video/mp4' : `image/${ext === 'jpg' ? 'jpeg' : ext}`),
  })
  if (error) {
    throw new Error(error.message || 'Could not upload file to cloud storage.')
  }
  if (stableName) await removeSiblingObjects(bucket, folderPath, objectPath)
  return publicUrl(bucket, objectPath, String(Date.now()))
}

const DIRECT_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'])

export type DirectUploadRequest = {
  bucket: string
  folder: string
  contentType: string
  fileName: string
  size: number
  /** Required for MP4. Checked against the hero or gallery limit. */
  durationSeconds?: number
  videoPolicy?: 'hero' | 'gallery'
}

/**
 * Sign a one-time URL so the browser uploads straight to Supabase Storage
 * instead of streaming the file through this server first.
 */
export async function createDirectUpload(input: DirectUploadRequest) {
  const contentType = input.contentType.toLowerCase()
  if (!DIRECT_MIME_TYPES.has(contentType)) {
    throw new Error('Only JPG, PNG, WEBP, GIF, or MP4 files can be uploaded directly.')
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new Error('Please choose a file to upload.')
  }
  if (input.size > HERO_VIDEO_MAX_BYTES) {
    throw new Error('This file is too large. Keep uploads under 40 MB.')
  }
  const video = contentType === 'video/mp4'
  if (video) {
    const maxSeconds = input.videoPolicy === 'gallery' ? GALLERY_VIDEO_MAX_SECONDS : HERO_VIDEO_MAX_SECONDS
    const seconds = Number(input.durationSeconds)
    if (!Number.isFinite(seconds) || seconds <= 0) {
      throw new Error('Could not read this video. Use an MP4 file.')
    }
    if (seconds > maxSeconds) {
      throw new Error(
        input.videoPolicy === 'gallery'
          ? 'Gallery videos must be 10 seconds or shorter. Trim the video, then upload it again.'
          : 'Hero videos must be 3 seconds or shorter. Trim the video, then upload it again.',
      )
    }
  }

  await ensurePublicMediaBucket(input.bucket)
  const folderPath = input.folder.replace(/\/$/, '')
  const base = `${Date.now()}-${randomUUID().slice(0, 8)}`
  const objectBase = video && heroVideoKeepsSound({ originalname: input.fileName }) ? `${base}-sound` : base
  const objectPath = `${folderPath}/${objectBase}.${extFromMime(contentType)}`

  const { data, error } = await supabaseAdmin.storage
    .from(input.bucket)
    .createSignedUploadUrl(objectPath, { upsert: true })
  if (error || !data) {
    throw new Error(error?.message || 'Could not prepare the upload.')
  }
  return { signedUrl: data.signedUrl, path: objectPath, cacheControl: MEDIA_CACHE_CONTROL }
}

/**
 * Confirm a browser upload landed inside `folder`, then return its public URL.
 * Older files in the folder are removed in the background.
 */
export async function finishDirectUpload(input: { bucket: string; folder: string; path: string }) {
  const folderPath = input.folder.replace(/\/$/, '')
  const objectPath = input.path.trim()
  const name = objectPath.slice(folderPath.length + 1)
  if (!objectPath.startsWith(`${folderPath}/`) || !name || name.includes('/') || name.includes('..')) {
    throw new Error('Invalid upload path.')
  }
  const { data, error } = await supabaseAdmin.storage
    .from(input.bucket)
    .list(folderPath, { limit: 100, search: name })
  if (error) throw new Error(error.message || 'Could not confirm the upload.')
  if (!data?.some((item) => item.name === name)) {
    throw new Error('The upload did not finish. Please try again.')
  }
  void removeSiblingObjects(input.bucket, folderPath, objectPath).catch((err: unknown) => {
    console.warn(`Could not clean up old files in ${input.bucket}/${folderPath}:`, err)
  })
  return publicUrl(input.bucket, objectPath, String(Date.now()))
}

export const SITE_BUCKETS = {
  home: 'home-page',
  rooms: 'rooms-page',
  gallery: 'gallery-page',
  spa: 'spa-page',
  news: 'news-page',
  restaurant: 'restaurant-page',
} as const
