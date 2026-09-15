import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

export type RestaurantReview = {
  id: string
  guest_name: string
  rating: number
  comment: string
  created_at: string
}

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const fallbackFile = path.join(dataDir, 'restaurant-reviews.json')

function isMissingTableError(message: string) {
  return /Could not find the table|relation .* does not exist|PGRST205/i.test(message)
}

async function readFallback(): Promise<RestaurantReview[]> {
  try {
    const raw = await readFile(fallbackFile, 'utf8')
    const parsed = JSON.parse(raw) as RestaurantReview[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeFallback(reviews: RestaurantReview[]) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(fallbackFile, JSON.stringify(reviews, null, 2), 'utf8')
}

export async function listRestaurantReviews(): Promise<RestaurantReview[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('restaurant_reviews')
      .select('id, guest_name, rating, comment, created_at')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      const msg = error.message || ''
      if (isMissingTableError(msg)) return readFallback()
      throw new Error(msg)
    }

    return (data ?? []).map((row) => ({
      id: String(row.id),
      guest_name: String(row.guest_name),
      rating: Number(row.rating),
      comment: String(row.comment),
      created_at: String(row.created_at),
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message)) return readFallback()
    // service role / network issues — still try local file
    const local = await readFallback()
    if (local.length) return local
    throw err
  }
}

export async function createRestaurantReview(input: {
  guest_name: string
  rating: number
  comment: string
}): Promise<RestaurantReview> {
  const guest_name = input.guest_name.trim()
  const comment = input.comment.trim()
  const rating = Math.round(input.rating)

  if (!guest_name || guest_name.length < 2) {
    throw new Error('Please enter your name (at least 2 characters).')
  }
  if (!comment || comment.length < 10) {
    throw new Error('Please write a review with at least 10 characters.')
  }
  if (rating < 1 || rating > 5) {
    throw new Error('Please choose a star rating from 1 to 5.')
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('restaurant_reviews')
      .insert({
        guest_name,
        rating,
        comment,
        approved: true,
      })
      .select('id, guest_name, rating, comment, created_at')
      .single()

    if (error) {
      const msg = error.message || ''
      if (isMissingTableError(msg)) {
        const review: RestaurantReview = {
          id: randomUUID(),
          guest_name,
          rating,
          comment,
          created_at: new Date().toISOString(),
        }
        const existing = await readFallback()
        await writeFallback([review, ...existing])
        return review
      }
      throw new Error(msg)
    }

    return {
      id: String(data.id),
      guest_name: String(data.guest_name),
      rating: Number(data.rating),
      comment: String(data.comment),
      created_at: String(data.created_at),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (
      isMissingTableError(message) ||
      /fetch failed|ECONNREFUSED|network/i.test(message)
    ) {
      const review: RestaurantReview = {
        id: randomUUID(),
        guest_name,
        rating,
        comment,
        created_at: new Date().toISOString(),
      }
      const existing = await readFallback()
      await writeFallback([review, ...existing])
      return review
    }
    throw err
  }
}
