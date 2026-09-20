import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

export type SiteReview = {
  id: string
  user_id: string | null
  guest_name: string
  rating: number
  comment: string
  created_at: string
}

const REVIEW_SELECT = 'id, user_id, guest_name, rating, comment, created_at'
const LEGACY_SELECT = 'id, guest_name, rating, comment, created_at'

const CLOUD_BUCKET = 'site-data'
const CLOUD_OBJECT = 'reviews.json'

let bucketReady = false

function isMissingTableError(message: string) {
  return /Could not find the table|relation .* does not exist|PGRST205|schema cache/i.test(
    message,
  )
}

function isMissingColumnError(message: string) {
  return /column .* does not exist|Could not find the .* column/i.test(message)
}

function mapReview(row: Record<string, unknown>): SiteReview {
  return {
    id: String(row.id),
    user_id: row.user_id != null ? String(row.user_id) : null,
    guest_name: String(row.guest_name),
    rating: Number(row.rating),
    comment: String(row.comment),
    created_at: String(row.created_at),
  }
}

async function ensureCloudBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(CLOUD_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(CLOUD_BUCKET, {
      public: false,
      fileSizeLimit: 1_048_576,
      allowedMimeTypes: ['application/json'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(error.message || 'Could not create site-data storage bucket.')
    }
  }
  bucketReady = true
}

async function readCloud(): Promise<SiteReview[] | null> {
  try {
    await ensureCloudBucket()
    const { data, error } = await supabaseAdmin.storage.from(CLOUD_BUCKET).download(CLOUD_OBJECT)
    if (error || !data) {
      if (/not found|404|Object not found/i.test(error?.message || '')) return []
      return null
    }
    const text = await data.text()
    const parsed = JSON.parse(text) as SiteReview[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((row) =>
      mapReview({
        ...row,
        user_id: row.user_id ?? null,
      }),
    )
  } catch {
    return null
  }
}

async function writeCloud(reviews: SiteReview[]) {
  await ensureCloudBucket()
  const body = Buffer.from(JSON.stringify(reviews, null, 2), 'utf8')
  const { error } = await supabaseAdmin.storage.from(CLOUD_BUCKET).upload(CLOUD_OBJECT, body, {
    contentType: 'application/json',
    upsert: true,
  })
  if (error) throw new Error(error.message || 'Could not save reviews to cloud storage.')
}

/** Prefer shared cloud list when the DB table is unavailable. */
async function readFallback(): Promise<SiteReview[]> {
  const cloud = await readCloud()
  if (cloud !== null) return cloud
  return []
}

async function writeFallback(reviews: SiteReview[]) {
  await writeCloud(reviews)
}

export async function listSiteReviews(): Promise<SiteReview[]> {
  try {
    const primary = await supabaseAdmin
      .from('site_reviews')
      .select(REVIEW_SELECT)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(50)

    let rows: Record<string, unknown>[] | null = null
    let error = primary.error

    if (error && isMissingColumnError(error.message || '')) {
      const legacy = await supabaseAdmin
        .from('site_reviews')
        .select(LEGACY_SELECT)
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(50)
      rows = (legacy.data ?? null) as Record<string, unknown>[] | null
      error = legacy.error
    } else {
      rows = (primary.data ?? null) as Record<string, unknown>[] | null
    }

    if (error) {
      const msg = error.message || ''
      if (isMissingTableError(msg)) return readFallback()
      throw new Error(msg)
    }

    return (rows ?? []).map((row) => mapReview(row))
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message)) return readFallback()
    const cloud = await readFallback()
    if (cloud.length) return cloud
    throw err
  }
}

export async function createSiteReview(input: {
  guest_name: string
  rating: number
  comment: string
  user_id?: string | null
}): Promise<SiteReview> {
  const guest_name = input.guest_name.trim()
  const comment = input.comment.trim()
  const rating = Math.round(input.rating)
  const user_id = input.user_id?.trim() || null

  if (!guest_name || guest_name.length < 2) {
    throw new Error('Please enter your name (at least 2 characters).')
  }
  if (!comment || comment.length < 10) {
    throw new Error('Please write a review with at least 10 characters.')
  }
  if (rating < 1 || rating > 5) {
    throw new Error('Please choose a star rating from 1 to 5.')
  }

  const now = new Date().toISOString()
  const makeLocal = (): SiteReview => ({
    id: randomUUID(),
    user_id,
    guest_name,
    rating,
    comment,
    created_at: now,
  })

  try {
    const insertPayload: Record<string, unknown> = {
      guest_name,
      rating,
      comment,
      approved: true,
    }
    if (user_id) insertPayload.user_id = user_id

    let inserted: Record<string, unknown> | null = null
    const primary = await supabaseAdmin
      .from('site_reviews')
      .insert(insertPayload)
      .select(REVIEW_SELECT)
      .single()

    let error = primary.error

    if (error && isMissingColumnError(error.message || '')) {
      const legacy = await supabaseAdmin
        .from('site_reviews')
        .insert({ guest_name, rating, comment, approved: true })
        .select(LEGACY_SELECT)
        .single()
      inserted = (legacy.data ?? null) as Record<string, unknown> | null
      error = legacy.error
    } else {
      inserted = (primary.data ?? null) as Record<string, unknown> | null
    }

    if (error) {
      const msg = error.message || ''
      if (isMissingTableError(msg)) {
        const review = makeLocal()
        const existing = await readFallback()
        await writeFallback([review, ...existing])
        return review
      }
      throw new Error(msg)
    }

    return mapReview(inserted ?? {})
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (
      isMissingTableError(message) ||
      /fetch failed|ECONNREFUSED|network/i.test(message)
    ) {
      const review = makeLocal()
      const existing = await readFallback()
      await writeFallback([review, ...existing])
      return review
    }
    throw err
  }
}
