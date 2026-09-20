import { Router } from 'express'
import { getContentRevision } from '../services/contentRevision.js'

export const contentRouter = Router()

contentRouter.get('/revision', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ success: true, ...(await getContentRevision()) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read content revision.'
    return res.status(500).json({ success: false, message })
  }
})
