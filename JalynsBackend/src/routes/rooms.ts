import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { Router } from 'express'
import { requireApprovedAdmin } from '../lib/requireAdmin.js'
import { loadBookingSettings, saveBookingSchedule, saveExtraPersonRules } from '../services/bookingSettings.js'
import {
  addRoomHighlight,
  addRoomImages,
  createRoom,
  deleteRoom,
  deleteRoomHighlight,
  deleteRoomImage,
  replaceRoomHighlight,
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
import { prepareRoomImage } from '../services/prepareRoomImage.js'

export const roomsRouter = Router()

function isAllowedRoomImage(file: Express.Multer.File) {
  if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) return true
  const name = file.originalname || ''
  const mime = (file.mimetype || '').toLowerCase()
  return /\.nef$/i.test(name) || mime.includes('nikon') || mime === 'image/nef' || mime === 'image/x-raw'
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!isAllowedRoomImage(file)) {
      cb(new Error('Only JPG, PNG, WEBP, GIF, or NEF images are allowed.'))
      return
    }
    cb(null, true)
  },
  // Nikon RAW files are much larger than the JPEG preview we store.
  limits: { fileSize: 80 * 1024 * 1024 },
})

function clientErrorStatus(message: string) {
  return /must be|required|valid|not found|at least|Only JPG|File too large|image|Invalid|bucket is missing|up to|Keep |booked|unavailable|age|adult|kid/i.test(
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
    quantity: parseQuantity(body.quantity),
    sort_order: Number.isFinite(sort_order) ? sort_order : undefined,
  }
}

function parseQuantity(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n)) return undefined
  return Math.min(99, Math.max(1, Math.round(n)))
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

roomsRouter.get('/availability', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const [rooms, bookings, settings] = await Promise.all([
      listRooms(),
      listRoomBookings(),
      loadBookingSettings(),
    ])
    return res.json({
      success: true,
      checkInTime: settings.checkInTime,
      checkOutTime: settings.checkOutTime,
      extraPersonRules: settings.extraPersonRules,
      rooms: rooms.map((room) => ({
        id: room.id,
        quantity: room.quantity,
        status: room.status,
        stays: bookings
          .filter((booking) => booking.room_id === room.id && booking.status !== 'completed')
          .map((booking) => ({ checkIn: booking.check_in, checkOut: booking.check_out })),
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load availability.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.put('/booking-settings', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can update booking settings.'))) {
      return
    }
    const settings = await saveBookingSchedule({
      checkInTime: req.body?.checkInTime,
      checkOutTime: req.body?.checkOutTime,
    })
    return res.json({
      success: true,
      checkInTime: settings.checkInTime,
      checkOutTime: settings.checkOutTime,
      extraPersonRules: settings.extraPersonRules,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update booking settings.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

roomsRouter.put('/extra-person-rules', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can update extra-person rates.'))) {
      return
    }
    const rules = await saveExtraPersonRules(req.body?.rules)
    return res.json({ success: true, extraPersonRules: rules })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update extra-person rates.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
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

roomsRouter.post('/bookings', (_req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Pay with PayPal to confirm this booking.',
  })
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
              file: await prepareRoomImage(file),
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

roomsRouter.put('/highlights/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit highlight photos.'))) {
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
            folder: 'highlights',
            file: await prepareRoomImage(req.file),
          })
          const highlights = await replaceRoomHighlight(req.params.id, url)
          res.json({ success: true, highlights })
        } catch (inner) {
          const message =
            inner instanceof Error ? inner.message : 'Could not replace highlight photo.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not replace highlight photo.'
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
          const background = await uploadRoomsHeroBackground(await prepareRoomImage(req.file))
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
          const background = await uploadRoomsContentBackground(await prepareRoomImage(req.file))
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
              file: await prepareRoomImage(req.file),
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
            file: await prepareRoomImage(req.file),
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

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads')

function urlsMatch(stored: string, requested: string) {
  if (stored === requested) return true
  try {
    const reqUrl = new URL(requested)
    if (stored.startsWith('/')) return reqUrl.pathname === stored.split('?')[0]
    const storedUrl = new URL(stored)
    return storedUrl.host === reqUrl.host && storedUrl.pathname === reqUrl.pathname
  } catch {
    return false
  }
}

roomsRouter.get('/source-image', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit room photos.'))) {
      return
    }
    const requested = typeof req.query.url === 'string' ? req.query.url.trim() : ''
    if (!requested) {
      return res.status(400).json({ success: false, message: 'Missing photo.' })
    }
    const rooms = await listRooms()
    const stored = rooms
      .flatMap((room) => room.images)
      .find((image) => urlsMatch(image, requested))
    if (!stored) {
      return res.status(400).json({ success: false, message: 'That photo is not on this room.' })
    }

    let body: Buffer
    let contentType = 'image/jpeg'
    if (stored.startsWith('/uploads/')) {
      const relative = stored.replace(/^\/uploads\//, '').split('?')[0]
      const full = path.resolve(uploadsRoot, relative)
      if (full !== uploadsRoot && !full.startsWith(`${uploadsRoot}${path.sep}`)) {
        return res.status(400).json({ success: false, message: 'Invalid photo path.' })
      }
      body = await readFile(full)
    } else if (/^https:\/\//i.test(stored)) {
      const target = new URL(stored)
      const supabaseHost = new URL(process.env.SUPABASE_URL || 'https://invalid.local').host
      if (target.host !== supabaseHost && target.host !== 'images.unsplash.com') {
        return res.status(400).json({ success: false, message: 'This photo cannot be edited.' })
      }
      const response = await fetch(stored)
      if (!response.ok) {
        return res.status(400).json({ success: false, message: 'Could not load this photo.' })
      }
      body = Buffer.from(await response.arrayBuffer())
      const type = response.headers.get('content-type') || ''
      if (type.startsWith('image/')) contentType = type.split(';')[0]
    } else {
      return res.status(400).json({ success: false, message: 'This photo cannot be edited.' })
    }

    if (body.length > 20 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'This photo is too large to edit.' })
    }
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.send(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load this photo.'
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
                file: await prepareRoomImage(file),
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
            file: await prepareRoomImage(req.file),
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
