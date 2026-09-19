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
import { uploadMenuDishImage } from '../services/restaurantMenuImages.js'

export const menuRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed.'))
      return
    }
    cb(null, true)
  },
})

function bearerFromRequest(req: Request): string {
  const authHeader =
    (typeof req.headers.authorization === 'string' && req.headers.authorization) ||
    (typeof req.headers['x-access-token'] === 'string' && req.headers['x-access-token']) ||
    ''
  if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }
  if (authHeader.trim()) return authHeader.trim()

  // Multipart uploads: token may arrive in the form body (Vite proxy often drops Authorization).
  const body = req.body as { access_token?: unknown } | undefined
  if (typeof body?.access_token === 'string' && body.access_token.trim()) {
    return body.access_token.trim()
  }
  return ''
}

async function requireApprovedAdmin(req: Request, res: Response): Promise<string | null> {
  if (!isServiceRoleConfigured()) {
    res.status(500).json({ success: false, message: 'Backend service_role key is not configured.' })
    return null
  }

  const token = bearerFromRequest(req)
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Missing admin session. Sign out and sign in again, then retry.',
    })
    return null
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !authData.user) {
    res.status(401).json({
      success: false,
      message:
        authError?.message === 'invalid claim: missing sub'
          ? 'Invalid admin session. Sign out and sign in again.'
          : authError?.message || 'Invalid admin session. Sign out and sign in again.',
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

menuRouter.post('/upload', (req, res) => {
  // Parse multipart FIRST so the proxy/body is not held during auth (avoids ERR_CONNECTION_RESET).
  upload.single('image')(req, res, (err: unknown) => {
    void (async () => {
      try {
        if (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Could not upload image.'
          res.status(400).json({ success: false, message })
          return
        }
        if (!(await requireApprovedAdmin(req, res))) return
        if (!req.file) {
          res.status(400).json({ success: false, message: 'Please choose an image to upload.' })
          return
        }
        const url = await uploadMenuDishImage(req.file)
        res.status(201).json({ success: true, url })
      } catch (uploadErr) {
        const message =
          uploadErr instanceof Error ? uploadErr.message : 'Could not upload image.'
        console.error('[menu upload]', message)
        if (!res.headersSent) {
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      }
    })()
  })
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
