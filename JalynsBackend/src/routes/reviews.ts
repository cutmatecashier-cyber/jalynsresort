import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  clearRestaurantReviewReply,
  createRestaurantReview,
  listRestaurantReviews,
  setRestaurantReviewReply,
} from '../services/restaurantReviews.js'

export const reviewsRouter = Router()

async function requireApprovedAdmin(
  req: Request,
  res: Response,
): Promise<{ userId: string; name: string } | null> {
  if (!isServiceRoleConfigured()) {
    res.status(500).json({ success: false, message: 'Backend service_role key is not configured.' })
    return null
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    res.status(401).json({ success: false, message: 'Missing admin session.' })
    return null
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !authData.user) {
    res.status(401).json({
      success: false,
      message: authError?.message || 'Invalid admin session.',
    })
    return null
  }

  const { data: adminProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, approval_status, name')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) {
    res.status(500).json({
      success: false,
      message: `Could not verify admin profile: ${profileError.message}`,
    })
    return null
  }

  if (
    !adminProfile ||
    adminProfile.role !== 'admin' ||
    adminProfile.approval_status !== 'approved'
  ) {
    res.status(403).json({
      success: false,
      message: 'Only approved admins can manage restaurant review replies.',
    })
    return null
  }

  return {
    userId: authData.user.id,
    name: String(adminProfile.name || 'Admin'),
  }
}

async function optionalUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token || !isServiceRoleConfigured()) return null
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) return null
    return data.user.id
  } catch {
    return null
  }
}

reviewsRouter.get('/restaurant', async (_req, res) => {
  try {
    const reviews = await listRestaurantReviews()
    return res.json({ success: true, reviews })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load reviews.'
    const hint =
      /relation .* does not exist|Could not find the table/i.test(message)
        ? ' Run supabase/RESTAURANT_REVIEWS.sql in the Supabase SQL Editor.'
        : ''
    return res.status(500).json({ success: false, message: `${message}${hint}` })
  }
})

reviewsRouter.post('/restaurant', async (req, res) => {
  try {
    const guest_name = String(req.body.guest_name ?? '')
    const comment = String(req.body.comment ?? '')
    const rating = Number(req.body.rating)
    const user_id = await optionalUserId(req)

    const review = await createRestaurantReview({ guest_name, rating, comment, user_id })
    return res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been posted.',
      review,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save your review.'
    const status =
      /Please enter|Please write|Please choose|at least/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

reviewsRouter.put('/restaurant/:id/reply', async (req, res) => {
  try {
    const admin = await requireApprovedAdmin(req, res)
    if (!admin) return

    const reviewId = String(req.params.id || '')
    const reply = String(req.body.reply ?? '')

    const review = await setRestaurantReviewReply({
      reviewId,
      reply,
      adminUserId: admin.userId,
      adminName: admin.name,
    })

    return res.json({
      success: true,
      message: 'Reply posted.',
      review,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save reply.'
    const status = /not found|already has|Please write|missing/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

reviewsRouter.delete('/restaurant/:id/reply', async (req, res) => {
  try {
    const admin = await requireApprovedAdmin(req, res)
    if (!admin) return

    const reviewId = String(req.params.id || '')
    const review = await clearRestaurantReviewReply(reviewId)

    return res.json({
      success: true,
      message: 'Admin reply deleted. The customer review was kept.',
      review,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete reply.'
    const status = /not found|does not have|missing/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})
