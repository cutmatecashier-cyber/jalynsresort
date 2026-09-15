import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  getHomeSection,
  isHomeSectionKey,
  listHomeHeroSlides,
  listHomeSections,
  resetAllHomeHeroSlides,
  resetHomeHeroSlide,
  resetHomeSection,
  updateHomeHeroSlide,
  updateHomeSection,
} from '../services/homeHero.js'

export const homeRouter = Router()

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/home')
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
      message: 'Only approved admins can edit the home background.',
    })
    return null
  }

  return authData.user.id
}

homeRouter.get('/hero', (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const slides = listHomeHeroSlides()
    return res.json({ success: true, slides })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load home hero slides.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.post('/hero/upload', async (req, res) => {
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

        const index = Number(req.body?.index)
        if (!Number.isInteger(index) || index < 0 || index > 3) {
          res.status(400).json({ success: false, message: 'Slide index must be 0–3.' })
          return
        }

        const url = `/uploads/home/${req.file.filename}`
        const slides = updateHomeHeroSlide(index, { image: url })
        res.json({ success: true, url, slides })
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload home background.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.put('/hero/:index', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const index = Number(req.params.index)
    const image = typeof req.body?.image === 'string' ? req.body.image : undefined
    const alt = typeof req.body?.alt === 'string' ? req.body.alt : undefined
    if (!image && !alt) {
      return res.status(400).json({ success: false, message: 'Provide an image URL and/or alt text.' })
    }
    const slides = updateHomeHeroSlide(index, { image, alt })
    return res.json({ success: true, slides })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update slide.'
    const status = /Invalid slide/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

homeRouter.post('/hero/:index/reset', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const index = Number(req.params.index)
    const slides = resetHomeHeroSlide(index)
    return res.json({ success: true, slides })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset slide.'
    const status = /Invalid slide/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

homeRouter.post('/hero/reset-all', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const slides = resetAllHomeHeroSlides()
    return res.json({ success: true, slides })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset backgrounds.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.get('/sections', (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const sections = listHomeSections()
    return res.json({ success: true, sections })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load section backgrounds.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.get('/sections/:key', (req, res) => {
  try {
    const key = req.params.key
    if (!isHomeSectionKey(key)) {
      return res.status(400).json({ success: false, message: 'Unknown section key.' })
    }
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ success: true, url: getHomeSection(key), sections: listHomeSections() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load section background.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.post('/sections/:key/upload', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const key = req.params.key
    if (!isHomeSectionKey(key)) {
      return res.status(400).json({ success: false, message: 'Unknown section key.' })
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
        const url = `/uploads/home/${req.file.filename}`
        const sections = updateHomeSection(key, url)
        res.json({ success: true, url, sections })
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload section background.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.post('/sections/:key/reset', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const key = req.params.key
    if (!isHomeSectionKey(key)) {
      return res.status(400).json({ success: false, message: 'Unknown section key.' })
    }
    const sections = resetHomeSection(key)
    return res.json({ success: true, url: sections[key], sections })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset section background.'
    return res.status(500).json({ success: false, message })
  }
})
