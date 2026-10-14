import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabaseAdmin } from '../config/supabase.js'

export type ContactSettings = {
  contact_email: string
  phone: string
  facebook_url: string
  address: string
  maps_url: string
  messenger_url: string
  twitter_url: string
  pinterest_url: string
  whatsapp_url: string
  updated_at?: string
}

export class ContactSettingsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContactSettingsValidationError'
  }
}

const DEFAULT_SETTINGS: ContactSettings = {
  contact_email: 'jalynsresort@gmail.com',
  phone: '+639476197535',
  facebook_url: 'https://www.facebook.com/jalynsresortpuertogalera',
  address: 'Western Nautical Hwy, Puerto Galera',
  maps_url: "https://maps.google.com/?q=Jalyn's+Resort+Puerto+Galera",
  messenger_url: 'https://m.me/jalynsresortpuertogalera',
  twitter_url: 'https://twitter.com/intent/tweet?url=',
  pinterest_url: 'https://pinterest.com/pin/create/button/?url=',
  whatsapp_url: 'https://wa.me/639476197535',
}

const FULL_COLUMNS =
  'contact_email, phone, facebook_url, address, maps_url, messenger_url, twitter_url, pinterest_url, whatsapp_url, updated_at'
const BASE_COLUMNS = 'contact_email, phone, facebook_url, updated_at'

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const fallbackFile = path.join(dataDir, 'resort-contact-settings.json')

function formatDbError(error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return 'Unknown database error'
  return [error.message, error.code, error.details, error.hint].filter(Boolean).join(' | ')
}

function isMissingTableError(message: string) {
  return /Could not find the table|relation .* does not exist|PGRST205/i.test(message)
}

function isMissingColumnError(message: string) {
  return /schema cache|PGRST204|column .* does not exist/i.test(message)
}

function definedFields(row: Partial<ContactSettings> | null | undefined): Partial<ContactSettings> {
  if (!row) return {}
  const out: Partial<ContactSettings> = {}
  for (const [key, value] of Object.entries(row) as [keyof ContactSettings, ContactSettings[keyof ContactSettings]][]) {
    if (value !== undefined && value !== null) out[key] = value as never
  }
  return out
}

export function toContactSettings(
  ...layers: Array<Partial<ContactSettings> | null | undefined>
): ContactSettings {
  const merged = Object.assign({}, DEFAULT_SETTINGS, ...layers.map(definedFields))
  return {
    contact_email: String(merged.contact_email || DEFAULT_SETTINGS.contact_email),
    phone: String(merged.phone || DEFAULT_SETTINGS.phone),
    facebook_url: merged.facebook_url ?? DEFAULT_SETTINGS.facebook_url,
    address: String(merged.address || DEFAULT_SETTINGS.address),
    maps_url: merged.maps_url ?? DEFAULT_SETTINGS.maps_url,
    messenger_url: merged.messenger_url ?? DEFAULT_SETTINGS.messenger_url,
    twitter_url: merged.twitter_url ?? DEFAULT_SETTINGS.twitter_url,
    pinterest_url: merged.pinterest_url ?? DEFAULT_SETTINGS.pinterest_url,
    whatsapp_url: merged.whatsapp_url ?? DEFAULT_SETTINGS.whatsapp_url,
    updated_at: merged.updated_at,
  }
}

function assertHttpUrl(raw: string, label: string) {
  const value = raw.trim()
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(withProtocol)
  } catch {
    throw new ContactSettingsValidationError(`Enter a valid ${label}.`)
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname.includes('.')) {
    throw new ContactSettingsValidationError(`Enter a valid ${label}.`)
  }
  return withProtocol
}

export function normalizeOptionalUrl(raw: string, label: string) {
  const value = raw.trim()
  if (!value) return ''
  return assertHttpUrl(value, label)
}

export function normalizeFacebookUrl(raw: string) {
  const value = raw.trim()
  if (!value) return ''
  return assertHttpUrl(value, 'Facebook URL')
}

export function normalizeMapsUrl(raw: string, address: string) {
  const value = raw.trim()
  if (!value) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }
  return assertHttpUrl(value, 'Google Maps URL')
}

function messengerUsernameFromUrl(url: URL) {
  const host = url.hostname.replace(/^www\./i, '')
  const parts = url.pathname.split('/').filter(Boolean)
  if (host === 'm.me') return parts[0] || ''
  if (host === 'messenger.com') return parts[0] === 't' ? '' : parts[0] || ''
  if (host === 'facebook.com' || host === 'fb.com' || host === 'm.facebook.com') {
    const reserved = new Set([
      'sharer',
      'share',
      'pages',
      'profile.php',
      'people',
      'watch',
      'groups',
      'stories',
      'login',
      'messages',
      'dialog',
    ])
    const first = parts[0] || ''
    if (!first || reserved.has(first.toLowerCase())) return ''
    return first
  }
  return ''
}

