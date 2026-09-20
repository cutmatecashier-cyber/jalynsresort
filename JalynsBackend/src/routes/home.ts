import multer from 'multer'
import { Router } from 'express'
import { requireApprovedAdmin } from '../lib/requireAdmin.js'
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
import { SITE_BUCKETS, uploadPublicImage } from '../services/cloudUpload.js'

export const homeRouter = Router()

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

const adminMsg = 'Only approved admins can edit the home background.'


homeRouter.get('/hero', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const slides = await listHomeHeroSlides()
    return res.json({ success: true, slides })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load home hero slides.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.post('/hero/upload', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, adminMsg))) return

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

        try {
          const url = await uploadPublicImage({
            bucket: SITE_BUCKETS.home,
            folder: `hero/${index}`,
            file: req.file,
            stableName: 'current',
            upsert: true,
          })
          const slides = await updateHomeHeroSlide(index, { image: url })
          res.json({ success: true, url, slides })
        } catch (inner) {
          const message = inner instanceof Error ? inner.message : 'Could not upload home background.'
          const status = /bucket|storage|Please choose|Only JPG|sync/i.test(message) ? 400 : 500
          res.status(status).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload home background.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.put('/hero/:index', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, adminMsg))) return
    const index = Number(req.params.index)
    const image = typeof req.body?.image === 'string' ? req.body.image : undefined
    const alt = typeof req.body?.alt === 'string' ? req.body.alt : undefined
    if (!image && !alt) {
      return res.status(400).json({ success: false, message: 'Provide an image URL and/or alt text.' })
    }
    const slides = await updateHomeHeroSlide(index, { image, alt })
    return res.json({ success: true, slides })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update slide.'
    const status = /Invalid slide/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

homeRouter.post('/hero/:index/reset', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, adminMsg))) return
    const index = Number(req.params.index)
    const slides = await resetHomeHeroSlide(index)
    return res.json({ success: true, slides })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset slide.'
    const status = /Invalid slide/i.test(message) ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

homeRouter.post('/hero/reset-all', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, adminMsg))) return
    const slides = await resetAllHomeHeroSlides()
    return res.json({ success: true, slides })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset backgrounds.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.get('/sections', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const sections = await listHomeSections()
    return res.json({ success: true, sections })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load section backgrounds.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.get('/sections/:key', async (req, res) => {
  try {
    const key = req.params.key
    if (!isHomeSectionKey(key)) {
      return res.status(400).json({ success: false, message: 'Unknown section key.' })
    }
    res.setHeader('Cache-Control', 'no-store')
    return res.json({
      success: true,
      url: await getHomeSection(key),
      sections: await listHomeSections(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load section background.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.post('/sections/:key/upload', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, adminMsg))) return
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
        try {
          const url = await uploadPublicImage({
            bucket: SITE_BUCKETS.home,
            folder: `sections/${key}`,
            file: req.file,
            stableName: 'current',
            upsert: true,
          })
          const sections = await updateHomeSection(key, url)
          res.json({ success: true, url, sections })
        } catch (inner) {
          const message =
            inner instanceof Error ? inner.message : 'Could not upload section background.'
          const status = /bucket|storage|Please choose|Only JPG|sync/i.test(message) ? 400 : 500
          res.status(status).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload section background.'
    return res.status(500).json({ success: false, message })
  }
})

homeRouter.post('/sections/:key/reset', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, adminMsg))) return
    const key = req.params.key
    if (!isHomeSectionKey(key)) {
      return res.status(400).json({ success: false, message: 'Unknown section key.' })
    }
    const sections = await resetHomeSection(key)
    return res.json({ success: true, url: sections[key], sections })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset section background.'
    return res.status(500).json({ success: false, message })
  }
})
