import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import sharp from 'sharp'
import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  createNewsPost,
  deleteNewsPost,
  getNewsPost,
  listNews,
  updateNewsPost,
} from '../services/news.js'

export const newsRouter = Router()

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/news')
mkdirSync(uploadsRoot, { recursive: true })

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed.'))
      return
    }
    cb(null, true)
  },
  limits: { fileSize: 12 * 1024 * 1024 },
})

async function saveOptimizedNewsImage(file: Express.Multer.File) {
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.jpg`
  const dest = path.join(uploadsRoot, filename)
  await sharp(file.buffer)
    .rotate()
    .resize({ width: 1200, height: 900, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(dest)
  return `/uploads/news/${filename}`
}

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
      message: 'Only approved admins can manage news posts.',
    })
    return null
  }

  return authData.user.id
}

function clientErrorStatus(message: string) {
  return /must be|required|valid|not found|at least|Only JPG|up to|Image/i.test(message)
    ? 400
    : 500
}

newsRouter.get('/', (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ success: true, posts: listNews() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load news.'
    return res.status(500).json({ success: false, message })
  }
})

newsRouter.get('/:id', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const post = getNewsPost(String(req.params.id))
    if (!post) {
      return res.status(404).json({ success: false, message: 'News post not found.' })
    }
    return res.json({ success: true, post })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load news post.'
    return res.status(500).json({ success: false, message })
  }
})

newsRouter.post('/upload', async (req, res) => {
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
        try {
          const url = await saveOptimizedNewsImage(req.file)
          res.status(201).json({ success: true, url })
        } catch (processErr) {
          const message =
            processErr instanceof Error ? processErr.message : 'Could not process image.'
          res.status(400).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload image.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

newsRouter.post('/', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const posts = createNewsPost(req.body)
    return res.status(201).json({ success: true, posts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create news post.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

newsRouter.put('/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const posts = updateNewsPost(String(req.params.id), req.body)
    return res.json({ success: true, posts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update news post.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

newsRouter.delete('/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const posts = deleteNewsPost(String(req.params.id))
    return res.json({ success: true, posts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete news post.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
