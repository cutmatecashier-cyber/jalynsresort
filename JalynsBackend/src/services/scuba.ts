import { supabaseAdmin } from '../config/supabase.js'
import { createFolderBackgroundStore } from './pageBackgrounds.js'

export const SCUBA_BUCKET = 'scuba-diving'
export const SCUBA_HERO_FOLDER = 'hero'
export const SCUBA_CONTENT_FOLDER = 'content'
export const SCUBA_GALLERY_FOLDER = 'gallery'
export const SETTINGS_PATH = 'settings/config.json'
export const DEFAULT_PRICES_VALID_UNTIL = 'Dec 2024'

const STABLE_HERO_PREFIX = `${SCUBA_HERO_FOLDER}/current.`
const STABLE_CONTENT_PREFIX = `${SCUBA_CONTENT_FOLDER}/current.`

export type DivingRate = { id: number; service: string; price: string }
export type PadiCourse = { id: number; course: string; details: string; price: string }
export type ScubaImage = { path: string; url: string; alt: string }
export type ScubaBackground = { url: string | null; path: string | null }
export type ScubaPageSettings = { pricesValidUntil: string }

function isMissingTable(message: string, code?: string) {
  return (
    code === 'PGRST205' ||
    /could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message) ||
    /schema cache/i.test(message)
  )
}

export function scubaErrorMessage(
  error: { message: string; code?: string } | null,
  fallback: string,
) {
  if (!error) return fallback
  if (isMissingTable(error.message, error.code)) {
    return 'Scuba tables are missing. Run supabase/SCUBA_DIVING.sql in the Supabase SQL Editor, then refresh.'
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
  const { data } = supabaseAdmin.storage.from(SCUBA_BUCKET).getPublicUrl(path)
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

const scubaBackgrounds = createFolderBackgroundStore({
  bucket: SCUBA_BUCKET,
  formatError: scubaErrorMessage,
})

export async function listDivingRates() {
  const { data, error } = await supabaseAdmin
    .from('diving_rates')
    .select('id, service, price')
    .order('id')
  if (error) throw new Error(scubaErrorMessage(error, 'Could not load diving rates.'))
  return (data as DivingRate[] | null) ?? []
}

export async function createDivingRate(input: { service?: string; price?: string }) {
  const service = String(input.service ?? '').trim()
  const price = String(input.price ?? '').trim()
  if (!service) throw new Error('Service name is required.')
  if (!price) throw new Error('Price is required.')
  const { data, error } = await supabaseAdmin
    .from('diving_rates')
    .insert({ service, price })
    .select('id, service, price')
    .single()
  if (error) throw new Error(scubaErrorMessage(error, 'Could not add service.'))
  return data as DivingRate
}

export async function updateDivingRate(
  id: number,
  input: { service?: string; price?: string },
) {
  const service = String(input.service ?? '').trim()
  const price = String(input.price ?? '').trim()
  if (!Number.isFinite(id)) throw new Error('Valid rate id is required.')
  if (!service) throw new Error('Service name is required.')
  if (!price) throw new Error('Price is required.')
  const { data, error } = await supabaseAdmin
    .from('diving_rates')
    .update({ service, price })
    .eq('id', id)
    .select('id, service, price')
    .single()
  if (error) throw new Error(scubaErrorMessage(error, 'Could not update service.'))
  return data as DivingRate
}

export async function deleteDivingRate(id: number) {
  if (!Number.isFinite(id)) throw new Error('Valid rate id is required.')
  const { error } = await supabaseAdmin.from('diving_rates').delete().eq('id', id)
  if (error) throw new Error(scubaErrorMessage(error, 'Could not delete service.'))
}

export async function listPadiCourses() {
  const { data, error } = await supabaseAdmin
    .from('padi_scuba_courses')
    .select('id, course, details, price')
    .order('id')
  if (error) throw new Error(scubaErrorMessage(error, 'Could not load PADI courses.'))
  return (data as PadiCourse[] | null) ?? []
}

export async function createPadiCourse(input: {
  course?: string
  details?: string
  price?: string
}) {
  const course = String(input.course ?? '').trim()
  const details = String(input.details ?? '').trim()
  const price = String(input.price ?? '').trim()
  if (!course) throw new Error('Course name is required.')
  if (!price) throw new Error('Price is required.')
  const { data, error } = await supabaseAdmin
    .from('padi_scuba_courses')
    .insert({ course, details, price })
    .select('id, course, details, price')
    .single()
  if (error) throw new Error(scubaErrorMessage(error, 'Could not add course.'))
  return data as PadiCourse
}

export async function updatePadiCourse(
  id: number,
  input: { course?: string; details?: string; price?: string },
) {
  const course = String(input.course ?? '').trim()
  const details = String(input.details ?? '').trim()
  const price = String(input.price ?? '').trim()
  if (!Number.isFinite(id)) throw new Error('Valid course id is required.')
  if (!course) throw new Error('Course name is required.')
  if (!price) throw new Error('Price is required.')
  const { data, error } = await supabaseAdmin
    .from('padi_scuba_courses')
    .update({ course, details, price })
    .eq('id', id)
    .select('id, course, details, price')
    .single()
  if (error) throw new Error(scubaErrorMessage(error, 'Could not update course.'))
  return data as PadiCourse
}

export async function deletePadiCourse(id: number) {
  if (!Number.isFinite(id)) throw new Error('Valid course id is required.')
  const { error } = await supabaseAdmin.from('padi_scuba_courses').delete().eq('id', id)
  if (error) throw new Error(scubaErrorMessage(error, 'Could not delete course.'))
}

export async function getHeroBackground() {
  return scubaBackgrounds.resolve(SCUBA_HERO_FOLDER, STABLE_HERO_PREFIX)
}

export async function getContentBackground() {
  return scubaBackgrounds.resolve(SCUBA_CONTENT_FOLDER, STABLE_CONTENT_PREFIX)
}

export async function uploadHeroBackground(file: Express.Multer.File) {
  return scubaBackgrounds.upload(SCUBA_HERO_FOLDER, file)
}

export async function uploadContentBackground(file: Express.Multer.File) {
  return scubaBackgrounds.upload(SCUBA_CONTENT_FOLDER, file)
}

export async function removeHeroBackground() {
  await scubaBackgrounds.remove(SCUBA_HERO_FOLDER)
}

export async function removeContentBackground() {
  await scubaBackgrounds.remove(SCUBA_CONTENT_FOLDER)
}

export async function listGallery(): Promise<ScubaImage[]> {
  const { data, error } = await supabaseAdmin.storage.from(SCUBA_BUCKET).list(SCUBA_GALLERY_FOLDER, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'asc' },
  })
  if (error || !data) return []
  return data
    .filter((item) => item.name && isImageFile(item.name))
    .map((file) => {
      const path = `${SCUBA_GALLERY_FOLDER}/${file.name}`
      return {
        path,
        url: publicImageUrl(path, file.updated_at ?? file.created_at ?? file.name),
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      }
    })
}

