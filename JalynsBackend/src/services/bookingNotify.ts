import { sendAppEmail } from '../config/mail.js'
import { loadBookingSettings } from './bookingSettings.js'
import { loadContactSettings } from './contactSettings.js'
import { formatClockLabel } from './roomAvailability.js'
import type { RoomBooking } from './roomBookings.js'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

type BookingCopy = {
  checkInLabel: string
  checkOutLabel: string
  paid: string | null
  extraGuests: string | null
}

async function bookingCopy(booking: RoomBooking): Promise<BookingCopy> {
  const schedule = await loadBookingSettings()
  return {
    checkInLabel: `${booking.check_in} ${formatClockLabel(schedule.checkInTime)}`,
    checkOutLabel: `${booking.check_out} ${formatClockLabel(schedule.checkOutTime)}`,
    paid: booking.paypal_capture_id ? `Paid with PayPal (${booking.paypal_capture_id})` : null,
    extraGuests: booking.extra_guests.length
      ? booking.extra_guests
          .map((guest) =>
            guest.kind === 'adult'
              ? `adult (10+) — ₱${guest.charge.toLocaleString('en-PH')}/night`
              : `${guest.age} years old (child) — ₱${guest.charge.toLocaleString('en-PH')}/night`,
          )
          .join(', ')
      : null,
  }
}

