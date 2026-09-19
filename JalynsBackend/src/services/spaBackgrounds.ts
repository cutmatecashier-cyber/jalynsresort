import { supabaseAdmin } from '../config/supabase.js'
import { createFolderBackgroundStore } from './pageBackgrounds.js'

export const SPA_BUCKET = 'spa-page'
export const SPA_HERO_FOLDER = 'hero'
export const SPA_CONTENT_FOLDER = 'content'
export const SPA_GALLERY_FOLDER = 'gallery'

const STABLE_HERO_PREFIX = `${SPA_HERO_FOLDER}/current.`
const STABLE_CONTENT_PREFIX = `${SPA_CONTENT_FOLDER}/current.`

export type SpaGalleryImage = { path: string; url: string; alt: string }

function spaBackgroundError(
  error: { message: string; code?: string } | null,
  fallback: string,
) {
  if (!error) return fallback
  if (/bucket not found|not found/i.test(error.message)) {
    return 'Spa image bucket is missing. Run supabase/SPA_PAGE.sql in the Supabase SQL Editor, then refresh.'
  }
  return error.message || fallback
}

function isImageFile(name: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(name) && !name.startsWith('.')
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').toLowerCase()
}

function publicImageUrl(path: string, cacheKey?: string) {
  const { data } = supabaseAdmin.storage.from(SPA_BUCKET).getPublicUrl(path)
  const url = data.publicUrl
  if (!cacheKey) return url
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
}

function extFromMime(mime: string) {
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

const backgrounds = createFolderBackgroundStore({
  bucket: SPA_BUCKET,
  formatError: spaBackgroundError,
})

let bucketReady = false

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(SPA_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(SPA_BUCKET, {
      public: true,
      fileSizeLimit: 8388608,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(spaBackgroundError(error, 'Could not create spa image bucket.'))
    }
  }
  bucketReady = true
}

export async function getSpaHeroBackground() {
  return backgrounds.resolve(SPA_HERO_FOLDER, STABLE_HERO_PREFIX)
}

export async function getSpaContentBackground() {
  return backgrounds.resolve(SPA_CONTENT_FOLDER, STABLE_CONTENT_PREFIX)
}

export async function uploadSpaHeroBackground(file: Express.Multer.File) {
  await ensureBucket()
  return backgrounds.upload(SPA_HERO_FOLDER, file)
}

export async function uploadSpaContentBackground(file: Express.Multer.File) {
  await ensureBucket()
  return backgrounds.upload(SPA_CONTENT_FOLDER, file)
}

export async function removeSpaHeroBackground() {
  await backgrounds.remove(SPA_HERO_FOLDER)
}

export async function removeSpaContentBackground() {
  await backgrounds.remove(SPA_CONTENT_FOLDER)
}

export async function listSpaGallery(): Promise<SpaGalleryImage[]> {
  const { data, error } = await supabaseAdmin.storage.from(SPA_BUCKET).list(SPA_GALLERY_FOLDER, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'asc' },
  })
  if (error || !data) return []
  return data
    .filter((item) => item.name && isImageFile(item.name))
    .map((file) => {
      const path = `${SPA_GALLERY_FOLDER}/${file.name}`
      return {
        path,
        url: publicImageUrl(path, file.updated_at ?? file.created_at ?? file.name),
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      }
    })
}

export async function uploadSpaGalleryImages(
  files: Express.Multer.File[],
): Promise<SpaGalleryImage[]> {
  if (!files.length) throw new Error('Please choose at least one image to upload.')
  await ensureBucket()
  const uploaded: SpaGalleryImage[] = []
  for (const file of files) {
    const base =
      sanitizeFileName((file.originalname || 'gallery').replace(/\.[^.]+$/, '')) || 'gallery'
    const ext = extFromMime(file.mimetype || 'image/jpeg')
    const path = `${SPA_GALLERY_FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base}.${ext}`
    const { error } = await supabaseAdmin.storage.from(SPA_BUCKET).upload(path, file.buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.mimetype || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    })
    if (error) throw new Error(spaBackgroundError(error, 'Could not upload gallery image.'))
    uploaded.push({
      path,
      url: publicImageUrl(path, String(Date.now())),
      alt: base.replace(/-/g, ' '),
    })
  }
  return uploaded
}

export async function replaceSpaGalleryImage(path: string, file: Express.Multer.File) {
  const safePath = String(path || '').trim()
  if (!safePath.startsWith(`${SPA_GALLERY_FOLDER}/`)) {
    throw new Error('Invalid gallery image path.')
  }
  await ensureBucket()
  const { error } = await supabaseAdmin.storage.from(SPA_BUCKET).update(safePath, file.buffer, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.mimetype || 'image/jpeg',
  })
  if (error) throw new Error(spaBackgroundError(error, 'Could not replace image.'))
  return {
    path: safePath,
    url: publicImageUrl(safePath, String(Date.now())),
    alt:
      safePath.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Gallery image',
  } satisfies SpaGalleryImage
}

export async function deleteSpaGalleryImage(path: string) {
  const safePath = String(path || '').trim()
  if (!safePath.startsWith(`${SPA_GALLERY_FOLDER}/`)) {
    throw new Error('Invalid gallery image path.')
  }
  const { error } = await supabaseAdmin.storage.from(SPA_BUCKET).remove([safePath])
  if (error) throw new Error(spaBackgroundError(error, 'Could not delete image.'))
}
