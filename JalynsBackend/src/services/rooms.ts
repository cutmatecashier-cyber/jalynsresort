import { randomUUID } from 'node:crypto'
import { createJsonCloudStore } from './jsonCloudStore.js'

export type RoomPhoto = {
  id: string
  name: string
  image: string
}

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

const store = createJsonCloudStore<StoreShape>({
  cloudObject: 'rooms.json',
  parse: (raw) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Partial<StoreShape>
    if (!Array.isArray(row.rooms) || row.rooms.length === 0) {
      return { rooms: [] }
    }
    return { rooms: normalizeRooms(row.rooms) }
  },
  serialize: (value) => value,
  defaultValue: () => ({ rooms: DEFAULT_ROOMS.map((r) => ({ ...r })) }),
  emptyValue: () => ({ rooms: [] }),
  hasContent: (value) => value.rooms.length > 0,
})

export async function listRooms(): Promise<RoomPhoto[]> {
  return (await store.load()).rooms
}

export async function addRoom(input: { name?: string; image: string }): Promise<RoomPhoto[]> {
  const image = input.image.trim()
  if (!image) throw new Error('Image URL is required.')
  const current = await store.load()
  if (current.rooms.length >= MAX_ROOMS) {
    throw new Error(`You can add up to ${MAX_ROOMS} room photos.`)
  }
  const next: StoreShape = {
    rooms: [
      ...current.rooms,
      {
        id: `room-${randomUUID().slice(0, 8)}`,
        name: (input.name || '').trim() || `Room ${current.rooms.length + 1}`,
        image,
      },
    ],
  }
  await store.save(next)
  return next.rooms
}

export async function updateRoom(
  id: string,
  patch: { name?: string; image?: string },
): Promise<RoomPhoto[]> {
  const current = await store.load()
  const index = current.rooms.findIndex((r) => r.id === id)
  if (index < 0) throw new Error('Room photo not found.')
  const rooms = current.rooms.map((r) => ({ ...r }))
  if (typeof patch.name === 'string' && patch.name.trim()) {
    rooms[index] = { ...rooms[index], name: patch.name.trim() }
  }
  if (typeof patch.image === 'string' && patch.image.trim()) {
    rooms[index] = { ...rooms[index], image: patch.image.trim() }
  }
  const next = { rooms }
  await store.save(next)
  return next.rooms
}

export async function deleteRoom(id: string): Promise<RoomPhoto[]> {
  const current = await store.load()
  if (current.rooms.length <= 1) {
    throw new Error('Keep at least one room photo.')
  }
  const rooms = current.rooms.filter((r) => r.id !== id)
  if (rooms.length === current.rooms.length) {
    throw new Error('Room photo not found.')
  }
  const next = { rooms }
  await store.save(next)
  return next.rooms
}

export async function resetRooms(): Promise<RoomPhoto[]> {
  const next = { rooms: DEFAULT_ROOMS.map((r) => ({ ...r })) }
  await store.save(next)
  return next.rooms
}
