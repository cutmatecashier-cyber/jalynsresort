import { randomUUID } from 'node:crypto'
import { createJsonCloudStore } from './jsonCloudStore.js'

export type GalleryPhoto = {
  id: string
  alt: string
  image: string
}

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

function normalizePhotos(raw: unknown): GalleryPhoto[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
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
  return photos.slice(0, MAX_PHOTOS)
}

const store = createJsonCloudStore<StoreShape>({
  cloudObject: 'gallery.json',
  parse: (raw) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Partial<StoreShape>
    return { photos: normalizePhotos(row.photos) }
  },
  serialize: (value) => value,
  defaultValue: () => ({ photos: DEFAULT_GALLERY.map((p) => ({ ...p })) }),
  emptyValue: () => ({ photos: [] }),
  hasContent: (value) => value.photos.length > 0,
})

export async function listGallery(): Promise<GalleryPhoto[]> {
  return (await store.load()).photos
}

export async function addGalleryPhoto(input: {
  alt?: string
  image: string
}): Promise<GalleryPhoto[]> {
  const image = input.image.trim()
  if (!image) throw new Error('Image URL is required.')
  const current = await store.load()
  if (current.photos.length >= MAX_PHOTOS) {
    throw new Error(`You can add up to ${MAX_PHOTOS} gallery photos.`)
  }
  const next: StoreShape = {
    photos: [
      ...current.photos,
      {
        id: `gallery-${randomUUID().slice(0, 8)}`,
        alt: (input.alt || '').trim() || `Photo ${current.photos.length + 1}`,
        image,
      },
    ],
  }
  await store.save(next)
  return next.photos
}

export async function updateGalleryPhoto(
  id: string,
  patch: { alt?: string; image?: string },
): Promise<GalleryPhoto[]> {
  const current = await store.load()
  const index = current.photos.findIndex((p) => p.id === id)
  if (index < 0) throw new Error('Gallery photo not found.')
  const photos = current.photos.map((p) => ({ ...p }))
  if (typeof patch.alt === 'string' && patch.alt.trim()) {
    photos[index] = { ...photos[index], alt: patch.alt.trim() }
  }
  if (typeof patch.image === 'string' && patch.image.trim()) {
    photos[index] = { ...photos[index], image: patch.image.trim() }
  }
  const next = { photos }
  await store.save(next)
  return next.photos
}

export async function deleteGalleryPhoto(id: string): Promise<GalleryPhoto[]> {
  const current = await store.load()
  if (current.photos.length <= 1) {
    throw new Error('Keep at least one gallery photo.')
  }
  const photos = current.photos.filter((p) => p.id !== id)
  if (photos.length === current.photos.length) {
    throw new Error('Gallery photo not found.')
  }
  const next = { photos }
  await store.save(next)
  return next.photos
}

export async function resetGallery(): Promise<GalleryPhoto[]> {
  const next = { photos: DEFAULT_GALLERY.map((p) => ({ ...p })) }
  await store.save(next)
  return next.photos
}
