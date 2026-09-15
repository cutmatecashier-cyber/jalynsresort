import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

export type GalleryPhoto = {
  id: string
  alt: string
  image: string
}

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const DATA_FILE = path.join(DATA_DIR, 'gallery.json')

export const DEFAULT_GALLERY: GalleryPhoto[] = [
  {
    id: 'aerial',
    alt: 'Aerial view of the resort cove',
    image:
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'diver',
    alt: 'Scuba diver exploring coral reef',
    image:
      'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'food',
    alt: 'Fresh seafood platter at the restaurant',
    image:
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'room',
    alt: 'Bright guest room with ocean light',
    image:
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pool',
    alt: 'Resort pool at golden hour',
    image:
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=900&q=80',
  },
]

const MAX_PHOTOS = 24

type StoreShape = {
  photos: GalleryPhoto[]
}

function ensureStore() {
  mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify({ photos: DEFAULT_GALLERY }, null, 2), 'utf8')
  }
}

function normalizePhotos(raw: unknown): GalleryPhoto[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_GALLERY.map((p) => ({ ...p }))
  }
  const photos = raw
    .map((row) => {
      const item = (row && typeof row === 'object' ? row : {}) as Partial<GalleryPhoto>
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `gallery-${randomUUID().slice(0, 8)}`
      const alt =
        typeof item.alt === 'string' && item.alt.trim() ? item.alt.trim() : 'Resort photo'
      const image = typeof item.image === 'string' && item.image.trim() ? item.image.trim() : ''
      if (!image) return null
      return { id, alt, image } satisfies GalleryPhoto
    })
    .filter((p): p is GalleryPhoto => Boolean(p))
  return photos.length > 0 ? photos.slice(0, MAX_PHOTOS) : DEFAULT_GALLERY.map((p) => ({ ...p }))
}

function readStore(): StoreShape {
  ensureStore()
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Partial<StoreShape>
    return { photos: normalizePhotos(parsed.photos) }
  } catch {
    return { photos: DEFAULT_GALLERY.map((p) => ({ ...p })) }
  }
}

function writeStore(store: StoreShape) {
  ensureStore()
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8')
}

export function listGallery(): GalleryPhoto[] {
  return readStore().photos
}

export function addGalleryPhoto(input: { alt?: string; image: string }): GalleryPhoto[] {
  const image = input.image.trim()
  if (!image) throw new Error('Image URL is required.')
  const store = readStore()
  if (store.photos.length >= MAX_PHOTOS) {
    throw new Error(`You can add up to ${MAX_PHOTOS} gallery photos.`)
  }
  store.photos.push({
    id: `gallery-${randomUUID().slice(0, 8)}`,
    alt: (input.alt || '').trim() || `Photo ${store.photos.length + 1}`,
    image,
  })
  writeStore(store)
  return store.photos
}

export function updateGalleryPhoto(
  id: string,
  patch: { alt?: string; image?: string },
): GalleryPhoto[] {
  const store = readStore()
  const index = store.photos.findIndex((p) => p.id === id)
  if (index < 0) throw new Error('Gallery photo not found.')
  if (typeof patch.alt === 'string' && patch.alt.trim()) {
    store.photos[index] = { ...store.photos[index], alt: patch.alt.trim() }
  }
  if (typeof patch.image === 'string' && patch.image.trim()) {
    store.photos[index] = { ...store.photos[index], image: patch.image.trim() }
  }
  writeStore(store)
  return store.photos
}

export function deleteGalleryPhoto(id: string): GalleryPhoto[] {
  const store = readStore()
  if (store.photos.length <= 1) {
    throw new Error('Keep at least one gallery photo.')
  }
  const next = store.photos.filter((p) => p.id !== id)
  if (next.length === store.photos.length) {
    throw new Error('Gallery photo not found.')
  }
  store.photos = next
  writeStore(store)
  return store.photos
}

export function resetGallery(): GalleryPhoto[] {
  const store = { photos: DEFAULT_GALLERY.map((p) => ({ ...p })) }
  writeStore(store)
  return store.photos
}
