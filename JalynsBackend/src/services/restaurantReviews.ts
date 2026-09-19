import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

export type RestaurantReview = {
  id: string
  user_id: string | null
  guest_name: string
  rating: number
  comment: string
  admin_reply: string | null
  admin_reply_by: string | null
  admin_reply_name: string | null
  admin_reply_at: string | null
  created_at: string
  updated_at: string | null
}

const REVIEW_SELECT =
  'id, user_id, guest_name, rating, comment, admin_reply, admin_reply_by, admin_reply_name, admin_reply_at, created_at, updated_at'

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const fallbackFile = path.join(dataDir, 'restaurant-reviews.json')

function isMissingTableError(message: string) {
  return /Could not find the table|relation .* does not exist|PGRST205/i.test(message)
}

function isMissingColumnError(message: string) {
  return /column .* does not exist|Could not find the .* column/i.test(message)
}

function mapReview(row: Record<string, unknown>): RestaurantReview {
  return {
    id: String(row.id),
    user_id: row.user_id != null ? String(row.user_id) : null,
    guest_name: String(row.guest_name),
    rating: Number(row.rating),
    comment: String(row.comment),
    admin_reply: row.admin_reply != null ? String(row.admin_reply) : null,
    admin_reply_by: row.admin_reply_by != null ? String(row.admin_reply_by) : null,
    admin_reply_name: row.admin_reply_name != null ? String(row.admin_reply_name) : null,
    admin_reply_at: row.admin_reply_at != null ? String(row.admin_reply_at) : null,
    created_at: String(row.created_at),
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
  }
}

async function readFallback(): Promise<RestaurantReview[]> {
  try {
    const raw = await readFile(fallbackFile, 'utf8')
    const parsed = JSON.parse(raw) as RestaurantReview[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((row) =>
      mapReview({
        ...row,
        user_id: row.user_id ?? null,
        admin_reply: row.admin_reply ?? null,
        admin_reply_by: row.admin_reply_by ?? null,
        admin_reply_name: row.admin_reply_name ?? null,
        admin_reply_at: row.admin_reply_at ?? null,
        updated_at: row.updated_at ?? null,
      }),
    )
  } catch {
    return []
  }
}

async function writeFallback(reviews: RestaurantReview[]) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(fallbackFile, JSON.stringify(reviews, null, 2), 'utf8')
}

const LEGACY_SELECT = 'id, guest_name, rating, comment, created_at'

