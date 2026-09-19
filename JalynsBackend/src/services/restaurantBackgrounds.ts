import { supabaseAdmin } from '../config/supabase.js'
import { createFolderBackgroundStore } from './pageBackgrounds.js'

export const RESTAURANT_BUCKET = 'restaurant-page'
export const RESTAURANT_HERO_FOLDER = 'hero'
export const RESTAURANT_CONTENT_FOLDER = 'content'

const STABLE_HERO_PREFIX = `${RESTAURANT_HERO_FOLDER}/current.`
const STABLE_CONTENT_PREFIX = `${RESTAURANT_CONTENT_FOLDER}/current.`

function restaurantBackgroundError(
  error: { message: string; code?: string } | null,
  fallback: string,
) {
  if (!error) return fallback
  if (/bucket not found|not found/i.test(error.message)) {
    return 'Restaurant image bucket is missing. Run supabase/RESTAURANT_PAGE.sql in the Supabase SQL Editor, then refresh.'
  }
  return error.message || fallback
}

const backgrounds = createFolderBackgroundStore({
  bucket: RESTAURANT_BUCKET,
  formatError: restaurantBackgroundError,
})

let bucketReady = false

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(RESTAURANT_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(RESTAURANT_BUCKET, {
      public: true,
      fileSizeLimit: 8388608,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(
        restaurantBackgroundError(error, 'Could not create restaurant image bucket.'),
      )
    }
  }
  bucketReady = true
}

export async function getRestaurantHeroBackground() {
  return backgrounds.resolve(RESTAURANT_HERO_FOLDER, STABLE_HERO_PREFIX)
}

export async function getRestaurantContentBackground() {
  return backgrounds.resolve(RESTAURANT_CONTENT_FOLDER, STABLE_CONTENT_PREFIX)
}

export async function uploadRestaurantHeroBackground(file: Express.Multer.File) {
  await ensureBucket()
  return backgrounds.upload(RESTAURANT_HERO_FOLDER, file)
}

export async function uploadRestaurantContentBackground(file: Express.Multer.File) {
  await ensureBucket()
  return backgrounds.upload(RESTAURANT_CONTENT_FOLDER, file)
}

export async function removeRestaurantHeroBackground() {
  await backgrounds.remove(RESTAURANT_HERO_FOLDER)
}

export async function removeRestaurantContentBackground() {
  await backgrounds.remove(RESTAURANT_CONTENT_FOLDER)
}
