import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

export const MENU_IMAGE_BUCKET = 'restaurant-page'
export const MENU_IMAGE_FOLDER = 'menu'

let bucketReady = false

function extFromMime(mime: string) {
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

function publicMenuImageUrl(objectPath: string, cacheKey?: string) {
  const { data } = supabaseAdmin.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(objectPath)
  const url = data.publicUrl
  if (!cacheKey) return url
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
}

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(MENU_IMAGE_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(MENU_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: 12582912,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(
        /bucket|not found/i.test(error.message)
          ? 'Restaurant image storage is not set up. Run supabase/RESTAURANT_PAGE.sql in Supabase, then try again.'
          : error.message || 'Could not create restaurant image bucket.',
      )
    }
  }
  bucketReady = true
}

/**
 * Store dish photos in Supabase Storage (public URL) so they work online.
 */
export async function uploadMenuDishImage(file: Express.Multer.File): Promise<string> {
  if (!file?.buffer?.length) {
    throw new Error('Please choose an image to upload.')
  }
  await ensureBucket()

  const ext = extFromMime(file.mimetype || 'image/jpeg')
  const objectPath = `${MENU_IMAGE_FOLDER}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
  const { error } = await supabaseAdmin.storage.from(MENU_IMAGE_BUCKET).upload(objectPath, file.buffer, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.mimetype || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  })
  if (error) {
    const msg = error.message || ''
    if (/bucket|not found|404/i.test(msg)) {
      throw new Error(
        'Restaurant image storage is not set up. Run supabase/RESTAURANT_PAGE.sql in Supabase, then try again.',
      )
    }
    throw new Error(msg || 'Could not upload image to cloud storage.')
  }
  return publicMenuImageUrl(objectPath, String(Date.now()))
}
