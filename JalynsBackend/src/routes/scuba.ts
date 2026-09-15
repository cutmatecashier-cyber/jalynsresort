import multer from 'multer'
import { Router, type Request, type Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import {
  createDivingRate,
  createPadiCourse,
  deleteDivingRate,
  deleteGalleryImage,
  deletePadiCourse,
  getContentBackground,
  getHeroBackground,
  getPageSettings,
  getScubaPage,
  listDivingRates,
  listGallery,
  listPadiCourses,
  removeContentBackground,
  removeHeroBackground,
  replaceGalleryImage,
  savePageSettings,
  updateDivingRate,
  updatePadiCourse,
  uploadContentBackground,
  uploadGalleryImages,
  uploadHeroBackground,
} from '../services/scuba.js'

export const scubaRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 24 },
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
      message: 'Only approved admins can manage scuba diving content.',
    })
    return null
  }

  return authData.user.id
}

function clientErrorStatus(message: string) {
  return /must be|required|valid|not found|at least|Only JPG|File too large|image|Invalid/i.test(
    message,
  )
    ? 400
    : 500
}

function tableHint(message: string) {
  return /relation .* does not exist|Could not find the table|Scuba tables are missing/i.test(message)
    ? ' Run supabase/SCUBA_DIVING.sql in the Supabase SQL Editor.'
    : ''
}

scubaRouter.get('/status', async (_req, res) => {
  if (!isServiceRoleConfigured()) {
    return res.json({ success: true, tablesReady: false, message: 'Service role not configured.' })
  }

  const { error: ratesError } = await supabaseAdmin.from('diving_rates').select('id').limit(1)
  const { error: coursesError } = await supabaseAdmin.from('padi_scuba_courses').select('id').limit(1)
  const missing =
    Boolean(
      ratesError && /could not find the table|PGRST205|schema cache/i.test(ratesError.message),
    ) ||
    Boolean(
      coursesError && /could not find the table|PGRST205|schema cache/i.test(coursesError.message),
    )

  return res.json({
    success: true,
    tablesReady: !missing,
    ratesError: ratesError?.message ?? null,
    coursesError: coursesError?.message ?? null,
  })
})

scubaRouter.get('/page', async (_req, res) => {
  try {
    const page = await getScubaPage()
    return res.json({ success: true, ...page })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load scuba page.'
    return res.status(500).json({ success: false, message: `${message}${tableHint(message)}` })
  }
})

scubaRouter.get('/rates', async (_req, res) => {
  try {
    const rates = await listDivingRates()
    return res.json({ success: true, rates })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load diving rates.'
    return res.status(500).json({ success: false, message: `${message}${tableHint(message)}` })
  }
})

scubaRouter.post('/rates', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const rate = await createDivingRate(req.body)
    return res.status(201).json({ success: true, rate })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add service.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.put('/rates/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const rate = await updateDivingRate(Number(req.params.id), req.body)
    return res.json({ success: true, rate })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update service.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.delete('/rates/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await deleteDivingRate(Number(req.params.id))
    return res.json({ success: true, message: 'Service deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete service.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.get('/courses', async (_req, res) => {
  try {
    const courses = await listPadiCourses()
    return res.json({ success: true, courses })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load PADI courses.'
    return res.status(500).json({ success: false, message: `${message}${tableHint(message)}` })
  }
})

scubaRouter.post('/courses', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const course = await createPadiCourse(req.body)
    return res.status(201).json({ success: true, course })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add course.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.put('/courses/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const course = await updatePadiCourse(Number(req.params.id), req.body)
    return res.json({ success: true, course })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update course.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.delete('/courses/:id', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await deletePadiCourse(Number(req.params.id))
    return res.json({ success: true, message: 'Course deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete course.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.get('/settings', async (_req, res) => {
  try {
    const settings = await getPageSettings()
    return res.json({ success: true, settings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load settings.'
    return res.status(500).json({ success: false, message })
  }
})

scubaRouter.put('/settings', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const settings = await savePageSettings(req.body)
    return res.json({ success: true, settings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save settings.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.get('/hero', async (_req, res) => {
  try {
    const background = await getHeroBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load hero background.'
    return res.status(500).json({ success: false, message })
  }
})

scubaRouter.post('/hero', async (req, res) => {
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
          const background = await uploadHeroBackground(req.file)
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

scubaRouter.delete('/hero', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await removeHeroBackground()
    return res.json({ success: true, message: 'Hero background removed.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove hero background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.get('/content-background', async (_req, res) => {
  try {
    const background = await getContentBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load content background.'
    return res.status(500).json({ success: false, message })
  }
})

scubaRouter.post('/content-background', async (req, res) => {
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
          const background = await uploadContentBackground(req.file)
          res.status(201).json({ success: true, ...background })
        } catch (uploadErr) {
          const message =
            uploadErr instanceof Error ? uploadErr.message : 'Could not upload content background.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload content background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.delete('/content-background', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await removeContentBackground()
    return res.json({ success: true, message: 'Content background removed.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove content background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.get('/gallery', async (_req, res) => {
  try {
    const images = await listGallery()
    return res.json({ success: true, images })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load gallery.'
    return res.status(500).json({ success: false, message })
  }
})

scubaRouter.post('/gallery', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    upload.array('images', 24)(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Could not upload images.'
          res.status(400).json({ success: false, message })
          return
        }
        const files = Array.isArray(req.files) ? req.files : []
        try {
          const images = await uploadGalleryImages(files)
          res.status(201).json({ success: true, images })
        } catch (uploadErr) {
          const message =
            uploadErr instanceof Error ? uploadErr.message : 'Could not upload gallery images.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not upload gallery images.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.put('/gallery', async (req, res) => {
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
        const path = String(req.body?.path ?? '').trim()
        try {
          const image = await replaceGalleryImage(path, req.file)
          res.json({ success: true, image })
        } catch (uploadErr) {
          const message =
            uploadErr instanceof Error ? uploadErr.message : 'Could not replace gallery image.'
          res.status(clientErrorStatus(message)).json({ success: false, message })
        }
      })()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not replace gallery image.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

scubaRouter.delete('/gallery', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    const path = String(req.query.path ?? req.body?.path ?? '').trim()
    await deleteGalleryImage(path)
    return res.json({ success: true, message: 'Gallery image deleted.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete gallery image.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
