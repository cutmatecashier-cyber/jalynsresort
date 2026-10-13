import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'
import { assertHeroVideo, heroVideoKeepsSound } from './heroVideo.js'
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
  if (video) assertHeroVideo(file)
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

export const SITE_BUCKETS = {
  home: 'home-page',
  rooms: 'rooms-page',
  gallery: 'gallery-page',
  spa: 'spa-page',
  news: 'news-page',
  restaurant: 'restaurant-page',
} as const
