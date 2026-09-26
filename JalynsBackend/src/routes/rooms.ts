import multer from 'multer'
import { Router } from 'express'
import { sendAppEmail } from '../config/mail.js'
import { requireApprovedAdmin } from '../lib/requireAdmin.js'
import { loadContactSettings } from '../services/contactSettings.js'
import {
  addRoomHighlight,
  addRoomImages,
  createRoom,
  deleteRoom,
  deleteRoomHighlight,
  deleteRoomImage,
  getRoomsVoucher,
  listRoomHighlights,
  listRooms,
  replaceRoomImage,
  resetRooms,
  updateRoom,
  updateRoomsVoucher,
  type RoomInput,
} from '../services/rooms.js'
import {
  createRoomBooking,
  listRoomBookings,
  updateRoomBookingStatus,
  type RoomBookingStatus,
} from '../services/roomBookings.js'
import {
  getRoomsContentBackground,
  getRoomsHeroBackground,
  removeRoomsContentBackground,
  removeRoomsHeroBackground,
  uploadRoomsContentBackground,
  uploadRoomsHeroBackground,
} from '../services/roomsBackgrounds.js'
import { SITE_BUCKETS, uploadPublicImage } from '../services/cloudUpload.js'

export const roomsRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed.'))
      return
    }
    cb(null, true)
  },
  limits: { fileSize: 8 * 1024 * 1024 },
})

function clientErrorStatus(message: string) {
  return /must be|required|valid|not found|at least|Only JPG|File too large|image|Invalid|bucket is missing|up to|Keep /i.test(
    message,
  )
    ? 400
    : 500
}

function parseAmenities(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      // comma-separated fallback
    }
    return raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return undefined
}

function bodyToRoomInput(body: Record<string, unknown>): RoomInput {
  const amenities = parseAmenities(body.amenities)
  const sortRaw = body.sort_order
  const sort_order =
    typeof sortRaw === 'number'
      ? sortRaw
      : typeof sortRaw === 'string' && sortRaw.trim()
        ? Number(sortRaw)
        : undefined
  return {
    name: typeof body.name === 'string' ? body.name : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    size: typeof body.size === 'string' ? body.size : undefined,
    max_capacity:
      typeof body.max_capacity === 'string'
        ? body.max_capacity
        : typeof body.capacity === 'string'
          ? body.capacity
          : undefined,
    beds: typeof body.beds === 'string' ? body.beds : undefined,
    price_per_night:
      typeof body.price_per_night === 'string'
        ? body.price_per_night
        : typeof body.price === 'string'
          ? body.price
          : undefined,
    extra_person_charge:
      typeof body.extra_person_charge === 'string' ? body.extra_person_charge : undefined,
    rules_policies: typeof body.rules_policies === 'string' ? body.rules_policies : undefined,
    status: typeof body.status === 'string' ? body.status : 'available',
    amenities,
    sort_order: Number.isFinite(sort_order) ? sort_order : undefined,
  }
}

