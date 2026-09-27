import { supabaseAdmin } from '../config/supabase.js'

const readyCache = new Map<string, true>()

export function isMissingRelation(message: string) {
  return /Could not find the table|Could not find the '.*' column|relation .* does not exist|column .* does not exist|PGRST205|schema cache/i.test(
    message,
  )
}

/** True once this table/column can be queried. A miss is retried so a new SQL script is picked up without a restart. */
export async function relationReady(table: string, probe = 'id'): Promise<boolean> {
  const cacheKey = `${table}.${probe}`
  if (readyCache.get(cacheKey)) return true
  const { error } = await supabaseAdmin.from(table).select(probe).limit(1)
  if (!error) {
    readyCache.set(cacheKey, true)
    return true
  }
  if (isMissingRelation(error.message || '')) return false
  throw new Error(error.message)
}

export async function alreadyImported(key: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('site_data_imports')
    .select('key')
    .eq('key', key)
    .maybeSingle()
  if (error) {
    if (isMissingRelation(error.message || '')) return false
    throw new Error(error.message)
  }
  return Boolean(data)
}

export async function markImported(key: string) {
  const { error } = await supabaseAdmin.from('site_data_imports').upsert({
    key,
    imported_at: new Date().toISOString(),
  })
  if (error && !isMissingRelation(error.message || '')) {
    throw new Error(error.message)
  }
}