export async function uploadGalleryImages(files: Express.Multer.File[]): Promise<ScubaImage[]> {
  if (!files.length) throw new Error('Please choose at least one image to upload.')
  const uploaded: ScubaImage[] = []
  for (const file of files) {
    const base =
      sanitizeFileName((file.originalname || 'gallery').replace(/\.[^.]+$/, '')) || 'gallery'
    const ext = extFromMime(file.mimetype || 'image/webp')
    const path = `${SCUBA_GALLERY_FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base}.${ext}`
    const { error } = await supabaseAdmin.storage.from(SCUBA_BUCKET).upload(path, file.buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.mimetype || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    })
    if (error) throw new Error(scubaErrorMessage(error, 'Could not upload gallery image.'))
    uploaded.push({
      path,
      url: publicImageUrl(path, String(Date.now())),
      alt: base.replace(/-/g, ' '),
    })
  }
  return uploaded
}

export async function replaceGalleryImage(path: string, file: Express.Multer.File) {
  const safePath = String(path || '').trim()
  if (!safePath.startsWith(`${SCUBA_GALLERY_FOLDER}/`)) {
    throw new Error('Invalid gallery image path.')
  }
  const { error } = await supabaseAdmin.storage.from(SCUBA_BUCKET).update(safePath, file.buffer, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.mimetype || 'image/webp',
  })
  if (error) throw new Error(scubaErrorMessage(error, 'Could not replace image.'))
  return {
    path: safePath,
    url: publicImageUrl(safePath, String(Date.now())),
    alt: safePath.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Gallery image',
  } satisfies ScubaImage
}

export async function deleteGalleryImage(path: string) {
  const safePath = String(path || '').trim()
  if (!safePath.startsWith(`${SCUBA_GALLERY_FOLDER}/`)) {
    throw new Error('Invalid gallery image path.')
  }
  const { error } = await supabaseAdmin.storage.from(SCUBA_BUCKET).remove([safePath])
  if (error) throw new Error(scubaErrorMessage(error, 'Could not delete image.'))
}

export async function getPageSettings(): Promise<ScubaPageSettings> {
  const { data, error } = await supabaseAdmin.storage.from(SCUBA_BUCKET).download(SETTINGS_PATH)
  if (error || !data) return { pricesValidUntil: DEFAULT_PRICES_VALID_UNTIL }
  try {
    const text = await data.text()
    const json = JSON.parse(text) as Partial<ScubaPageSettings>
    const pricesValidUntil = String(json.pricesValidUntil ?? '').trim()
    return { pricesValidUntil: pricesValidUntil || DEFAULT_PRICES_VALID_UNTIL }
  } catch {
    return { pricesValidUntil: DEFAULT_PRICES_VALID_UNTIL }
  }
}

export async function savePageSettings(input: { pricesValidUntil?: string }) {
  const payload: ScubaPageSettings = {
    pricesValidUntil: String(input.pricesValidUntil ?? '').trim() || DEFAULT_PRICES_VALID_UNTIL,
  }
  const blob = Buffer.from(JSON.stringify(payload), 'utf8')
  const { error } = await supabaseAdmin.storage.from(SCUBA_BUCKET).upload(SETTINGS_PATH, blob, {
    cacheControl: '60',
    upsert: true,
    contentType: 'application/json',
  })
  if (error) throw new Error(scubaErrorMessage(error, 'Could not save price validity date.'))
  return payload
}

export async function getScubaPage() {
  const [rates, courses, hero, content, gallery, settings] = await Promise.all([
    listDivingRates().catch((err: unknown) => {
      throw err
    }),
    listPadiCourses(),
    getHeroBackground(),
    getContentBackground(),
    listGallery(),
    getPageSettings(),
  ])
  return { rates, courses, hero, content, gallery, settings }
}
