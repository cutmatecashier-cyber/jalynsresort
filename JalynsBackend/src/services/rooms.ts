import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

export type RoomPhoto = {
  id: string
  name: string
  image: string
}

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const DATA_FILE = path.join(DATA_DIR, 'rooms.json')

export const DEFAULT_ROOMS: RoomPhoto[] = [
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    image:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 'suite',
    name: 'Garden Suite',
    image:
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 'family',
    name: 'Family Room',
    image:
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 'ocean',
    name: 'Ocean View',
    image:
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80',
  },
]

const MAX_ROOMS = 24

type StoreShape = {
  rooms: RoomPhoto[]
}

function ensureStore() {
  mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify({ rooms: DEFAULT_ROOMS }, null, 2), 'utf8')
  }
}

function normalizeRooms(raw: unknown): RoomPhoto[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_ROOMS.map((r) => ({ ...r }))
  }
  const rooms = raw
    .map((row) => {
      const item = (row && typeof row === 'object' ? row : {}) as Partial<RoomPhoto>
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `room-${randomUUID().slice(0, 8)}`
      const name =
        typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Room photo'
      const image = typeof item.image === 'string' && item.image.trim() ? item.image.trim() : ''
      if (!image) return null
      return { id, name, image } satisfies RoomPhoto
    })
    .filter((r): r is RoomPhoto => Boolean(r))
  return rooms.length > 0 ? rooms.slice(0, MAX_ROOMS) : DEFAULT_ROOMS.map((r) => ({ ...r }))
}

function readStore(): StoreShape {
  ensureStore()
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Partial<StoreShape>
    return { rooms: normalizeRooms(parsed.rooms) }
  } catch {
    return { rooms: DEFAULT_ROOMS.map((r) => ({ ...r })) }
  }
}

function writeStore(store: StoreShape) {
  ensureStore()
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8')
}

export function listRooms(): RoomPhoto[] {
  return readStore().rooms
}

export function addRoom(input: { name?: string; image: string }): RoomPhoto[] {
  const image = input.image.trim()
  if (!image) throw new Error('Image URL is required.')
  const store = readStore()
  if (store.rooms.length >= MAX_ROOMS) {
    throw new Error(`You can add up to ${MAX_ROOMS} room photos.`)
  }
  store.rooms.push({
    id: `room-${randomUUID().slice(0, 8)}`,
    name: (input.name || '').trim() || `Room ${store.rooms.length + 1}`,
    image,
  })
  writeStore(store)
  return store.rooms
}

export function updateRoom(
  id: string,
  patch: { name?: string; image?: string },
): RoomPhoto[] {
  const store = readStore()
  const index = store.rooms.findIndex((r) => r.id === id)
  if (index < 0) throw new Error('Room photo not found.')
  if (typeof patch.name === 'string' && patch.name.trim()) {
    store.rooms[index] = { ...store.rooms[index], name: patch.name.trim() }
  }
  if (typeof patch.image === 'string' && patch.image.trim()) {
    store.rooms[index] = { ...store.rooms[index], image: patch.image.trim() }
  }
  writeStore(store)
  return store.rooms
}

export function deleteRoom(id: string): RoomPhoto[] {
  const store = readStore()
  if (store.rooms.length <= 1) {
    throw new Error('Keep at least one room photo.')
  }
  const next = store.rooms.filter((r) => r.id !== id)
  if (next.length === store.rooms.length) {
    throw new Error('Room photo not found.')
  }
  store.rooms = next
  writeStore(store)
  return store.rooms
}

export function resetRooms(): RoomPhoto[] {
  const store = { rooms: DEFAULT_ROOMS.map((r) => ({ ...r })) }
  writeStore(store)
  return store.rooms
}
