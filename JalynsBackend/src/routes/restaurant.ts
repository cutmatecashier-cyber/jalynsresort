import multer from 'multer'
import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  getRestaurantContentBackground,
  getRestaurantHeroBackground,
  removeRestaurantContentBackground,
  removeRestaurantHeroBackground,
  uploadRestaurantContentBackground,
  uploadRestaurantHeroBackground,
} from '../services/restaurantBackgrounds.js'

export const restaurantRouter = Router()

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
      message: 'Only approved admins can edit restaurant page images.',
    })
    return null
  }

  return authData.user.id
}

function clientErrorStatus(message: string) {
  return /must be|required|valid|not found|at least|Only JPG|File too large|image|Invalid|bucket is missing/i.test(
    message,
  )
    ? 400
    : 500
}

restaurantRouter.get('/hero', async (_req, res) => {
  try {
    const background = await getRestaurantHeroBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load hero background.'
    return res.status(500).json({ success: false, message })
  }
})

restaurantRouter.post('/hero', async (req, res) => {
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
          const background = await uploadRestaurantHeroBackground(req.file)
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
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

restaurantRouter.delete('/hero', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await removeRestaurantHeroBackground()
    return res.json({ success: true, message: 'Hero background removed.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove hero background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

restaurantRouter.get('/content-background', async (_req, res) => {
  try {
    const background = await getRestaurantContentBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load content background.'
    return res.status(500).json({ success: false, message })
  }
})

restaurantRouter.post('/content-background', async (req, res) => {
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
          const background = await uploadRestaurantContentBackground(req.file)
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
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

restaurantRouter.delete('/content-background', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await removeRestaurantContentBackground()
    return res.json({ success: true, message: 'Content background removed.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove content background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
