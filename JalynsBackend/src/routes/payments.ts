import { Router } from 'express'
import { notifyRoomBooking } from '../services/bookingNotify.js'
import {
  capturePayPalOrder,
  createPayPalOrder,
  paidAmountFromOrder,
  paypalClientId,
  paypalConfigured,
} from '../services/paypal.js'
import { deleteCheckoutDraft, loadCheckoutDraft, saveCheckoutDraft } from '../services/paypalDrafts.js'
import {
  createRoomBooking,
  findBookingByPayPalOrder,
  quoteRoomBooking,
  type RoomBookingInput,
} from '../services/roomBookings.js'

export const paymentsRouter = Router()

function clientErrorStatus(message: string) {
  return /must be|required|valid|not found|at least|up to|booked|unavailable|age|adult|kid|PayPal|rate|paid|total|checkout|contact|currency/i.test(
    message,
  )
    ? 400
    : 500
}

function parseBookingBody(body: unknown): RoomBookingInput {
  const row = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const guestsRaw = row.guests
  const guests = typeof guestsRaw === 'number' ? guestsRaw : Number(String(guestsRaw ?? '').trim())
  const adultsRaw = row.adults
  const adults = typeof adultsRaw === 'number' ? adultsRaw : Number(String(adultsRaw ?? '').trim())
  const kidsRaw = row.kids
  const kids = typeof kidsRaw === 'number' ? kidsRaw : Number(String(kidsRaw ?? '').trim())
  const extraGuests = Array.isArray(row.extraGuests)
    ? row.extraGuests.map((item) => {
        const guest = (item && typeof item === 'object' ? item : {}) as { kind?: unknown; age?: unknown }
        return {
          kind: guest.kind === 'adult' ? ('adult' as const) : ('kid' as const),
          age: typeof guest.age === 'number' ? guest.age : Number(guest.age),
        }
      })
    : []

  return {
    roomId: String(row.roomId ?? '').trim(),
    roomName: String(row.roomName ?? '').trim(),
    checkIn: String(row.checkIn ?? '').trim(),
    checkOut: String(row.checkOut ?? '').trim(),
    guests,
    adults: Number.isInteger(adults) ? adults : undefined,
    kids: Number.isInteger(kids) ? kids : undefined,
    extraGuests,
    fullName: String(row.fullName ?? '').trim(),
    email: String(row.email ?? '').trim(),
    phone: String(row.phone ?? '').trim(),
  }
}

paymentsRouter.get('/paypal/config', (_req, res) => {
  const clientId = paypalClientId()
  return res.json({
    success: true,
    enabled: paypalConfigured(),
    clientId: paypalConfigured() ? clientId : '',
    currency: 'PHP',
  })
})

paymentsRouter.post('/paypal/orders', async (req, res) => {
  try {
    if (!paypalConfigured()) {
      return res.status(400).json({ success: false, message: 'PayPal is not set up yet.' })
    }
    const input = parseBookingBody(req.body)
    const amount = await quoteRoomBooking(input)
    const orderId = await createPayPalOrder(amount, `Jalyn's Resort — ${input.roomName}`)
    await saveCheckoutDraft({
      orderId,
      amount,
      input,
      createdAt: Date.now(),
    })
    return res.json({ success: true, orderId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start PayPal checkout.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

paymentsRouter.post('/paypal/orders/:orderId/capture', async (req, res) => {
  try {
    if (!paypalConfigured()) {
      return res.status(400).json({ success: false, message: 'PayPal is not set up yet.' })
    }
    const orderId = String(req.params.orderId || '').trim()
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'PayPal order is missing.' })
    }

    const existing = await findBookingByPayPalOrder(orderId)
    if (existing) {
      return res.json({
        success: true,
        message: 'Payment received. Your booking is confirmed.',
        booking: existing,
      })
    }

    const draft = await loadCheckoutDraft(orderId)
    if (!draft) {
      return res.status(400).json({
        success: false,
        message: 'This checkout expired. Start the PayPal payment again.',
      })
    }

    const amount = await quoteRoomBooking(draft.input)
    if (Math.abs(amount - draft.amount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'The stay total changed. Start checkout again.',
      })
    }

    const order = await capturePayPalOrder(orderId)
    const paid = paidAmountFromOrder(order)
    if (Math.abs(paid.amount - amount) > 0.01) {
      throw new Error('Paid amount does not match the stay total.')
    }

    let booking
    try {
      booking = await createRoomBooking({
        ...draft.input,
        paypalOrderId: orderId,
        paypalCaptureId: paid.captureId,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save the booking.'
      console.error('[paypal] captured but booking was not saved', orderId, paid.captureId, message)
      return res.status(500).json({
        success: false,
        message: 'Payment was received, but the booking was not saved. Contact the resort with your PayPal receipt.',
      })
    }

    await deleteCheckoutDraft(orderId)
    res.json({
      success: true,
      message: 'Payment received. Your booking is confirmed.',
      booking,
    })

    void notifyRoomBooking(booking).catch((err) => {
      console.warn('[bookings] background email failed:', err instanceof Error ? err.message : err)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not complete PayPal payment.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
