import { randomUUID } from 'node:crypto'
import { createJsonCloudStore } from './jsonCloudStore.js'

export type BookingLink = {
  id: string
  name: string
  url: string
}

type StoreShape = {
  links: BookingLink[]
  /** True once this list has been written, so an empty list is not reseeded. */
  saved: boolean
}

const MAX_LINKS = 12
const NAME_MAX = 48
const URL_MAX = 500

const DEFAULT_LINKS: BookingLink[] = [
  { id: 'booking-com', name: 'Booking.com', url: '' },
  { id: 'agoda', name: 'Agoda', url: '' },
  { id: 'airbnb', name: 'Airbnb', url: '' },
]

function emptyStore(): StoreShape {
  return { links: [], saved: false }
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (parsed.username || parsed.password) return false
    return Boolean(parsed.hostname)
  } catch {
    return false
  }
}

function cleanId(value: unknown) {
  const id = String(value ?? '').trim()
  if (/^[a-zA-Z0-9_-]{1,64}$/.test(id)) return id
  return randomUUID()
}

function parseLinks(raw: unknown): BookingLink[] {
  if (!Array.isArray(raw)) return []
  const links: BookingLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as { id?: unknown; name?: unknown; url?: unknown }
    const name = String(row.name ?? '').trim().slice(0, NAME_MAX)
    const url = String(row.url ?? '').trim().slice(0, URL_MAX)
    if (!name && !url) continue
    links.push({ id: cleanId(row.id), name, url })
    if (links.length >= MAX_LINKS) break
  }
  return links
}

const store = createJsonCloudStore<StoreShape>({
  cloudObject: 'booking-links.json',
  parse(raw) {
    const body = raw && typeof raw === 'object' ? (raw as { links?: unknown }) : {}
    return { links: parseLinks(body.links), saved: true }
  },
  serialize(value) {
    return { links: value.links, saved: true }
  },
  defaultValue: () => ({ links: DEFAULT_LINKS.map((link) => ({ ...link })), saved: true }),
  emptyValue: emptyStore,
  hasContent: (value) => value.saved,
})

export function publicBookingLinks(links: BookingLink[]) {
  return links.filter((link) => link.name && isHttpUrl(link.url))
}

export async function listBookingLinks() {
  const data = await store.load()
  return data.links
}

export function normalizeBookingLinks(raw: unknown): BookingLink[] {
  if (!Array.isArray(raw)) {
    throw new Error('Add at least one booking platform, or save an empty list.')
  }
  if (raw.length > MAX_LINKS) {
    throw new Error(`You can add up to ${MAX_LINKS} booking platforms.`)
  }

  const links: BookingLink[] = []
  const seen = new Set<string>()

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new Error('Each booking platform needs a name and a link.')
    }
    const row = item as { id?: unknown; name?: unknown; url?: unknown }
    const name = String(row.name ?? '').trim()
    const url = String(row.url ?? '').trim()
    if (!name && !url) continue
    if (!name) throw new Error('Each booking platform needs a name.')
    if (name.length > NAME_MAX) {
      throw new Error(`Platform names must be ${NAME_MAX} characters or fewer.`)
    }
    if (url.length > URL_MAX) throw new Error(`The link for ${name} is too long.`)
    if (url && !isHttpUrl(url)) {
      throw new Error(`The link for ${name} must start with https://`)
    }

    let id = cleanId(row.id)
    while (seen.has(id)) id = randomUUID()
    seen.add(id)
    links.push({ id, name, url: url ? new URL(url).toString() : '' })
  }

  return links
}

export async function saveBookingLinks(raw: unknown) {
  const links = normalizeBookingLinks(raw)
  await store.save({ links, saved: true })
  return links
}
