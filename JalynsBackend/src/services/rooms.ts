import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'
import { bumpContentRevision } from './contentRevision.js'

export type RoomStatus = 'available' | 'unavailable'

export type Room = {
  id: string
  name: string
  description: string
  size: string
  max_capacity: string
  beds: string
  price_per_night: string
  extra_person_charge: string
  rules_policies: string
  status: RoomStatus
  amenities: string[]
  images: string[]
  sort_order: number
}

export type RoomsVoucher = {
  enabled: boolean
  percent: number
}

export type RoomHighlight = {
  id: string
  image: string
}

const DEFAULT_VOUCHER: RoomsVoucher = {
  enabled: false,
  percent: 0,
}

const MAX_ROOMS = 24
const MAX_IMAGES_PER_ROOM = 12
const MAX_HIGHLIGHTS = 12

export const DEFAULT_ROOMS: Room[] = [
  {
    id: 'budget-double',
    name: 'Budget Double Bedroom',
    description:
      "Discover affordability and comfort in our budget streetside room at Jalyn's Resort. Enjoy a cozy retreat with a comfortable Queen size bed, an en-suite bathroom, and a modest yet inviting ambiance. The large window provides a view of the lively street side of the resort. You have access to all amenities of the resort incl. 3 swimming pools. Our restaurant is just a short step away from your room.",
    size: '20m²',
    max_capacity: '2 guests',
    beds: 'Queen size bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Air conditioned',
      'Ceiling Fans',
      'Private bathroom',
      'Shower',
      'Fridge',
      'Television',
      'Wireless Internet',
      'Closets in room',
      'Towels',
      'Swimming Pools',
    ],
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 1,
  },
  {
    id: 'standard-double',
    name: 'Standard Double Bedroom',
    description:
      "Embrace tranquility in our Standard Room at Jalyn's Resort. Indulge in a peaceful garden view from your private terrace, accompanied by convenient kitchen facilities. This thoughtfully designed space ensures a comfortable and serene stay with modern amenities.",
    size: '25m²',
    max_capacity: '2 guests',
    beds: 'King size bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Garden view',
      'Wireless Internet',
      'TV',
      'Fridge',
      'Patio',
      'Outdoor Setting',
      'Kitchenette',
      'Housekeeping',
      'Free Toiletries',
      'En-suite Bathroom',
      'Daily Room Service',
      'Tea/Coffee Maker',
      'Ceiling Fans',
      'Air conditioned',
    ],
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 2,
  },
  {
    id: 'studio-apartment',
    name: 'Studio Apartment incl Kitchenette',
    description:
      "Make Jalyn's Resort your home away from home with our Studio Apartment, designed for long-term stays. Enjoy the convenience of a fully-equipped kitchenette and unwind on your private terrace with a soothing pool view. Immerse yourself in comfort and independence. It's the perfect setting for an extended retreat with all the amenities at your fingertips.",
    size: '35m²',
    max_capacity: '2 guests',
    beds: 'King size bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Pool view',
      'Wireless Internet',
      'TV',
      'Internet Access',
      'Room Safe',
      'Fridge',
      'Linen and Towels Provided',
      'Kitchen supplies',
      'Kitchenette',
      'Air conditioned',
    ],
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 3,
  },
  {
    id: 'standard-pool',
    name: 'Standard Pool Room',
    description:
      "Discover relaxation in our Standard Pool Room at Jalyn's Resort. Enjoy a pool view from your private terrace or balcony, creating a tranquil retreat. Unwind in comfort and soak in the serene ambiance, making your stay a delightful experience.",
    size: '20m²',
    max_capacity: '2 guests',
    beds: 'Queen size bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Pool view',
      'Poolside terrace',
      'Wireless Internet',
      'TV',
      'Fridge',
      'Housekeeping',
      'Free Toiletries',
      'En-suite Bathroom',
      'Daily Room Service',
      'Tea/Coffee Maker',
      'Ceiling Fans',
      'Air conditioned',
    ],
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 4,
  },
  {
    id: 'premium-pool',
    name: 'Premium Pool Room',
    description:
      'Discover luxury in our Premium Pool Room, featuring serene pool and garden views. Enjoy cleanliness and comfort with all the modern amenities, and a private balcony where you can relax in peace.',
    size: '35m²',
    max_capacity: '2 guests',
    beds: 'King size bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Garden view',
      'Wireless Internet',
      'TV',
      'Fridge',
      'Housekeeping',
      'Free Toiletries',
      'En-suite Bathroom',
      'Daily Room Service',
      'Tea/Coffee Maker',
      'Ceiling Fans',
      'Air conditioned',
    ],
    images: [
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 5,
  },
  {
    id: 'premium-double',
    name: 'Premium Double Bedroom',
    description:
      "Unwind in our Premium Double Bedroom at Jalyn's Resort, where every evening is a masterpiece with beautiful sunsets over the sea from your private balcony. Immerse yourself in the tranquil ambiance as the sun dips below the horizon, casting a warm glow and creating a magical backdrop for your coastal retreat.",
    size: '35m²',
    max_capacity: '2 guests',
    beds: 'King size bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Pool view',
      'Wireless Internet',
      'TV',
      'Fridge',
      'Housekeeping',
      'Free Toiletries',
      'En-suite Bathroom',
      'Dining area',
      'Daily Room Service',
      'Tea/Coffee Maker',
      'Ceiling Fans',
      'Air conditioned',
    ],
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 6,
  },
  {
    id: 'family-room',
    name: 'Family Room',
    description:
      'Our Family Room is right next to the two lower swimming pools, so your kids have easy swimming access, and you can keep an eye on them from the terrace or even inside the room.',
    size: '40m²',
    max_capacity: '4 guests',
    beds: 'King bed & Queen bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Pool view',
      'Wireless Internet',
      'TV',
      'Swimming Pool',
      'Lounge Area',
      'Housekeeping',
      'Free Toiletries',
      'En-suite Bathroom',
      'Tea/Coffee Maker',
      'Closets in room',
      'Ceiling Fans',
      'Balcony',
      'Air-conditioning',
    ],
    images: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 7,
  },
  {
    id: 'premium-2bed',
    name: 'Premium 2-Bedroom Apartment',
    description:
      "Escape to luxury in our Premium 2-Bedroom Apartment at Jalyn's Resort. Enjoy mesmerizing seaviews from your private balcony that overlooks the entire resort. This spacious retreat features two bedrooms, seamlessly blending comfort and panoramic coastal beauty for an unforgettable stay by the sea.",
    size: '55m²',
    max_capacity: '4 guests',
    beds: 'King bed & Queen bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Pool view',
      'Ceiling Fans',
      'Dining Setting',
      'Fridge',
      'Shower',
      'Closets in room',
      'Television',
      'Towels',
      'Wireless Internet',
      'TV',
      'Private bathroom',
      'Air conditioned',
      'Balcony',
    ],
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 8,
  },
  {
    id: '2bed-lounge',
    name: '2-Bedroom Apartment incl Lounge and Kitchen',
    description:
      "Escape to the serenity of Jalyn's Resort with our inviting 2-Bedroom Apartment, where comfort meets breathtaking sea views. This spacious retreat features two cozy bedrooms, a stylish lounge for relaxation, and a fully-equipped kitchen for your convenience. Admire the sunrise over the sparkling waters from your private balcony, creating the perfect start to your day. Immerse yourself in coastal tranquillity without sacrificing the comforts of home. Whether you're traveling with family or friends, this thoughtfully designed apartment offers the ideal blend of space, comfort, and a picturesque backdrop for an unforgettable stay by the sea.",
    size: '60m²',
    max_capacity: '4–5 guests',
    beds: 'King bed & Queen bed',
    price_per_night: 'Contact for rates',
    extra_person_charge: '',
    rules_policies: '',
    status: 'available',
    amenities: [
      'Bay view',
      'Wireless Internet',
      'Television',
      'TV',
      'Fridge',
      'Kitchen',
      'Internet Access',
      'Housekeeping',
      'Free Toiletries',
      'Daily Room Service',
      'Tea/Coffee Maker',
      'Closets in room',
      'Bath',
      'Bathroom amenities',
      'Balcony',
      'Air-conditioning',
    ],
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80',
    ],
    sort_order: 9,
  },
]


