import multer from 'multer'
import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  createNewsPost,
  deleteNewsPost,
  getNewsPost,
  listNews,
  updateNewsPost,
} from '../services/news.js'
import {
  getNewsHeroBackground,
  removeNewsHeroBackground,
  uploadNewsHeroBackground,
} from '../services/newsBackgrounds.js'
import { uploadNewsImage } from '../services/newsImages.js'

export const newsRouter = Router()

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

newsRouter.get('/', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ success: true, posts: await listNews() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load news.'
    return res.status(500).json({ success: false, message })
  }
})

newsRouter.get('/hero', async (_req, res) => {
  try {
    const background = await getNewsHeroBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load hero background.'
    return res.status(500).json({ success: false, message })
  }
})

newsRouter.post('/hero', async (req, res) => {
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
          const background = await uploadNewsHeroBackground(req.file)
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

newsRouter.delete('/hero', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await removeNewsHeroBackground()
    return res.json({ success: true, message: 'Hero background removed.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove hero background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

newsRouter.get('/:id', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const post = await getNewsPost(String(req.params.id))
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
          const url = await uploadNewsImage(req.file)
          res.status(201).json({ success: true, url })
        } catch (processErr) {
          const message =
            processErr instanceof Error ? processErr.message : 'Could not process image.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
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
    const posts = await createNewsPost(req.body)
    return res.status(201).json({ success: true, posts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create news post.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

newsRouter.put('/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const posts = await updateNewsPost(String(req.params.id), req.body)
    return res.json({ success: true, posts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update news post.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

newsRouter.delete('/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const posts = await deleteNewsPost(String(req.params.id))
    return res.json({ success: true, posts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete news post.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
