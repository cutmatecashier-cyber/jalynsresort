import { randomUUID } from 'node:crypto'
import { createJsonCloudStore } from './jsonCloudStore.js'

export type RoomBookingStatus = 'pending' | 'confirmed' | 'completed'

export type RoomBooking = {
  id: string
  room_id: string
  room_name: string
  check_in: string
  check_out: string
  nights: number
  guests: number
  full_name: string
  email: string
  phone: string
  price_per_night: string | null
  estimated_total: string | null
  voucher_percent: number | null
  status: RoomBookingStatus
  created_at: string
}

export type RoomBookingInput = {
  roomId: string
  roomName: string
  checkIn: string
  checkOut: string
  guests: number
  fullName: string
  email: string
  phone: string
  nights?: number
  pricePerNight?: string | null
  estimatedTotal?: string | null
  voucherPercent?: number | null
}

type StoreShape = { bookings: RoomBooking[] }

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return 0
  const start = new Date(`${checkIn}T12:00:00`).getTime()
  const end = new Date(`${checkOut}T12:00:00`).getTime()
  if (end <= start) return 0
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

function sanitizeMoneyText(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/[^\d.]/g, '')
  if (!digits) return trimmed.replace(/^\?+/, '₱').replace(/\uFFFD+/g, '₱')
  const num = Number(digits)
  if (!Number.isFinite(num)) return trimmed.replace(/^\?+(?=\d)/, '₱')
  return `₱${num.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

function normalizeBooking(row: Partial<RoomBooking>): RoomBooking | null {
  const id = String(row.id || '').trim()
  const room_id = String(row.room_id || '').trim()
  const room_name = String(row.room_name || '').trim()
  const check_in = String(row.check_in || '').trim()
  const check_out = String(row.check_out || '').trim()
  const full_name = String(row.full_name || '').trim()
  const email = String(row.email || '').trim()
  const phone = String(row.phone || '').trim()
  if (!id || !room_id || !room_name || !check_in || !check_out || !full_name || !email || !phone) {
    return null
  }
  const guests = Number(row.guests)
  const nights = Number(row.nights)
  const statusRaw = String(row.status || 'confirmed')
  // New bookings auto-confirm; treat legacy "pending" as confirmed.
  const status: RoomBookingStatus = statusRaw === 'completed' ? 'completed' : 'confirmed'
  return {
    id,
    room_id,
    room_name,
    check_in,
    check_out,
    nights: Number.isFinite(nights) && nights > 0 ? nights : nightsBetween(check_in, check_out),
    guests: Number.isFinite(guests) && guests > 0 ? guests : 1,
    full_name,
    email,
    phone,
    price_per_night: sanitizeMoneyText(row.price_per_night),
    estimated_total: sanitizeMoneyText(row.estimated_total),
    voucher_percent:
      typeof row.voucher_percent === 'number' && Number.isFinite(row.voucher_percent)
        ? row.voucher_percent
        : null,
    status,
    created_at: String(row.created_at || new Date().toISOString()),
  }
}

function parseStore(raw: unknown): StoreShape {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Partial<StoreShape>
  const list = Array.isArray(row.bookings) ? row.bookings : Array.isArray(raw) ? raw : []
  return {
    bookings: list
      .map((item) => normalizeBooking(item as Partial<RoomBooking>))
      .filter((b): b is RoomBooking => Boolean(b)),
  }
}

function sortBookings(list: RoomBooking[]) {
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** Cloud-only (Supabase site-data) — required for online deploy. */
const store = createJsonCloudStore<StoreShape>({
  cloudObject: 'room-bookings.json',
  parse: parseStore,
  serialize: (value) => value,
  defaultValue: () => ({ bookings: [] }),
  emptyValue: () => ({ bookings: [] }),
  hasContent: (value) => value.bookings.length > 0,
})

export async function listRoomBookings(): Promise<RoomBooking[]> {
  const data = await store.load()
  return sortBookings(
    data.bookings
      .map((b) => normalizeBooking(b))
      .filter((b): b is RoomBooking => Boolean(b)),
  )
}

export async function createRoomBooking(input: RoomBookingInput): Promise<RoomBooking> {
  const roomId = input.roomId.trim()
  const roomName = input.roomName.trim()
  const checkIn = input.checkIn.trim()
  const checkOut = input.checkOut.trim()
  const fullName = input.fullName.trim()
  const email = input.email.trim()
  const phone = input.phone.trim()
  const guests = input.guests

  if (!roomId || !roomName) throw new Error('Room is required.')
  if (!checkIn || !checkOut) throw new Error('Check-in and check-out dates are required.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    throw new Error('Enter valid check-in and check-out dates.')
  }
  if (checkOut <= checkIn) throw new Error('Check-out must be after check-in.')
  if (!Number.isFinite(guests) || guests < 1 || guests > 20) {
    throw new Error('Number of guests must be between 1 and 20.')
  }
  if (!fullName) throw new Error('Full name is required.')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.')
  }
  if (!phone) throw new Error('Contact number is required.')

  const nights =
    typeof input.nights === 'number' && input.nights > 0
      ? input.nights
      : nightsBetween(checkIn, checkOut)

  const booking: RoomBooking = {
    id: `bk-${randomUUID().slice(0, 10)}`,
    room_id: roomId,
    room_name: roomName,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    guests,
    full_name: fullName,
    email,
    phone,
    price_per_night: sanitizeMoneyText(input.pricePerNight),
    estimated_total: sanitizeMoneyText(input.estimatedTotal),
    voucher_percent:
      typeof input.voucherPercent === 'number' && Number.isFinite(input.voucherPercent)
        ? input.voucherPercent
        : null,
    status: 'confirmed',
    created_at: new Date().toISOString(),
  }

  const current = await store.load()
  await store.save({ bookings: [booking, ...current.bookings] })
  return booking
}

export async function updateRoomBookingStatus(
  id: string,
  status: RoomBookingStatus,
): Promise<RoomBooking[]> {
  const current = await store.load()
  const idx = current.bookings.findIndex((b) => b.id === id)
  if (idx < 0) throw new Error('Booking not found.')
  const nextBookings = current.bookings.map((b) => (b.id === id ? { ...b, status } : b))
  await store.save({ bookings: nextBookings })
  return sortBookings(nextBookings)
}