type RoomRow = {
  id: string
  name: string
  description: string | null
  size: string | null
  max_capacity: string | null
  beds: string | null
  price_per_night: string | null
  extra_person_charge: string | null
  rules_policies: string | null
  status: string | null
  amenities: string[] | null
  images: string[] | null
  sort_order: number | null
}

type HighlightRow = {
  id: string
  image: string
  sort_order: number | null
}

type SettingsRow = {
  id: number
  voucher_enabled: boolean | null
  voucher_percent: number | null
}

function isMissingTable(message: string, code?: string) {
  return (
    code === 'PGRST205' ||
    /could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message) ||
    /schema cache/i.test(message)
  )
}

export function roomsDbErrorMessage(
  error: { message: string; code?: string } | null,
  fallback: string,
) {
  if (!error) return fallback
  if (isMissingTable(error.message, error.code)) {
    return 'Rooms tables are missing. Run supabase/ROOMS.sql in the Supabase SQL Editor, then refresh.'
  }
  return error.message || fallback
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function asStatus(value: unknown): RoomStatus {
  return value === 'unavailable' ? 'unavailable' : 'available'
}

function asAmenities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function asImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, MAX_IMAGES_PER_ROOM)
}

function asVoucher(raw: unknown): RoomsVoucher {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Partial<RoomsVoucher> & {
    voucher_enabled?: boolean
    voucher_percent?: number
  }
  const percentRaw =
    typeof row.percent === 'number'
      ? row.percent
      : typeof row.voucher_percent === 'number'
        ? row.voucher_percent
        : typeof row.percent === 'string'
          ? Number(row.percent)
          : 0
  const percent = Number.isFinite(percentRaw) ? Math.min(100, Math.max(0, percentRaw)) : 0
  const enabled =
    (typeof row.enabled === 'boolean' ? row.enabled : Boolean(row.voucher_enabled)) && percent > 0
  return { enabled, percent }
}

