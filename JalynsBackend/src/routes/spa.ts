import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  listSpa,
  updateCategory,
  updateService,
} from '../services/spa.js'

export const spaRouter = Router()

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/spa')
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
      message: 'Only approved admins can manage spa treatments.',
    })
    return null
  }

  return authData.user.id
}

function clientErrorStatus(message: string) {
  return /must be|required|valid|not found|at least|Only JPG|File too large|image|Rate/i.test(message)
    ? 400
    : 500
}

spaRouter.get('/', async (_req, res) => {
  try {
    const categories = await listSpa()
    return res.json({ success: true, categories })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load spa treatments.'
    const hint =
      /relation .* does not exist|Could not find the table/i.test(message)
        ? ' Run supabase/SPA_TREATMENTS.sql in the Supabase SQL Editor.'
        : ''
    return res.status(500).json({ success: false, message: `${message}${hint}` })
  }
})

spaRouter.post('/upload', async (req, res) => {
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
        const url = `/uploads/spa/${req.file.filename}`
        res.status(201).json({ success: true, url })
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload image.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

spaRouter.post('/categories', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const category = await createCategory(req.body)
    return res.status(201).json({ success: true, category })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

spaRouter.put('/categories/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const category = await updateCategory(String(req.params.id), req.body)
    return res.json({ success: true, category })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

spaRouter.delete('/categories/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await deleteCategory(String(req.params.id))
    return res.json({ success: true, message: 'Category deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

spaRouter.post('/services', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const service = await createService(req.body)
    return res.status(201).json({ success: true, service })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create service.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

spaRouter.put('/services/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const service = await updateService(String(req.params.id), req.body)
    return res.json({ success: true, service })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update service.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

spaRouter.delete('/services/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await deleteService(String(req.params.id))
    return res.json({ success: true, message: 'Service deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete service.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