export async function listRestaurantReviews(): Promise<RestaurantReview[]> {
  try {
    const primary = await supabaseAdmin
      .from('restaurant_reviews')
      .select(REVIEW_SELECT)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(50)

    let rows: Record<string, unknown>[] | null = null
    let error = primary.error

    if (error && isMissingColumnError(error.message || '')) {
      const legacy = await supabaseAdmin
        .from('restaurant_reviews')
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
    const local = await readFallback()
    if (local.length) return local
    throw err
  }
}

export async function createRestaurantReview(input: {
  guest_name: string
  rating: number
  comment: string
  user_id?: string | null
}): Promise<RestaurantReview> {
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

  const makeLocal = (): RestaurantReview => ({
    id: randomUUID(),
    user_id,
    guest_name,
    rating,
    comment,
    admin_reply: null,
    admin_reply_by: null,
    admin_reply_name: null,
    admin_reply_at: null,
    created_at: now,
    updated_at: now,
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
      .from('restaurant_reviews')
      .insert(insertPayload)
      .select(REVIEW_SELECT)
      .single()

    let error = primary.error

    if (error && isMissingColumnError(error.message || '')) {
      const legacy = await supabaseAdmin
        .from('restaurant_reviews')
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

export async function setRestaurantReviewReply(input: {
  reviewId: string
  reply: string
  adminUserId: string
  adminName: string
}): Promise<RestaurantReview> {
  const reply = input.reply.trim()
  if (!reply || reply.length < 2) {
    throw new Error('Please write a reply with at least 2 characters.')
  }

  const now = new Date().toISOString()
  const adminName = input.adminName.trim() || 'Admin'

  try {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('restaurant_reviews')
      .select(REVIEW_SELECT)
      .eq('id', input.reviewId)
      .maybeSingle()

    if (fetchError) {
      if (isMissingColumnError(fetchError.message || '')) {
        throw new Error(
          'Restaurant review reply columns are missing. Run supabase/RESTAURANT_REVIEWS.sql in the Supabase SQL Editor.',
        )
      }
      if (isMissingTableError(fetchError.message || '')) {
        return setFallbackReply(input.reviewId, reply, input.adminUserId, adminName, now)
      }
      throw new Error(fetchError.message)
    }

    if (!existing) {
      throw new Error('Review not found.')
    }

    if (existing.admin_reply) {
      throw new Error(
        'This review already has an admin reply. Delete the existing reply before posting a new one.',
      )
    }

    const { data, error } = await supabaseAdmin
      .from('restaurant_reviews')
      .update({
        admin_reply: reply,
        admin_reply_by: input.adminUserId,
        admin_reply_name: adminName,
        admin_reply_at: now,
        updated_at: now,
      })
      .eq('id', input.reviewId)
      .is('admin_reply', null)
      .select(REVIEW_SELECT)
      .maybeSingle()

    if (error) {
      if (isMissingColumnError(error.message || '')) {
        throw new Error(
          'Restaurant review reply columns are missing. Run supabase/RESTAURANT_REVIEWS.sql in the Supabase SQL Editor.',
        )
      }
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error(
        'This review already has an admin reply. Delete the existing reply before posting a new one.',
      )
    }

    return mapReview(data as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message)) {
      return setFallbackReply(input.reviewId, reply, input.adminUserId, adminName, now)
    }
    throw err
  }
}

async function setFallbackReply(
  reviewId: string,
  reply: string,
  adminUserId: string,
  adminName: string,
  now: string,
): Promise<RestaurantReview> {
  const existing = await readFallback()
  const index = existing.findIndex((r) => r.id === reviewId)
  if (index < 0) throw new Error('Review not found.')
  if (existing[index].admin_reply) {
    throw new Error(
      'This review already has an admin reply. Delete the existing reply before posting a new one.',
    )
  }
  const updated: RestaurantReview = {
    ...existing[index],
    admin_reply: reply,
    admin_reply_by: adminUserId,
    admin_reply_name: adminName,
    admin_reply_at: now,
    updated_at: now,
  }
  existing[index] = updated
  await writeFallback(existing)
  return updated
}

/** Clears only the admin reply fields — never deletes the customer review. */
export async function clearRestaurantReviewReply(reviewId: string): Promise<RestaurantReview> {
  const now = new Date().toISOString()

  try {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('restaurant_reviews')
      .select(REVIEW_SELECT)
      .eq('id', reviewId)
      .maybeSingle()

    if (fetchError) {
      if (isMissingColumnError(fetchError.message || '')) {
        throw new Error(
          'Restaurant review reply columns are missing. Run supabase/RESTAURANT_REVIEWS.sql in the Supabase SQL Editor.',
        )
      }
      if (isMissingTableError(fetchError.message || '')) {
        return clearFallbackReply(reviewId, now)
      }
      throw new Error(fetchError.message)
    }

    if (!existing) {
      throw new Error('Review not found.')
    }

    if (!existing.admin_reply) {
      throw new Error('This review does not have an admin reply to delete.')
    }

    const { data, error } = await supabaseAdmin
      .from('restaurant_reviews')
      .update({
        admin_reply: null,
        admin_reply_by: null,
        admin_reply_name: null,
        admin_reply_at: null,
        updated_at: now,
      })
      .eq('id', reviewId)
      .select(REVIEW_SELECT)
      .single()

    if (error) {
      if (isMissingColumnError(error.message || '')) {
        throw new Error(
          'Restaurant review reply columns are missing. Run supabase/RESTAURANT_REVIEWS.sql in the Supabase SQL Editor.',
        )
      }
      throw new Error(error.message)
    }

    return mapReview(data as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message)) {
      return clearFallbackReply(reviewId, now)
    }
    throw err
  }
}

async function clearFallbackReply(reviewId: string, now: string): Promise<RestaurantReview> {
  const existing = await readFallback()
  const index = existing.findIndex((r) => r.id === reviewId)
  if (index < 0) throw new Error('Review not found.')
  if (!existing[index].admin_reply) {
    throw new Error('This review does not have an admin reply to delete.')
  }
  const updated: RestaurantReview = {
    ...existing[index],
    admin_reply: null,
    admin_reply_by: null,
    admin_reply_name: null,
    admin_reply_at: null,
    updated_at: now,
  }
  existing[index] = updated
  await writeFallback(existing)
  return updated
}
