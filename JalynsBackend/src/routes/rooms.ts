import multer from 'multer'
import { Router } from 'express'
import { requireApprovedAdmin } from '../lib/requireAdmin.js'
import {
  addRoom,
  deleteRoom,
  listRooms,
  resetRooms,
  updateRoom,
} from '../services/rooms.js'
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

roomsRouter.get('/', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ success: true, rooms: await listRooms() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rooms.'
    return res.status(500).json({ success: false, message })
  }
})

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
          const name = typeof req.body?.name === 'string' ? req.body.name : undefined
          const rooms = replaceId
            ? await updateRoom(replaceId, { image: url, name })
            : await addRoom({ image: url, name })
          res.json({ success: true, url, rooms })
        } catch (inner) {
          const message = inner instanceof Error ? inner.message : 'Could not save room photo.'
          const status = /not found|up to|required|bucket|storage|sync/i.test(message) ? 400 : 500
          res.status(status).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload room photo.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.delete('/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit room photos.'))) {
      return
    }
    const rooms = await deleteRoom(req.params.id)
    return res.json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete room photo.'
    const status = /not found|at least one/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

roomsRouter.post('/reset', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, 'Only approved admins can edit room photos.'))) {
      return
    }
    const rooms = await resetRooms()
    return res.json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset rooms.'
    return res.status(500).json({ success: false, message })
  }
})
