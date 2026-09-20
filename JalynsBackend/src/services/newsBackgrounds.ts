import { supabaseAdmin } from '../config/supabase.js'
import { createFolderBackgroundStore } from './pageBackgrounds.js'

export const NEWS_BUCKET = 'news-page'
export const NEWS_HERO_FOLDER = 'hero'

const STABLE_HERO_PREFIX = `${NEWS_HERO_FOLDER}/current.`

function newsBackgroundError(
  error: { message: string; code?: string } | null,
  fallback: string,
) {
  if (!error) return fallback
  if (/bucket not found|not found/i.test(error.message)) {
    return 'News image bucket is missing. Run supabase/NEWS_PAGE.sql in the Supabase SQL Editor, then refresh.'
  }
  return error.message || fallback
}

const backgrounds = createFolderBackgroundStore({
  bucket: NEWS_BUCKET,
  formatError: newsBackgroundError,
})

let bucketReady = false

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(NEWS_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(NEWS_BUCKET, {
      public: true,
      fileSizeLimit: 12582912,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(newsBackgroundError(error, 'Could not create news image bucket.'))
    }
  }
  bucketReady = true
}

export async function getNewsHeroBackground() {
  return backgrounds.resolve(NEWS_HERO_FOLDER, STABLE_HERO_PREFIX)
}

export async function uploadNewsHeroBackground(file: Express.Multer.File) {
  await ensureBucket()
  return backgrounds.upload(NEWS_HERO_FOLDER, file)
}

export async function removeNewsHeroBackground() {
  await backgrounds.remove(NEWS_HERO_FOLDER)
}
