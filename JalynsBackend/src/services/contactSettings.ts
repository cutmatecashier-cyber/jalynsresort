import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabaseAdmin } from '../config/supabase.js'

export type ContactSettings = {
  contact_email: string
  phone: string
  facebook_url: string
  updated_at?: string
}

const DEFAULT_SETTINGS: ContactSettings = {
  contact_email: 'jalynsresort@gmail.com',
  phone: '+63 947 619 7535',
  facebook_url: 'https://www.facebook.com/jalynsresortpuertogalera',
}

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const fallbackFile = path.join(dataDir, 'resort-contact-settings.json')

function formatDbError(error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return 'Unknown database error'
  return [error.message, error.code, error.details, error.hint].filter(Boolean).join(' | ')
}

function isMissingTableError(message: string) {
  return /Could not find the table|relation .* does not exist|PGRST205/i.test(message)
}

async function readFallback(): Promise<ContactSettings> {
  try {
    const raw = await readFile(fallbackFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<ContactSettings>
    return {
      contact_email: String(parsed.contact_email || DEFAULT_SETTINGS.contact_email),
      phone: String(parsed.phone || DEFAULT_SETTINGS.phone),
      facebook_url: String(parsed.facebook_url || DEFAULT_SETTINGS.facebook_url),
      updated_at: parsed.updated_at,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

async function writeFallback(settings: ContactSettings) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(fallbackFile, JSON.stringify(settings, null, 2), 'utf8')
}

/** Load settings from Supabase; fall back to local file if the table is not created yet. */
export async function loadContactSettings(): Promise<ContactSettings> {
  const { data, error } = await supabaseAdmin
    .from('resort_contact_settings')
    .select('contact_email, phone, facebook_url, updated_at')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    const detail = formatDbError(error)
    if (isMissingTableError(detail)) {
      return readFallback()
    }
    throw new Error(detail)
  }

  if (!data) {
    // Table exists but row missing — seed from local fallback (if any), else defaults
    const fromFile = await readFallback()
    const seeded = {
      id: 1,
      contact_email: fromFile.contact_email,
      phone: fromFile.phone,
      facebook_url: fromFile.facebook_url,
      updated_at: new Date().toISOString(),
    }
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('resort_contact_settings')
      .upsert(seeded, { onConflict: 'id' })
      .select('contact_email, phone, facebook_url, updated_at')
      .maybeSingle()

    if (insertError) {
      const detail = formatDbError(insertError)
      if (isMissingTableError(detail)) return fromFile
      throw new Error(detail)
    }

    return inserted ?? fromFile
  }

  return data
}

/** Save settings to Supabase (preferred). Falls back to local file if the table is missing. */
export async function saveContactSettings(
  input: Omit<ContactSettings, 'updated_at'>,
  updatedBy: string | null,
): Promise<ContactSettings> {
  const payload = {
    id: 1,
    contact_email: input.contact_email,
    phone: input.phone,
    facebook_url: input.facebook_url,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  }

  const { data, error } = await supabaseAdmin
    .from('resort_contact_settings')
    .upsert(payload, { onConflict: 'id' })
    .select('contact_email, phone, facebook_url, updated_at')
    .maybeSingle()

  if (error) {
    const detail = formatDbError(error)
    if (isMissingTableError(detail)) {
      const fallback: ContactSettings = {
        contact_email: input.contact_email,
        phone: input.phone,
        facebook_url: input.facebook_url,
        updated_at: payload.updated_at,
      }
      await writeFallback(fallback)
      return fallback
    }
    throw new Error(detail || 'Could not update contact settings.')
  }

  if (!data) {
    throw new Error('Contact settings were not saved. Confirm the resort_contact_settings row exists.')
  }

  // Keep file in sync when DB succeeds (harmless backup)
  await writeFallback(data).catch(() => undefined)
  return data
}

export function normalizeFacebookUrl(raw: string) {
  const value = raw.trim()
  if (!value) return value
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}
