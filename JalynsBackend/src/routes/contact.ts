import { Router } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import { sendAppEmail } from '../config/mail.js'
import {
  loadContactSettings,
  normalizeFacebookUrl,
  saveContactSettings,
} from '../services/contactSettings.js'

export const contactRouter = Router()

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
    const phone = String(req.body.phone ?? '').trim()
    const facebook_url = normalizeFacebookUrl(String(req.body.facebook_url ?? ''))

    if (!contact_email || !phone || !facebook_url) {
      return res.status(400).json({ success: false, message: 'Email, phone, and Facebook URL are required.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid contact email.' })
    }
    try {
      new URL(facebook_url)
    } catch {
      return res.status(400).json({ success: false, message: 'Enter a valid Facebook URL.' })
    }

    const settings = await saveContactSettings(
      { contact_email, phone, facebook_url },
      authData.user.id,
    )

    return res.json({ success: true, settings })
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not update contact settings.'
    return res.status(500).json({ success: false, message })
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
