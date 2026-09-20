import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

const readyBuckets = new Set<string>()

function extFromMime(mime: string) {
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

async function ensurePublicBucket(bucket: string) {
  if (readyBuckets.has(bucket)) return
  const { data } = await supabaseAdmin.storage.getBucket(bucket)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 12582912,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(
        /bucket|not found/i.test(error.message)
          ? `Storage bucket "${bucket}" is missing. Create it in Supabase (public), then try again.`
          : error.message || `Could not create bucket "${bucket}".`,
      )
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
export async function uploadPublicImage(input: CloudUploadInput): Promise<string> {
  const { bucket, folder, file, stableName, upsert = false } = input
  if (!file?.buffer?.length) {
    throw new Error('Please choose an image to upload.')
  }
  await ensurePublicBucket(bucket)

  const ext = extFromMime(file.mimetype || 'image/jpeg')
  const base =
    (stableName || `${Date.now()}-${randomUUID().slice(0, 8)}`)
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-|-$/g, '') || `img-${Date.now()}`
  const objectPath = `${folder.replace(/\/$/, '')}/${base}.${ext}`

  const { error } = await supabaseAdmin.storage.from(bucket).upload(objectPath, file.buffer, {
    cacheControl: '3600',
    upsert,
    contentType: file.mimetype || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  })
  if (error) {
    throw new Error(error.message || 'Could not upload image to cloud storage.')
  }
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