function mapRoom(row: RoomRow): Room {
  return {
    id: asString(row.id) || `room-${randomUUID().slice(0, 8)}`,
    name: asString(row.name) || 'Room',
    description: asString(row.description),
    size: asString(row.size),
    max_capacity: asString(row.max_capacity),
    beds: asString(row.beds),
    price_per_night: asString(row.price_per_night) || 'Contact for rates',
    extra_person_charge: asString(row.extra_person_charge),
    rules_policies: asString(row.rules_policies),
    status: asStatus(row.status),
    amenities: asAmenities(row.amenities),
    images: asImages(row.images),
    sort_order:
      typeof row.sort_order === 'number' && Number.isFinite(row.sort_order) ? row.sort_order : 0,
  }
}

function mapHighlight(row: HighlightRow): RoomHighlight {
  return {
    id: asString(row.id) || `highlight-${randomUUID().slice(0, 8)}`,
    image: asString(row.image),
  }
}

function roomToRow(room: Room) {
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    size: room.size,
    max_capacity: room.max_capacity,
    beds: room.beds,
    price_per_night: room.price_per_night,
    extra_person_charge: room.extra_person_charge,
    rules_policies: room.rules_policies,
    status: room.status,
    amenities: room.amenities,
    images: room.images,
    sort_order: room.sort_order,
    updated_at: new Date().toISOString(),
  }
}