roomsRouter.get('/', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const [rooms, voucher, highlights] = await Promise.all([
      listRooms(),
      getRoomsVoucher(),
      listRoomHighlights(),
    ])
    return res.json({ success: true, rooms, voucher, highlights })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rooms.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.get('/bookings', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can view bookings.'))) {
      return
    }
    res.setHeader('Cache-Control', 'no-store')
    const bookings = await listRoomBookings()
    return res.json({ success: true, bookings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load bookings.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.patch('/bookings/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can update bookings.'))) {
      return
    }
    const statusRaw = String(req.body?.status ?? '').trim()
    const status: RoomBookingStatus | null =
      statusRaw === 'pending' || statusRaw === 'confirmed' || statusRaw === 'completed'
        ? statusRaw
        : null
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status must be pending, confirmed, or completed.',
      })
    }
    const bookings = await updateRoomBookingStatus(req.params.id, status)
    return res.json({ success: true, bookings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update booking.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.post('/bookings', async (req, res) => {
  try {
    const roomId = String(req.body.roomId ?? '').trim()
    const roomName = String(req.body.roomName ?? '').trim()
    const checkIn = String(req.body.checkIn ?? '').trim()
    const checkOut = String(req.body.checkOut ?? '').trim()
    const fullName = String(req.body.fullName ?? '').trim()
    const email = String(req.body.email ?? '').trim()
    const phone = String(req.body.phone ?? '').trim()
    const guestsRaw = req.body.guests
    const guests =
      typeof guestsRaw === 'number' ? guestsRaw : Number(String(guestsRaw ?? '').trim())
    const nightsRaw = req.body.nights
    const nights =
      typeof nightsRaw === 'number' ? nightsRaw : Number(String(nightsRaw ?? '').trim())
    const pricePerNight =
      typeof req.body.pricePerNight === 'string' ? req.body.pricePerNight.trim() : null
    const estimatedTotal =
      typeof req.body.estimatedTotal === 'string' ? req.body.estimatedTotal.trim() : null
    const voucherRaw = req.body.voucherPercent
    const voucherPercent =
      typeof voucherRaw === 'number'
        ? voucherRaw
        : typeof voucherRaw === 'string' && voucherRaw.trim()
          ? Number(voucherRaw)
          : null

    const booking = await createRoomBooking({
      roomId,
      roomName,
      checkIn,
      checkOut,
      guests,
      fullName,
      email,
      phone,
      nights: Number.isFinite(nights) && nights > 0 ? nights : undefined,
      pricePerNight,
      estimatedTotal,
      voucherPercent: Number.isFinite(voucherPercent) ? voucherPercent : null,
    })

    // Respond immediately — email goes out in the background.
    res.json({
      success: true,
      message: 'Your booking request has been sent. We will contact you shortly.',
      booking,
    })

    void (async () => {
      try {
        const settings = await loadContactSettings()
        const to = settings.contact_email || process.env.SMTP_FROM || process.env.SMTP_USER
        if (!to) return

        const escapeHtml = (value: string) =>
          value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')

        const text = [
          `Room booking request`,
          ``,
          `Ref: ${booking.id}`,
          `Room: ${booking.room_name} (${booking.room_id})`,
          `Check-in: ${booking.check_in}`,
          `Check-out: ${booking.check_out}`,
          `Nights: ${booking.nights}`,
          `Guests: ${booking.guests}`,
          booking.estimated_total ? `Estimated total: ${booking.estimated_total}` : null,
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
              <h2 style="margin:0 0 12px">New room booking request</h2>
              <p style="margin:0 0 12px;color:#6b756f">Ref: ${escapeHtml(booking.id)}</p>
              <h3 style="margin:16px 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b756f">Booking Information</h3>
              <p><strong>Room:</strong> ${escapeHtml(booking.room_name)}</p>
              <p><strong>Check-in:</strong> ${escapeHtml(booking.check_in)}</p>
              <p><strong>Check-out:</strong> ${escapeHtml(booking.check_out)}</p>
              <p><strong>Nights:</strong> ${booking.nights}</p>
              <p><strong>Guests:</strong> ${booking.guests}</p>
              ${
                booking.estimated_total
                  ? `<p><strong>Estimated total:</strong> ${escapeHtml(booking.estimated_total)}</p>`
                  : ''
              }
              <h3 style="margin:16px 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b756f">Guest Information</h3>
              <p><strong>Full name:</strong> ${escapeHtml(booking.full_name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
              <p><strong>Contact number:</strong> ${escapeHtml(booking.phone)}</p>
            </div>
          `,
        })
      } catch (err) {
        console.warn('[bookings] background email failed:', err instanceof Error ? err.message : err)
      }
    })()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not submit booking.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.get('/highlights', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ success: true, highlights: await listRoomHighlights() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load highlight photos.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.post('/highlights', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit highlight photos.'))) {
      return
    }
    upload.array('images', 12)(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Could not upload images.'
          res.status(400).json({ success: false, message })
          return
        }
        const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : []
        if (!files.length) {
          res.status(400).json({ success: false, message: 'Please choose at least one image.' })
          return
        }
        try {
          let highlights = await listRoomHighlights()
          for (const file of files) {
            const url = await uploadPublicImage({
              bucket: SITE_BUCKETS.rooms,
              folder: 'highlights',
              file,
            })
            highlights = await addRoomHighlight(url)
          }
          res.status(201).json({ success: true, highlights })
        } catch (inner) {
          const message =
            inner instanceof Error ? inner.message : 'Could not save highlight photos.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload highlight photos.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.delete('/highlights/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit highlight photos.'))) {
      return
    }
    const highlights = await deleteRoomHighlight(req.params.id)
    return res.json({ success: true, highlights })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete highlight photo.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.get('/voucher', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ success: true, voucher: await getRoomsVoucher() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load voucher.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.put('/voucher', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit room vouchers.'))) {
      return
    }
    const body = (req.body || {}) as Record<string, unknown>
    const voucher = await updateRoomsVoucher({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      percent:
        typeof body.percent === 'number'
          ? body.percent
          : typeof body.percent === 'string'
            ? Number(body.percent)
            : undefined,
    })
    return res.json({ success: true, voucher })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update voucher.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.get('/hero', async (_req, res) => {
  try {
    const background = await getRoomsHeroBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load hero background.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.post('/hero', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit rooms backgrounds.'))) {
      return
    }
    upload.single('image')(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Could not upload image.'
          res.status(400).json({ success: false, message })
          return
        }
        if (!req.file) {
          res.status(400).json({ success: false, message: 'Please choose an image to upload.' })
          return
        }
        try {
          const background = await uploadRoomsHeroBackground(req.file)
          res.status(201).json({ success: true, ...background })
        } catch (uploadErr) {
          const message =
            uploadErr instanceof Error ? uploadErr.message : 'Could not upload hero background.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload hero background.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.delete('/hero', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit rooms backgrounds.'))) {
      return
    }
    await removeRoomsHeroBackground()
    return res.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove hero background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.get('/content-background', async (_req, res) => {
  try {
    const background = await getRoomsContentBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load content background.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.post('/content-background', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit rooms backgrounds.'))) {
      return
    }
    upload.single('image')(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Could not upload image.'
          res.status(400).json({ success: false, message })
          return
        }
        if (!req.file) {
          res.status(400).json({ success: false, message: 'Please choose an image to upload.' })
          return
        }
        try {
          const background = await uploadRoomsContentBackground(req.file)
          res.status(201).json({ success: true, ...background })
        } catch (uploadErr) {
          const message =
            uploadErr instanceof Error
              ? uploadErr.message
              : 'Could not upload content background.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload content background.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.delete('/content-background', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit rooms backgrounds.'))) {
      return
    }
    await removeRoomsContentBackground()
    return res.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove content background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.post('/reset', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit rooms.'))) {
      return
    }
    const rooms = await resetRooms()
    return res.json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset rooms.'
    return res.status(500).json({ success: false, message })
  }
})

/** Create a room (JSON) or upload primary image (multipart) */
roomsRouter.post('/', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit rooms.'))) {
      return
    }

    const contentType = String(req.headers['content-type'] || '')
    if (contentType.includes('multipart/form-data')) {
      upload.single('image')(req, res, (err: unknown) => {
        void (async () => {
          if (err) {
            const message = err instanceof Error ? err.message : 'Could not upload image.'
            res.status(400).json({ success: false, message })
            return
          }
          if (!req.file) {
            res.status(400).json({ success: false, message: 'Please choose an image to upload.' })
            return
          }
          try {
            const url = await uploadPublicImage({
              bucket: SITE_BUCKETS.rooms,
              folder: 'photos',
              file: req.file,
            })
            const input = bodyToRoomInput((req.body || {}) as Record<string, unknown>)
            const rooms = await createRoom({ ...input, image: url })
            res.status(201).json({ success: true, url, rooms })
          } catch (inner) {
            const message = inner instanceof Error ? inner.message : 'Could not create room.'
            res.status(clientErrorStatus(message)).json({ success: false, message })
          }
        })()
      })
      return
    }

    const input = bodyToRoomInput((req.body || {}) as Record<string, unknown>)
    const images = Array.isArray(req.body?.images)
      ? (req.body.images as unknown[]).map((u) => String(u))
      : undefined
    const rooms = await createRoom({ ...input, images })
    return res.status(201).json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create room.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

/** Legacy photo upload (add or replace primary image) */
roomsRouter.post('/upload', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit room photos.'))) {
      return
    }

    upload.single('image')(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Could not upload image.'
          res.status(400).json({ success: false, message })
          return
        }
        if (!req.file) {
          res.status(400).json({ success: false, message: 'Please choose an image to upload.' })
          return
        }

        try {
          const url = await uploadPublicImage({
            bucket: SITE_BUCKETS.rooms,
            folder: 'photos',
            file: req.file,
          })
          const replaceId =
            typeof req.body?.replaceId === 'string' ? req.body.replaceId.trim() : ''
          const input = bodyToRoomInput((req.body || {}) as Record<string, unknown>)
          const rooms = replaceId
            ? await updateRoom(replaceId, { ...input, image: url })
            : await createRoom({ ...input, image: url })
          res.json({ success: true, url, rooms })
        } catch (inner) {
          const message = inner instanceof Error ? inner.message : 'Could not save room photo.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload room photo.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.put('/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit rooms.'))) {
      return
    }
    const input = bodyToRoomInput((req.body || {}) as Record<string, unknown>)
    const rooms = await updateRoom(req.params.id, input)
    return res.json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update room.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.post('/:id/images', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit room photos.'))) {
      return
    }

    upload.array('images', 12)(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Could not upload images.'
          res.status(400).json({ success: false, message })
          return
        }
        const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : []
        if (!files.length) {
          res.status(400).json({ success: false, message: 'Please choose at least one image.' })
          return
        }
        try {
          const urls: string[] = []
          for (const file of files) {
            urls.push(
              await uploadPublicImage({
                bucket: SITE_BUCKETS.rooms,
                folder: 'photos',
                file,
              }),
            )
          }
          const rooms = await addRoomImages(req.params.id, urls)
          res.status(201).json({ success: true, urls, rooms })
        } catch (inner) {
          const message = inner instanceof Error ? inner.message : 'Could not add room images.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add room images.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.put('/:id/images/:imageIndex', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit room photos.'))) {
      return
    }
    const imageIndex = Number(req.params.imageIndex)
    if (!Number.isInteger(imageIndex) || imageIndex < 0) {
      return res.status(400).json({ success: false, message: 'Invalid image index.' })
    }

    upload.single('image')(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Could not upload image.'
          res.status(400).json({ success: false, message })
          return
        }
        if (!req.file) {
          res.status(400).json({ success: false, message: 'Please choose an image to upload.' })
          return
        }
        try {
          const url = await uploadPublicImage({
            bucket: SITE_BUCKETS.rooms,
            folder: 'photos',
            file: req.file,
          })
          const rooms = await replaceRoomImage(req.params.id, imageIndex, url)
          res.json({ success: true, url, rooms })
        } catch (inner) {
          const message = inner instanceof Error ? inner.message : 'Could not replace image.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not replace image.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.delete('/:id/images/:imageIndex', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit room photos.'))) {
      return
    }
    const imageIndex = Number(req.params.imageIndex)
    if (!Number.isInteger(imageIndex) || imageIndex < 0) {
      return res.status(400).json({ success: false, message: 'Invalid image index.' })
    }
    const rooms = await deleteRoomImage(req.params.id, imageIndex)
    return res.json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete image.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.delete('/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit rooms.'))) {
      return
    }
    const rooms = await deleteRoom(req.params.id)
    return res.json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete room.'
    const status = /not found|at least one/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})
