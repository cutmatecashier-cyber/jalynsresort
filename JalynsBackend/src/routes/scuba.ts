import { Router } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'

export const scubaRouter = Router()

scubaRouter.get('/status', async (_req, res) => {
  if (!isServiceRoleConfigured()) {
    return res.json({ success: true, tablesReady: false, message: 'Service role not configured.' })
  }

  const { error: ratesError } = await supabaseAdmin.from('diving_rates').select('id').limit(1)
  const { error: coursesError } = await supabaseAdmin.from('padi_scuba_courses').select('id').limit(1)
  const missing =
    Boolean(ratesError && /could not find the table|PGRST205|schema cache/i.test(ratesError.message)) ||
    Boolean(coursesError && /could not find the table|PGRST205|schema cache/i.test(coursesError.message))

  return res.json({
    success: true,
    tablesReady: !missing,
    ratesError: ratesError?.message ?? null,
    coursesError: coursesError?.message ?? null,
  })
})
