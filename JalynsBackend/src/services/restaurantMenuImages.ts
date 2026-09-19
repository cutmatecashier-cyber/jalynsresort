import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

export const MENU_IMAGE_BUCKET = 'restaurant-page'
export const MENU_IMAGE_FOLDER = 'menu'

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/menu')
mkdirSync(uploadsRoot, { recursive: true })

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

async function saveLocalMenuImage(file: Express.Multer.File): Promise<string> {
  if (!file?.buffer?.length) {
    throw new Error('Please choose an image to upload.')
  }
  const ext = extFromMime(file.mimetype || 'image/jpeg')
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
  await writeFile(path.join(uploadsRoot, filename), file.buffer)
  return `/uploads/menu/${filename}`
}

async function saveSupabaseMenuImage(file: Express.Multer.File): Promise<string> {
  if (!file?.buffer?.length) {
    throw new Error('Please choose an image to upload.')
  }
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

/**
 * Prefer Supabase (works on every device). Always keep a local copy as fallback
 * so LAN uploads still succeed if Storage is unavailable.
 */
export async function uploadMenuDishImage(file: Express.Multer.File): Promise<string> {
  const localUrl = await saveLocalMenuImage(file)
  try {
    return await saveSupabaseMenuImage(file)
  } catch (err) {
    console.warn(
      '[menu upload] Supabase failed, using local file:',
      err instanceof Error ? err.message : err,
    )
    return localUrl
  }
}