function cloneDefaults(): Room[] {
  return DEFAULT_ROOMS.map((r) => ({
    ...r,
    amenities: [...r.amenities],
    images: [...r.images],
  }))
}

async function touchRevision() {
  try {
    await bumpContentRevision()
  } catch {
    // revision bump is best-effort for guest polling
  }
}

async function fetchRoomsRows(): Promise<Room[]> {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select(
      'id, name, description, size, max_capacity, beds, price_per_night, extra_person_charge, rules_policies, status, amenities, images, sort_order',
    )
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not load rooms.'))
  return ((data as RoomRow[] | null) ?? [])
    .map(mapRoom)
    .filter((r) => r.images.length > 0)
}

async function seedRoomsIfEmpty(): Promise<Room[]> {
  const existing = await fetchRoomsRows()
  if (existing.length) return existing

  const seed = cloneDefaults()
  const { error } = await supabaseAdmin.from('rooms').insert(seed.map(roomToRow))
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not seed rooms.'))
  await touchRevision()
  return seed
}

async function ensureSettingsRow() {
  const { data, error } = await supabaseAdmin
    .from('rooms_settings')
    .select('id, voucher_enabled, voucher_percent')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not load rooms settings.'))
  if (data) return data as SettingsRow
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('rooms_settings')
    .insert({ id: 1, voucher_enabled: false, voucher_percent: 0 })
    .select('id, voucher_enabled, voucher_percent')
    .single()
  if (insertError) {
    throw new Error(roomsDbErrorMessage(insertError, 'Could not create rooms settings.'))
  }
  return inserted as SettingsRow
}

export type RoomInput = {
  name?: string
  description?: string
  size?: string
  max_capacity?: string
  /** @deprecated use max_capacity */
  capacity?: string
  beds?: string
  price_per_night?: string
  /** @deprecated use price_per_night */
  price?: string
  extra_person_charge?: string
  rules_policies?: string
  status?: RoomStatus | string
  amenities?: string[]
  images?: string[]
  sort_order?: number
}

function applyPatch(room: Room, patch: RoomInput): Room {
  const next = { ...room, amenities: [...room.amenities], images: [...room.images] }
  if (typeof patch.name === 'string') next.name = patch.name.trim() || next.name
  if (typeof patch.description === 'string') next.description = patch.description.trim()
  if (typeof patch.size === 'string') next.size = patch.size.trim()
  if (typeof patch.max_capacity === 'string') next.max_capacity = patch.max_capacity.trim()
  else if (typeof patch.capacity === 'string') next.max_capacity = patch.capacity.trim()
  if (typeof patch.beds === 'string') next.beds = patch.beds.trim()
  if (typeof patch.price_per_night === 'string') next.price_per_night = patch.price_per_night.trim()
  else if (typeof patch.price === 'string') next.price_per_night = patch.price.trim()
  if (typeof patch.extra_person_charge === 'string') {
    next.extra_person_charge = patch.extra_person_charge.trim()
  }
  if (typeof patch.rules_policies === 'string') next.rules_policies = patch.rules_policies.trim()
  if (typeof patch.status === 'string' && patch.status.trim()) {
    next.status = asStatus(patch.status)
  }
  if (Array.isArray(patch.amenities)) next.amenities = asAmenities(patch.amenities)
  if (Array.isArray(patch.images)) {
    const images = asImages(patch.images)
    if (images.length) next.images = images
  }
  if (typeof patch.sort_order === 'number' && Number.isFinite(patch.sort_order)) {
    next.sort_order = patch.sort_order
  }
  if (next.status !== 'available' && next.status !== 'unavailable') {
    next.status = 'available'
  }
  return next
}

export async function listRooms(): Promise<Room[]> {
  return seedRoomsIfEmpty()
}

export async function getRoomsVoucher(): Promise<RoomsVoucher> {
  const row = await ensureSettingsRow()
  return asVoucher({
    enabled: Boolean(row.voucher_enabled),
    percent: typeof row.voucher_percent === 'number' ? row.voucher_percent : 0,
  })
}

