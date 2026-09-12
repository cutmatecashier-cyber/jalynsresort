import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = readServiceRoleKey()

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Server-only Supabase client (service role).
 * Never import this file into the frontend.
 */
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export function isServiceRoleConfigured() {
  const key = readServiceRoleKey()
  return Boolean(
    key &&
      !key.includes('REPLACE_WITH') &&
      !key.startsWith('sb_publishable_') &&
      key !== 'your-service-role-secret-key' &&
      (key.startsWith('eyJ') || key.startsWith('sb_secret_')),
  )
}
