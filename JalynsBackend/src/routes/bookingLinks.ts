import { Router } from 'express'
import { requireApprovedAdmin } from '../lib/requireAdmin.js'
import { listBookingLinks, publicBookingLinks, saveBookingLinks } from '../services/bookingLinks.js'

export const bookingLinksRouter = Router()

const adminMsg = 'Only approved admins can edit booking links.'

function clientErrorStatus(message: string) {
  return /must|needs|Add |too long|up to|https:\/\//i.test(message) ? 400 : 500
}

bookingLinksRouter.get('/', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const links = publicBookingLinks(await listBookingLinks())
    return res.json({ success: true, links })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load booking links.'
    return res.status(500).json({ success: false, message })
  }
})

bookingLinksRouter.get('/manage', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, adminMsg))) return
    res.setHeader('Cache-Control', 'no-store')
    const links = await listBookingLinks()
    return res.json({ success: true, links })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load booking links.'
    return res.status(500).json({ success: false, message })
  }
})

bookingLinksRouter.put('/', async (req, res) => {
  try {
    if (!(await requireApprovedAdmin(req, res, adminMsg))) return
    const links = await saveBookingLinks(req.body?.links)
    return res.json({ success: true, links, publicLinks: publicBookingLinks(links) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save booking links.'
    return res.status(clientErrorStatus(message)).json({ success: false, message })
  }
})