export async function updateRoomsVoucher(input: Partial<RoomsVoucher>): Promise<RoomsVoucher> {
  const current = await getRoomsVoucher()
  const next = asVoucher({
    enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
    percent: typeof input.percent === 'number' ? input.percent : current.percent,
  })
  const { data, error } = await supabaseAdmin
    .from('rooms_settings')
    .upsert({
      id: 1,
      voucher_enabled: next.enabled,
      voucher_percent: next.percent,
      updated_at: new Date().toISOString(),
    })
    .select('id, voucher_enabled, voucher_percent')
    .single()
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not update voucher.'))
  await touchRevision()
  return asVoucher({
    enabled: Boolean((data as SettingsRow).voucher_enabled),
    percent:
      typeof (data as SettingsRow).voucher_percent === 'number'
        ? (data as SettingsRow).voucher_percent!
        : 0,
  })
}

export async function createRoom(input: RoomInput & { image?: string }): Promise<Room[]> {
  const rooms = await seedRoomsIfEmpty()
  if (rooms.length >= MAX_ROOMS) {
    throw new Error(`You can add up to ${MAX_ROOMS} rooms.`)
  }

  const imagesFromInput = Array.isArray(input.images) ? asImages(input.images) : []
  const legacyImage = asString(input.image)
  const images = (imagesFromInput.length ? imagesFromInput : legacyImage ? [legacyImage] : []).slice(
    0,
    MAX_IMAGES_PER_ROOM,
  )
  if (!images.length) throw new Error('At least one room image is required.')

  const maxSort = rooms.reduce((max, r) => Math.max(max, r.sort_order), 0)
  const room: Room = {
    id: `room-${randomUUID().slice(0, 8)}`,
    name: asString(input.name) || `Room ${rooms.length + 1}`,
    description: asString(input.description),
    size: asString(input.size),
    max_capacity: asString(input.max_capacity) || asString(input.capacity),
    beds: asString(input.beds),
    price_per_night:
      asString(input.price_per_night) || asString(input.price) || 'Contact for rates',
    extra_person_charge: asString(input.extra_person_charge),
    rules_policies: asString(input.rules_policies),
    status: asStatus(input.status),
    amenities: asAmenities(input.amenities),
    images,
    sort_order:
      typeof input.sort_order === 'number' && Number.isFinite(input.sort_order)
        ? input.sort_order
        : maxSort + 1,
  }

  const { error } = await supabaseAdmin.from('rooms').insert(roomToRow(room))
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not create room.'))
  await touchRevision()
  return listRooms()
}

/** @deprecated Prefer createRoom / updateRoom — kept for older photo upload clients */
export async function addRoom(input: { name?: string; image: string }): Promise<Room[]> {
  return createRoom({ name: input.name, image: input.image })
}

export async function updateRoom(id: string, patch: RoomInput & { image?: string }): Promise<Room[]> {
  const rooms = await seedRoomsIfEmpty()
  const current = rooms.find((r) => r.id === id)
  if (!current) throw new Error('Room not found.')

  let merged: RoomInput = { ...patch }
  if (typeof patch.image === 'string' && patch.image.trim()) {
    const images = [...current.images]
    images[0] = patch.image.trim()
    merged = { ...merged, images }
  }

  const next = applyPatch(current, merged)
  const { error } = await supabaseAdmin.from('rooms').update(roomToRow(next)).eq('id', id)
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not update room.'))
  await touchRevision()
  return listRooms()
}

export async function deleteRoom(id: string): Promise<Room[]> {
  const rooms = await seedRoomsIfEmpty()
  if (rooms.length <= 1) throw new Error('Keep at least one room.')
  if (!rooms.some((r) => r.id === id)) throw new Error('Room not found.')

  const { error } = await supabaseAdmin.from('rooms').delete().eq('id', id)
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not delete room.'))
  await touchRevision()
  return listRooms()
}