async function notifyResort(booking: RoomBooking, copy: BookingCopy, resortEmail: string) {
  const text = [
    `Room booking`,
    ``,
    `Ref: ${booking.id}`,
    `Status: Confirmed`,
    copy.paid,
    `Room: ${booking.room_name} (${booking.room_id})`,
    `Check-in: ${copy.checkInLabel}`,
    `Check-out: ${copy.checkOutLabel}`,
    `Nights: ${booking.nights}`,
    `Adults: ${booking.adults}`,
    `Kids: ${booking.kids}`,
    `Total guests: ${booking.guests}`,
    copy.extraGuests ? `Extra guests: ${copy.extraGuests}` : null,
    booking.extra_person_total > 0
      ? `Extra person charge: ₱${booking.extra_person_total.toLocaleString('en-PH')}`
      : null,
    booking.estimated_total ? `Total paid: ${booking.estimated_total}` : null,
    ``,
    `Guest: ${booking.full_name}`,
    `Email: ${booking.email}`,
    booking.phone ? `Phone: ${booking.phone}` : null,
  ]
    .filter((line): line is string => line != null)
    .join('\n')

  await sendAppEmail({
    to: resortEmail,
    replyTo: isEmail(booking.email) ? booking.email : undefined,
    subject: `Room booking — ${booking.room_name} — ${booking.full_name}`,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0c1210">
        <h2 style="margin:0 0 12px">New room booking</h2>
        <p style="margin:0 0 12px;color:#6b756f">Ref: ${escapeHtml(booking.id)}</p>
        <p><strong>Status:</strong> Confirmed</p>
        ${copy.paid ? `<p><strong>${escapeHtml(copy.paid)}</strong></p>` : ''}
        <h3 style="margin:16px 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b756f">Booking Information</h3>
        <p><strong>Room:</strong> ${escapeHtml(booking.room_name)}</p>
        <p><strong>Check-in:</strong> ${escapeHtml(copy.checkInLabel)}</p>
        <p><strong>Check-out:</strong> ${escapeHtml(copy.checkOutLabel)}</p>
        <p><strong>Nights:</strong> ${booking.nights}</p>
        <p><strong>Adults:</strong> ${booking.adults}</p>
        <p><strong>Kids:</strong> ${booking.kids}</p>
        <p><strong>Total guests:</strong> ${booking.guests}</p>
        ${copy.extraGuests ? `<p><strong>Extra guests:</strong> ${escapeHtml(copy.extraGuests)}</p>` : ''}
        ${
          booking.estimated_total
            ? `<p><strong>Total paid:</strong> ${escapeHtml(booking.estimated_total)}</p>`
            : ''
        }
        <h3 style="margin:16px 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b756f">Guest Information</h3>
        <p><strong>Full name:</strong> ${escapeHtml(booking.full_name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
        ${booking.phone ? `<p><strong>Contact number:</strong> ${escapeHtml(booking.phone)}</p>` : ''}
      </div>
    `,
  })
}

async function notifyGuest(booking: RoomBooking, copy: BookingCopy, resortEmail: string, resortPhone: string) {
  const guestEmail = booking.email.trim()
  if (!isEmail(guestEmail)) {
    console.warn('[bookings] skipped guest confirmation; booking email is not valid')
    return false
  }

  const text = [
    `Hi ${booking.full_name},`,
    ``,
    `Your reservation at Jalyn's Resort is confirmed.`,
    ``,
    `Status: Confirmed`,
    `Ref: ${booking.id}`,
    copy.paid,
    `Room: ${booking.room_name}`,
    `Check-in: ${copy.checkInLabel}`,
    `Check-out: ${copy.checkOutLabel}`,
    `Nights: ${booking.nights}`,
    `Adults: ${booking.adults}`,
    `Kids: ${booking.kids}`,
    `Total guests: ${booking.guests}`,
    copy.extraGuests ? `Extra guests: ${copy.extraGuests}` : null,
    booking.estimated_total ? `Total paid: ${booking.estimated_total}` : null,
    ``,
    `If you need to change this booking, contact the resort at ${resortPhone} or ${resortEmail}.`,
  ]
    .filter((line): line is string => line != null)
    .join('\n')

  await sendAppEmail({
    to: guestEmail,
    replyTo: isEmail(resortEmail) ? resortEmail : undefined,
    subject: `Reservation confirmed — ${booking.room_name}`,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0c1210">
        <h2 style="margin:0 0 12px">Your reservation is confirmed</h2>
        <p>Hi ${escapeHtml(booking.full_name)},</p>
        <p>Thank you for booking with Jalyn's Resort. Your payment was received and this stay is confirmed.</p>
        <p style="margin:16px 0"><strong>Status:</strong> Confirmed</p>
        <p style="margin:0 0 12px;color:#6b756f">Ref: ${escapeHtml(booking.id)}</p>
        ${copy.paid ? `<p><strong>${escapeHtml(copy.paid)}</strong></p>` : ''}
        <p><strong>Room:</strong> ${escapeHtml(booking.room_name)}</p>
        <p><strong>Check-in:</strong> ${escapeHtml(copy.checkInLabel)}</p>
        <p><strong>Check-out:</strong> ${escapeHtml(copy.checkOutLabel)}</p>
        <p><strong>Nights:</strong> ${booking.nights}</p>
        <p><strong>Adults:</strong> ${booking.adults}</p>
        <p><strong>Kids:</strong> ${booking.kids}</p>
        <p><strong>Total guests:</strong> ${booking.guests}</p>
        ${copy.extraGuests ? `<p><strong>Extra guests:</strong> ${escapeHtml(copy.extraGuests)}</p>` : ''}
        ${
          booking.estimated_total
            ? `<p><strong>Total paid:</strong> ${escapeHtml(booking.estimated_total)}</p>`
            : ''
        }
        <p style="margin-top:16px">If you need to change this booking, contact the resort at ${escapeHtml(resortPhone)} or ${escapeHtml(resortEmail)}.</p>
      </div>
    `,
  })
  return true
}

export async function notifyRoomBooking(booking: RoomBooking) {
  const settings = await loadContactSettings()
  const resortEmail = settings.contact_email || process.env.SMTP_FROM || process.env.SMTP_USER || ''
  const copy = await bookingCopy(booking)
  const errors: string[] = []

  try {
    const sent = await notifyGuest(booking, copy, resortEmail, settings.phone)
    if (sent) console.log(`[bookings] confirmation sent to guest ${booking.email.trim()}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[bookings] guest confirmation failed:', message)
    errors.push(message)
  }

  if (resortEmail) {
    try {
      await notifyResort(booking, copy, resortEmail)
      console.log(`[bookings] resort notice sent to ${resortEmail}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[bookings] resort notice failed:', message)
      errors.push(message)
    }
  }

  if (errors.length) throw new Error(errors.join('; '))
}
