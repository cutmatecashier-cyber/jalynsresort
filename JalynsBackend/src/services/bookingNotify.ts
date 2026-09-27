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

export async function notifyRoomBooking(booking: RoomBooking) {
  const settings = await loadContactSettings()
  const to = settings.contact_email || process.env.SMTP_FROM || process.env.SMTP_USER
  if (!to) return

  const schedule = await loadBookingSettings()
  const checkInLabel = `${booking.check_in} ${formatClockLabel(schedule.checkInTime)}`
  const checkOutLabel = `${booking.check_out} ${formatClockLabel(schedule.checkOutTime)}`
  const paid = booking.paypal_capture_id
    ? `Paid with PayPal (${booking.paypal_capture_id})`
    : null

  const text = [
    `Room booking`,
    ``,
    `Ref: ${booking.id}`,
    paid,
    `Room: ${booking.room_name} (${booking.room_id})`,
    `Check-in: ${checkInLabel}`,
    `Check-out: ${checkOutLabel}`,
    `Nights: ${booking.nights}`,
    `Adults: ${booking.adults}`,
    `Kids: ${booking.kids}`,
    `Total guests: ${booking.guests}`,
    booking.extra_guests.length
      ? `Extra guests: ${booking.extra_guests
          .map((guest) =>
            guest.kind === 'adult'
              ? `adult (10+) ₱${guest.charge.toLocaleString('en-PH')}/night`
              : `${guest.age} years old (child) ₱${guest.charge.toLocaleString('en-PH')}/night`,
          )
          .join(', ')}`
      : null,
    booking.extra_person_total > 0
      ? `Extra person charge: ₱${booking.extra_person_total.toLocaleString('en-PH')}`
      : null,
    booking.estimated_total ? `Total paid: ${booking.estimated_total}` : null,
    ``,
    `Guest: ${booking.full_name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
  ]
    .filter((line): line is string => line != null)
    .join('\n')

  await sendAppEmail({
    to,
    subject: `Room booking — ${booking.room_name} — ${booking.full_name}`,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0c1210">
        <h2 style="margin:0 0 12px">New room booking</h2>
        <p style="margin:0 0 12px;color:#6b756f">Ref: ${escapeHtml(booking.id)}</p>
        ${paid ? `<p><strong>${escapeHtml(paid)}</strong></p>` : ''}
        <h3 style="margin:16px 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b756f">Booking Information</h3>
        <p><strong>Room:</strong> ${escapeHtml(booking.room_name)}</p>
        <p><strong>Check-in:</strong> ${escapeHtml(checkInLabel)}</p>
        <p><strong>Check-out:</strong> ${escapeHtml(checkOutLabel)}</p>
        <p><strong>Nights:</strong> ${booking.nights}</p>
        <p><strong>Adults:</strong> ${booking.adults}</p>
        <p><strong>Kids:</strong> ${booking.kids}</p>
        <p><strong>Total guests:</strong> ${booking.guests}</p>
        ${
          booking.extra_guests.length
            ? `<p><strong>Extra guests:</strong> ${escapeHtml(
                booking.extra_guests
                  .map((guest) =>
                    guest.kind === 'adult'
                      ? `adult (10+) — ₱${guest.charge.toLocaleString('en-PH')}/night`
                      : `${guest.age} years old (child) — ₱${guest.charge.toLocaleString('en-PH')}/night`,
                  )
                  .join(', '),
              )}</p>`
            : ''
        }
        ${
          booking.estimated_total
            ? `<p><strong>Total paid:</strong> ${escapeHtml(booking.estimated_total)}</p>`
            : ''
        }
        <h3 style="margin:16px 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b756f">Guest Information</h3>
        <p><strong>Full name:</strong> ${escapeHtml(booking.full_name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
        <p><strong>Contact number:</strong> ${escapeHtml(booking.phone)}</p>
      </div>
    `,
  })
}