export async function addRoomImages(id: string, urls: string[]): Promise<Room[]> {
  const clean = urls.map((u) => asString(u)).filter(Boolean)
  if (!clean.length) throw new Error('At least one image is required.')

  const rooms = await seedRoomsIfEmpty()
  const current = rooms.find((r) => r.id === id)
  if (!current) throw new Error('Room not found.')

  const nextImages = [...current.images, ...clean].slice(0, MAX_IMAGES_PER_ROOM)
  if (nextImages.length === current.images.length) {
    throw new Error(`You can add up to ${MAX_IMAGES_PER_ROOM} images per room.`)
  }

  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ images: nextImages, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not add room images.'))
  await touchRevision()
  return listRooms()
}

export async function replaceRoomImage(
  id: string,
  imageIndex: number,
  url: string,
): Promise<Room[]> {
  const image = asString(url)
  if (!image) throw new Error('Image URL is required.')

  const rooms = await seedRoomsIfEmpty()
  const current = rooms.find((r) => r.id === id)
  if (!current) throw new Error('Room not found.')
  if (imageIndex < 0 || imageIndex >= current.images.length) {
    throw new Error('Image not found.')
  }

  const images = [...current.images]
  images[imageIndex] = image
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ images, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not replace room image.'))
  await touchRevision()
  return listRooms()
}

export async function deleteRoomImage(id: string, imageIndex: number): Promise<Room[]> {
  const rooms = await seedRoomsIfEmpty()
  const current = rooms.find((r) => r.id === id)
  if (!current) throw new Error('Room not found.')
  if (current.images.length <= 1) throw new Error('Keep at least one image per room.')
  if (imageIndex < 0 || imageIndex >= current.images.length) {
    throw new Error('Image not found.')
  }

  const images = current.images.filter((_, i) => i !== imageIndex)
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ images, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not delete room image.'))
  await touchRevision()
  return listRooms()
}

export async function resetRooms(): Promise<Room[]> {
  const { error: delError } = await supabaseAdmin
    .from('rooms')
    .delete()
    .neq('id', '__none__')
  if (delError) throw new Error(roomsDbErrorMessage(delError, 'Could not reset rooms.'))

  const seed = cloneDefaults()
  const { error } = await supabaseAdmin.from('rooms').insert(seed.map(roomToRow))
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not restore default rooms.'))
  await touchRevision()
  return seed
}

export async function listRoomHighlights(): Promise<RoomHighlight[]> {
  const { data, error } = await supabaseAdmin
    .from('room_highlights')
    .select('id, image, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not load highlight photos.'))
  return ((data as HighlightRow[] | null) ?? [])
    .map(mapHighlight)
    .filter((h) => Boolean(h.image))
}

export async function addRoomHighlight(image: string): Promise<RoomHighlight[]> {
  const url = asString(image)
  if (!url) throw new Error('Image URL is required.')

  const current = await listRoomHighlights()
  if (current.length >= MAX_HIGHLIGHTS) {
    throw new Error(`You can add up to ${MAX_HIGHLIGHTS} highlight photos.`)
  }

  const maxSort = current.length
  const row = {
    id: `highlight-${randomUUID().slice(0, 8)}`,
    image: url,
    sort_order: maxSort + 1,
  }
  const { error } = await supabaseAdmin.from('room_highlights').insert(row)
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not save highlight photo.'))
  await touchRevision()
  return listRoomHighlights()
}

export async function deleteRoomHighlight(id: string): Promise<RoomHighlight[]> {
  const { data, error } = await supabaseAdmin
    .from('room_highlights')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw new Error(roomsDbErrorMessage(error, 'Could not delete highlight photo.'))
  if (!data?.length) throw new Error('Highlight photo not found.')
  await touchRevision()
  return listRoomHighlights()
}

/* __DEFAULT_ROOMS__ */
