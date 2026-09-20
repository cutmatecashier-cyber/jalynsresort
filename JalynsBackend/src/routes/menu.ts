import multer from 'multer'
import { Router } from 'express'
import { requireApprovedAdmin } from '../lib/requireAdmin.js'
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

const MENU_ADMIN_MESSAGE = 'Only approved admins can manage the restaurant menu.'

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
        if (!(await requireApprovedAdmin(req, res, MENU_ADMIN_MESSAGE))) return
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
    if (!(await requireApprovedAdmin(req, res, MENU_ADMIN_MESSAGE))) return
    const category = await createCategory(req.body)
    return res.status(201).json({ success: true, category })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.put('/categories/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, MENU_ADMIN_MESSAGE))) return
    const category = await updateCategory(String(req.params.id), req.body)
    return res.json({ success: true, category })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.delete('/categories/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, MENU_ADMIN_MESSAGE))) return
    await deleteCategory(String(req.params.id))
    return res.json({ success: true, message: 'Category deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete category.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.post('/items', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, MENU_ADMIN_MESSAGE))) return
    const item = await createItem(req.body)
    return res.status(201).json({ success: true, item })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create menu item.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.put('/items/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, MENU_ADMIN_MESSAGE))) return
    const item = await updateItem(String(req.params.id), req.body)
    return res.json({ success: true, item })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update menu item.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

menuRouter.delete('/items/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, MENU_ADMIN_MESSAGE))) return
    await deleteItem(String(req.params.id))
    return res.json({ success: true, message: 'Menu item deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete menu item.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
