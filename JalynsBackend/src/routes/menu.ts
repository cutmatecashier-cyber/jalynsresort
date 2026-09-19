import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  listMenu,
  updateCategory,
  updateItem,
} from '../services/restaurantMenu.js'

export const menuRouter = Router()

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/menu')
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
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
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
      message: 'Only approved admins can manage the restaurant menu.',
    })
    return null
  }

  return authData.user.id
}

function clientErrorStatus(message: string) {
  return /must be|required|valid|not found|at least|Only JPG|File too large|image/i.test(message)
    ? 400
    : 500
}

menuRouter.get('/', async (_req, res) => {
  try {
    const categories = await listMenu()
    return res.json({ success: true, categories })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load menu.'
    const hint =
      /relation .* does not exist|Could not find the table/i.test(message)
        ? ' Run supabase/RESTAURANT_MENU.sql in the Supabase SQL Editor.'
        : ''
    return res.status(500).json({ success: false, message: `${message}${hint}` })
  }
})

menuRouter.post('/upload', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return

    upload.single('image')(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Could not upload image.'
          res.status(400).json({ success: false, message })
          return
        }
        if (!req.file) {
          res.status(400).json({ success: false, message: 'Please choose an image to upload.' })
          return
        }
        const url = `/uploads/menu/${req.file.filename}`
        res.status(201).json({ success: true, url })
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload image.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.post('/categories', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const category = await createCategory(req.body)
    return res.status(201).json({ success: true, category })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.put('/categories/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const category = await updateCategory(String(req.params.id), req.body)
    return res.json({ success: true, category })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.delete('/categories/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await deleteCategory(String(req.params.id))
    return res.json({ success: true, message: 'Category deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.post('/items', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const item = await createItem(req.body)
    return res.status(201).json({ success: true, item })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create menu item.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.put('/items/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const item = await updateItem(String(req.params.id), req.body)
    return res.json({ success: true, item })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update menu item.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.delete('/items/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await deleteItem(String(req.params.id))
    return res.json({ success: true, message: 'Menu item deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete menu item.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
