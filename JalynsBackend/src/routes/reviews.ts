import { Router } from 'express'
import {
  createRestaurantReview,
  listRestaurantReviews,
} from '../services/restaurantReviews.js'

export const reviewsRouter = Router()

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

    const review = await createRestaurantReview({ guest_name, rating, comment })
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
