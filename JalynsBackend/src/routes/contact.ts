import { Router, type Request, type Response } from 'express'
import { createHeroMediaUpload, createImageUpload, formatUploadError } from '../lib/imageUpload.js'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import { sendAppEmail } from '../config/mail.js'
import {
  getContactContentBackground,
  getContactHeroBackground,
  removeContactContentBackground,
  removeContactHeroBackground,
  uploadContactContentBackground,
  uploadContactHeroBackground,
} from '../services/contactBackgrounds.js'
import {
  ContactSettingsValidationError,
  loadContactSettings,
  normalizeFacebookUrl,
  normalizeMapsUrl,
  normalizeMessengerUrl,
  normalizeOptionalUrl,
  normalizeWhatsAppUrl,
  saveContactSettings,
} from '../services/contactSettings.js'

export const contactRouter = Router()

const upload = createImageUpload({ files: 1 })
const heroUpload = createHeroMediaUpload()

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
    res.status(403).json({ success: false, message: 'Only approved admins can edit contact info.' })
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

contactRouter.get('/settings', async (_req, res) => {
  try {
    const settings = await loadContactSettings()
    return res.json({ success: true, settings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load contact settings.'
    const hint =
      /relation .* does not exist|Could not find the table/i.test(message)
        ? ' Run supabase/RESORT_CONTACT_SETTINGS.sql in the Supabase SQL Editor.'
        : ''
    return res.status(500).json({ success: false, message: `${message}${hint}` })
  }
})

contactRouter.put('/settings', async (req, res) => {
  try {
    if (!isServiceRoleConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Backend service_role key is not configured.',
      })
    }

    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing admin session.' })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData.user) {
      return res.status(401).json({
        success: false,
        message: authError?.message || 'Invalid admin session.',
      })
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, approval_status')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError) {
      return res.status(500).json({
        success: false,
        message: `Could not verify admin profile: ${profileError.message}`,
      })
    }

    if (
      !adminProfile ||
      adminProfile.role !== 'admin' ||
      adminProfile.approval_status !== 'approved'
    ) {
      return res.status(403).json({ success: false, message: 'Only approved admins can edit contact info.' })
    }

    const contact_email = String(req.body.contact_email ?? '').trim()
    const rawPhone = String(req.body.phone ?? '').trim()
    const address = String(req.body.address ?? '').trim()

    if (!address) {
      return res.status(400).json({ success: false, message: 'Location is required.' })
    }
    if (address.length > 300) {
      return res.status(400).json({ success: false, message: 'Location must be 300 characters or fewer.' })
    }
    if (!contact_email || !rawPhone) {
      return res.status(400).json({ success: false, message: 'Email and phone are required.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid contact email.' })
    }

    const phoneDigits = rawPhone.replace(/\D/g, '')
    let normalizedPhone = ''
    if (/^63\d{10}$/.test(phoneDigits)) {
      normalizedPhone = `+${phoneDigits}`
    } else if (/^\d{10}$/.test(phoneDigits)) {
      normalizedPhone = `+63${phoneDigits}`
    } else if (/^0\d{10}$/.test(phoneDigits)) {
      normalizedPhone = `+63${phoneDigits.slice(1)}`
    }
    if (!/^\+63\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be a Philippine mobile number: +63 followed by exactly 10 digits.',
      })
    }

    const facebook_url = normalizeFacebookUrl(String(req.body.facebook_url ?? ''))
    const maps_url = normalizeMapsUrl(String(req.body.maps_url ?? ''), address)
    const messenger_url = normalizeMessengerUrl(String(req.body.messenger_url ?? ''))
    const twitter_url = normalizeOptionalUrl(String(req.body.twitter_url ?? ''), 'X (Twitter) URL')
    const pinterest_url = normalizeOptionalUrl(String(req.body.pinterest_url ?? ''), 'Pinterest URL')
    const whatsapp_url = normalizeWhatsAppUrl(String(req.body.whatsapp_url ?? ''))

    const settings = await saveContactSettings(
      {
        contact_email,
        phone: normalizedPhone,
        facebook_url,
        address,
        maps_url,
        messenger_url,
        twitter_url,
        pinterest_url,
        whatsapp_url,
      },
      authData.user.id,
    )

    return res.json({ success: true, message: 'Contact details saved.', settings })
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not update contact settings.'
    const status = err instanceof ContactSettingsValidationError ? 400 : 500
    return res.status(status).json({ success: false, message })
  }
})

contactRouter.post('/message', async (req, res) => {
  try {
    const name = String(req.body.name ?? '').trim()
    const email = String(req.body.email ?? '').trim()
    const message = String(req.body.message ?? '').trim()

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' })
    }

    const settings = await loadContactSettings()
    const to = settings.contact_email || process.env.SMTP_FROM || process.env.SMTP_USER
    if (!to) {
      return res.status(500).json({ success: false, message: 'Resort contact email is not configured.' })
    }

    await sendAppEmail({
      to,
      subject: `Contact form — ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0c1210">
          <h2 style="margin:0 0 12px">New contact message</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        </div>
      `,
    })

    return res.json({ success: true, message: 'Your message has been sent. Thank you!' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send message.'
    return res.status(500).json({ success: false, message })
  }
})

contactRouter.get('/hero', async (_req, res) => {
  try {
    const background = await getContactHeroBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load hero background.'
    return res.status(500).json({ success: false, message })
  }
})

contactRouter.post('/hero', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    heroUpload.single('image')(req, res, (err: unknown) => {
      void (async () => {
        if (err) {
          res.status(400).json({ success: false, message: formatUploadError(err, 'Could not upload hero background.') })
          return
        }
        if (!req.file) {
          res.status(400).json({ success: false, message: 'Please choose an image or an MP4 video.' })
          return
        }
        try {
          const background = await uploadContactHeroBackground(req.file)
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

contactRouter.delete('/hero', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await removeContactHeroBackground()
    return res.json({ success: true, message: 'Hero background removed.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove hero background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

contactRouter.get('/content-background', async (_req, res) => {
  try {
    const background = await getContactContentBackground()
    return res.json({ success: true, background })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load content background.'
    return res.status(500).json({ success: false, message })
  }
})

contactRouter.post('/content-background', async (req, res) => {
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
          const background = await uploadContactContentBackground(req.file)
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

contactRouter.delete('/content-background', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res))) return
    await removeContactContentBackground()
    return res.json({ success: true, message: 'Content background removed.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove content background.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
