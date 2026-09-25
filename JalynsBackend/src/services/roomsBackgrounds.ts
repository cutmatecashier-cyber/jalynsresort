import { supabaseAdmin } from '../config/supabase.js'
import { bumpContentRevision } from './contentRevision.js'
import { createFolderBackgroundStore } from './pageBackgrounds.js'

export const ROOMS_BUCKET = 'rooms-page'
export const ROOMS_HERO_FOLDER = 'hero'
export const ROOMS_CONTENT_FOLDER = 'content'

const STABLE_HERO_PREFIX = `${ROOMS_HERO_FOLDER}/current.`
const STABLE_CONTENT_PREFIX = `${ROOMS_CONTENT_FOLDER}/current.`

function roomsBackgroundError(
  error: { message: string; code?: string } | null,
  fallback: string,
) {
  if (!error) return fallback
  if (/bucket not found|not found/i.test(error.message)) {
    return 'Rooms image bucket is missing. Run supabase/ROOMS_PAGE.sql in the Supabase SQL Editor, then refresh.'
  }
  return error.message || fallback
}

const backgrounds = createFolderBackgroundStore({
  bucket: ROOMS_BUCKET,
  formatError: roomsBackgroundError,
})

let bucketReady = false

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(ROOMS_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(ROOMS_BUCKET, {
      public: true,
      fileSizeLimit: 8388608,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(roomsBackgroundError(error, 'Could not create rooms image bucket.'))
    }
  }
  bucketReady = true
}

export async function getRoomsHeroBackground() {
  return backgrounds.resolve(ROOMS_HERO_FOLDER, STABLE_HERO_PREFIX)
}

export async function getRoomsContentBackground() {
  return backgrounds.resolve(ROOMS_CONTENT_FOLDER, STABLE_CONTENT_PREFIX)
}

export async function uploadRoomsHeroBackground(file: Express.Multer.File) {
  await ensureBucket()
  const result = await backgrounds.upload(ROOMS_HERO_FOLDER, file)
  await bumpContentRevision()
  return result
}

export async function uploadRoomsContentBackground(file: Express.Multer.File) {
  await ensureBucket()
  const result = await backgrounds.upload(ROOMS_CONTENT_FOLDER, file)
  await bumpContentRevision()
  return result
}

export async function removeRoomsHeroBackground() {
  await backgrounds.remove(ROOMS_HERO_FOLDER)
  await bumpContentRevision()
}

export async function removeRoomsContentBackground() {
  await backgrounds.remove(ROOMS_CONTENT_FOLDER)
  await bumpContentRevision()
}
