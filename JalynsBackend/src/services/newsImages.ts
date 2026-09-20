import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { supabaseAdmin } from '../config/supabase.js'

export const NEWS_IMAGE_BUCKET = 'news-page'
export const NEWS_IMAGE_FOLDER = 'posts'

let bucketReady = false

function publicNewsImageUrl(objectPath: string, cacheKey?: string) {
  const { data } = supabaseAdmin.storage.from(NEWS_IMAGE_BUCKET).getPublicUrl(objectPath)
  const url = data.publicUrl
  if (!cacheKey) return url
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
}

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(NEWS_IMAGE_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(NEWS_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: 12582912,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(
        /bucket|not found/i.test(error.message)
          ? 'News image storage is not set up. Run supabase/NEWS_PAGE.sql in Supabase, then try again.'
          : error.message || 'Could not create news image bucket.',
      )
    }
  }
  bucketReady = true
}

/**
 * Optimize + store news photos in Supabase Storage (public URL) for online hosting.
 */
export async function uploadNewsImage(file: Express.Multer.File): Promise<string> {
  if (!file?.buffer?.length) {
    throw new Error('Please choose an image to upload.')
  }
  await ensureBucket()

  const jpeg = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1400, height: 1100, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer()

  const objectPath = `${NEWS_IMAGE_FOLDER}/${Date.now()}-${randomUUID().slice(0, 8)}.jpg`
  const { error } = await supabaseAdmin.storage.from(NEWS_IMAGE_BUCKET).upload(objectPath, jpeg, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/jpeg',
  })
  if (error) {
    const msg = error.message || ''
    if (/bucket|not found|404/i.test(msg)) {
      throw new Error(
        'News image storage is not set up. Run supabase/NEWS_PAGE.sql in Supabase, then try again.',
      )
    }
    throw new Error(msg || 'Could not upload news image to cloud storage.')
  }
  return publicNewsImageUrl(objectPath, String(Date.now()))
}

/** Upload an already-optimized local buffer (e.g. migration). */
export async function uploadNewsImageBuffer(
  buffer: Buffer,
  preferredName?: string,
): Promise<string> {
  await ensureBucket()
  const safe =
    (preferredName || 'photo')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'photo'
  const objectPath = `${NEWS_IMAGE_FOLDER}/${safe}-${randomUUID().slice(0, 6)}.jpg`
  const jpeg = await sharp(buffer)
    .rotate()
    .resize({ width: 1400, height: 1100, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer()

  const { error } = await supabaseAdmin.storage.from(NEWS_IMAGE_BUCKET).upload(objectPath, jpeg, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/jpeg',
  })
  if (error) throw new Error(error.message || 'Could not upload news image.')
  return publicNewsImageUrl(objectPath, String(Date.now()))
}
