import { supabaseAdmin } from '../config/supabase.js'
import { createFolderBackgroundStore } from './pageBackgrounds.js'

export const CONTACT_BUCKET = 'contact-page'
export const CONTACT_HERO_FOLDER = 'hero'
export const CONTACT_CONTENT_FOLDER = 'content'

const STABLE_HERO_PREFIX = `${CONTACT_HERO_FOLDER}/current.`
const STABLE_CONTENT_PREFIX = `${CONTACT_CONTENT_FOLDER}/current.`

function contactBackgroundError(
  error: { message: string; code?: string } | null,
  fallback: string,
) {
  if (!error) return fallback
  if (/bucket not found|not found/i.test(error.message)) {
    return 'Contact image bucket is missing. Run supabase/CONTACT_PAGE.sql in the Supabase SQL Editor, then refresh.'
  }
  return error.message || fallback
}

const backgrounds = createFolderBackgroundStore({
  bucket: CONTACT_BUCKET,
  formatError: contactBackgroundError,
})

let bucketReady = false

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(CONTACT_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(CONTACT_BUCKET, {
      public: true,
      fileSizeLimit: 8388608,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(contactBackgroundError(error, 'Could not create contact image bucket.'))
    }
  }
  bucketReady = true
}

export async function getContactHeroBackground() {
  return backgrounds.resolve(CONTACT_HERO_FOLDER, STABLE_HERO_PREFIX)
}

export async function getContactContentBackground() {
  return backgrounds.resolve(CONTACT_CONTENT_FOLDER, STABLE_CONTENT_PREFIX)
}

export async function uploadContactHeroBackground(file: Express.Multer.File) {
  await ensureBucket()
  return backgrounds.upload(CONTACT_HERO_FOLDER, file)
}

export async function uploadContactContentBackground(file: Express.Multer.File) {
  await ensureBucket()
  return backgrounds.upload(CONTACT_CONTENT_FOLDER, file)
}

export async function removeContactHeroBackground() {
  await backgrounds.remove(CONTACT_HERO_FOLDER)
}

export async function removeContactContentBackground() {
  await backgrounds.remove(CONTACT_CONTENT_FOLDER)
}