/** Accept a Messenger URL or a Facebook Page username and store https://m.me/username when possible. */
export function normalizeMessengerUrl(raw: string) {
  const value = raw.trim()
  if (!value) return ''

  if (/^https?:\/\//i.test(value) || value.includes('.') || value.includes('/')) {
    const url = assertHttpUrl(value, 'Messenger link')
    const parsed = new URL(url)
    const username = messengerUsernameFromUrl(parsed)
    if (username && /^[A-Za-z0-9._]{3,}$/.test(username)) {
      return `https://m.me/${username}`
    }
    const host = parsed.hostname.replace(/^www\./i, '')
    if (host === 'm.me' || host === 'messenger.com' || host.endsWith('facebook.com')) {
      throw new ContactSettingsValidationError(
        'Enter a Messenger link like https://m.me/your-page or a Facebook Page username.',
      )
    }
    return url
  }

  const username = value.replace(/^@/, '').split(/[/?#]/)[0]?.trim() || ''
  if (!/^[A-Za-z0-9._]{3,}$/.test(username)) {
    throw new ContactSettingsValidationError(
      'Enter a Messenger link like https://m.me/your-page or a Facebook Page username.',
    )
  }
  return `https://m.me/${username}`
}

/** Accept a WhatsApp link or a phone number and store a wa.me link for phone numbers. */
export function normalizeWhatsAppUrl(raw: string) {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || /wa\.me|whatsapp\.com/i.test(value)) {
    return assertHttpUrl(value, 'WhatsApp link')
  }
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) {
    throw new ContactSettingsValidationError('Enter a valid WhatsApp link or phone number.')
  }
  let normalized = digits
  if (normalized.startsWith('0') && normalized.length === 11) normalized = `63${normalized.slice(1)}`
  else if (/^\d{10}$/.test(normalized)) normalized = `63${normalized}`
  return `https://wa.me/${normalized}`
}

async function readFallback(): Promise<Partial<ContactSettings>> {
  try {
    const raw = await readFile(fallbackFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<ContactSettings>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeFallback(settings: ContactSettings) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(fallbackFile, JSON.stringify(settings, null, 2), 'utf8')
}

async function selectSettings(columns: string) {
  return supabaseAdmin.from('resort_contact_settings').select(columns).eq('id', 1).maybeSingle()
}

function isNewerTimestamp(candidate?: string, current?: string) {
  if (!candidate) return false
  const next = Date.parse(candidate)
  if (Number.isNaN(next)) return false
  if (!current) return true
  const previous = Date.parse(current)
  if (Number.isNaN(previous)) return true
  return next > previous
}

/** Load settings from Supabase; fall back to the local file if newer columns or the table are missing. */
export async function loadContactSettings(): Promise<ContactSettings> {
  const fromFile = await readFallback()
  const full = await selectSettings(FULL_COLUMNS)

  if (!full.error) {
    if (!full.data) {
      const seeded = toContactSettings(fromFile)
      return saveContactSettings(seeded, null).catch(() => seeded)
    }
    const dbSettings = toContactSettings(full.data as Partial<ContactSettings>)
    const fileNotOlder = !isNewerTimestamp(dbSettings.updated_at, fromFile.updated_at)
    const extraKeys = [
      'address',
      'maps_url',
      'messenger_url',
      'twitter_url',
      'pinterest_url',
      'whatsapp_url',
    ] as const
    const fileHasNewerExtras = extraKeys.some(
      (key) => fromFile[key] != null && fromFile[key] !== dbSettings[key],
    )
    if (fileNotOlder && (isNewerTimestamp(fromFile.updated_at, dbSettings.updated_at) || fileHasNewerExtras)) {
      const merged = toContactSettings(dbSettings, fromFile)
      return saveContactSettings(merged, null).catch(() => merged)
    }
    return dbSettings
  }

  const detail = formatDbError(full.error)
  if (isMissingTableError(detail)) {
    return toContactSettings(fromFile)
  }

  if (!isMissingColumnError(detail)) {
    throw new Error(detail)
  }

  const base = await selectSettings(BASE_COLUMNS)
  if (base.error) {
    const baseDetail = formatDbError(base.error)
    if (isMissingTableError(baseDetail)) return toContactSettings(fromFile)
    throw new Error(baseDetail)
  }

  if (!base.data) return toContactSettings(fromFile)
  return toContactSettings(fromFile, base.data as Partial<ContactSettings>)
}

/** Save settings to Supabase. If the new columns are not migrated yet, keep them in the local file. */
export async function saveContactSettings(
  input: Omit<ContactSettings, 'updated_at'>,
  updatedBy: string | null,
): Promise<ContactSettings> {
  const updated_at = new Date().toISOString()
  const settings = toContactSettings({ ...input, updated_at })
  const payload = {
    id: 1,
    contact_email: settings.contact_email,
    phone: settings.phone,
    facebook_url: settings.facebook_url,
    address: settings.address,
    maps_url: settings.maps_url,
    messenger_url: settings.messenger_url,
    twitter_url: settings.twitter_url,
    pinterest_url: settings.pinterest_url,
    whatsapp_url: settings.whatsapp_url,
    updated_at,
    updated_by: updatedBy,
  }

  const { data, error } = await supabaseAdmin
    .from('resort_contact_settings')
    .upsert(payload, { onConflict: 'id' })
    .select(FULL_COLUMNS)
    .maybeSingle()

  if (!error) {
    const saved = toContactSettings(settings, (data as Partial<ContactSettings> | null) ?? undefined)
    await writeFallback(saved).catch(() => undefined)
    return saved
  }

  const detail = formatDbError(error)
  if (!isMissingColumnError(detail) && !isMissingTableError(detail)) {
    throw new Error(detail || 'Could not update contact settings.')
  }

  if (isMissingColumnError(detail)) {
    const basePayload = {
      id: 1,
      contact_email: settings.contact_email,
      phone: settings.phone,
      facebook_url: settings.facebook_url,
      updated_at,
      updated_by: updatedBy,
    }
    const base = await supabaseAdmin
      .from('resort_contact_settings')
      .upsert(basePayload, { onConflict: 'id' })
      .select(BASE_COLUMNS)
      .maybeSingle()

    if (base.error && !isMissingTableError(formatDbError(base.error))) {
      throw new Error(formatDbError(base.error) || 'Could not update contact settings.')
    }
  }

  await writeFallback(settings)
  return settings
}
