import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  addRoom,
  deleteRoom,
  listRooms,
  resetRooms,
  updateRoom,
} from '../services/rooms.js'

export const roomsRouter = Router()

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/rooms')
mkdirSync(uploadsRoot, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsRoot),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg'
      cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`)
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed.'))
      return
    }
    cb(null, true)
  },
  limits: { fileSize: 8 * 1024 * 1024 },
})

async function requireApprovedAdmin(req: Request, res: Response): Promise<string | null> {
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
    .select('role, approval_status')
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
      message: 'Only approved admins can edit room photos.',
    })
    return null
  }

  return authData.user.id
}

roomsRouter.get('/', (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ success: true, rooms: listRooms() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rooms.'
    return res.status(500).json({ success: false, message })
  }
})

roomsRouter.post('/upload', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return

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

        const url = `/uploads/rooms/${req.file.filename}`
        const replaceId =
          typeof req.body?.replaceId === 'string' ? req.body.replaceId.trim() : ''
        const name = typeof req.body?.name === 'string' ? req.body.name : undefined

        try {
          const rooms = replaceId
            ? updateRoom(replaceId, { image: url, name })
            : addRoom({ image: url, name })
          res.json({ success: true, url, rooms })
        } catch (inner) {
          const message = inner instanceof Error ? inner.message : 'Could not save room photo.'
          const status = /not found|up to|required/i.test(message) ? 400 : 500
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
    if (!(await requireApprovedAdmin(req, res))) return
    const rooms = deleteRoom(req.params.id)
    return res.json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete room photo.'
    const status = /not found|at least one/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

roomsRouter.post('/reset', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const rooms = resetRooms()
    return res.json({ success: true, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset rooms.'
    return res.status(500).json({ success: false, message })
  }
})
