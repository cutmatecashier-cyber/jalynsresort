import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'
import { loadBookingSettings } from './bookingSettings.js'
import { createJsonCloudStore } from './jsonCloudStore.js'
import { alreadyImported, markImported, relationReady } from './siteDataImport.js'
import {
  extraSlots,
  parseMaxGuests,
  ADULT_EXTRA_AGE,
  extraChargeForStay,
  quoteExtraGuests,
  type ExtraGuestKind,
  type ExtraGuestQuote,
} from './guestPricing.js'
import { clockToMinutes, stayFits } from './roomAvailability.js'
import { getRoomsVoucher, listRooms } from './rooms.js'

export type RoomBookingStatus = 'pending' | 'confirmed' | 'completed'

export type RoomBooking = {
  id: string
  room_id: string
  room_name: string
  check_in: string
  check_out: string
  nights: number
  guests: number
  adults: number
  kids: number
  extra_guests: ExtraGuestQuote[]
  extra_person_total: number
  full_name: string
  email: string
  phone: string
  price_per_night: string | null
  estimated_total: string | null
  voucher_percent: number | null
  paypal_order_id: string | null
  paypal_capture_id: string | null
  status: RoomBookingStatus
  created_at: string
}

export type RoomBookingInput = {
  roomId: string
  roomName: string
  checkIn: string
  checkOut: string
  guests: number
  adults?: number
  kids?: number
  extraGuests?: Array<{ kind?: ExtraGuestKind; age?: number }>
  fullName: string
  email: string
  phone: string
  nights?: number
  pricePerNight?: string | null
  estimatedTotal?: string | null
  voucherPercent?: number | null
  paypalOrderId?: string | null
  paypalCaptureId?: string | null
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

function normalizeStoredExtras(raw: unknown): ExtraGuestQuote[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = (item && typeof item === 'object' ? item : {}) as Partial<ExtraGuestQuote>
      const age = Math.round(Number(row.age))
      const charge = Math.round(Number(row.charge))
      const kind: ExtraGuestKind = row.kind === 'adult' ? 'adult' : 'kid'
      if (!Number.isInteger(age) || age < 0 || age > 120) return null
      if (!Number.isInteger(charge) || charge < 0) return null
      return { kind, age, charge }
    })
    .filter((item): item is ExtraGuestQuote => Boolean(item))
}

function normalizeExtraTotal(raw: unknown, extras: unknown): number {
  const n = Math.round(Number(raw))
  if (Number.isInteger(n) && n >= 0) return n
  return normalizeStoredExtras(extras).reduce((sum, guest) => sum + guest.charge, 0)
}

function peso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

function parsePeso(value: string | null | undefined): number | null {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw || (/contact/i.test(raw) && !/\d/.test(raw))) return null
  const digits = raw.replace(/[^\d.]/g, '')
  if (!digits) return null
  const num = Number(digits)
  return Number.isFinite(num) ? Math.round(num) : null
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
  const adultsRaw = Number(row.adults)
  const kidsRaw = Number(row.kids)
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
    adults:
      Number.isInteger(adultsRaw) && adultsRaw >= 0
        ? adultsRaw
        : Number.isFinite(guests) && guests > 0
          ? guests
          : 1,
    kids: Number.isInteger(kidsRaw) && kidsRaw >= 0 ? kidsRaw : 0,
    extra_guests: normalizeStoredExtras(row.extra_guests),
    extra_person_total: normalizeExtraTotal(row.extra_person_total, row.extra_guests),
    full_name,
    email,
    phone,
    price_per_night: sanitizeMoneyText(row.price_per_night),
    estimated_total: sanitizeMoneyText(row.estimated_total),
    voucher_percent:
      typeof row.voucher_percent === 'number' && Number.isFinite(row.voucher_percent)
        ? row.voucher_percent
        : null,
    paypal_order_id: String(row.paypal_order_id || '').trim() || null,
    paypal_capture_id: String(row.paypal_capture_id || '').trim() || null,
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

const jsonStore = createJsonCloudStore<StoreShape>({
  cloudObject: 'room-bookings.json',
  parse: parseStore,
  serialize: (value) => value,
  defaultValue: () => ({ bookings: [] }),
  emptyValue: () => ({ bookings: [] }),
  hasContent: (value) => value.bookings.length > 0,
})

function toRow(booking: RoomBooking) {
  return {
    id: booking.id,
    room_id: booking.room_id,
    room_name: booking.room_name,
    check_in: booking.check_in,
    check_out: booking.check_out,
    nights: booking.nights,
    guests: booking.guests,
    adults: booking.adults,
    kids: booking.kids,
    extra_guests: booking.extra_guests,
    extra_person_total: booking.extra_person_total,
    full_name: booking.full_name,
    email: booking.email,
    phone: booking.phone,
    price_per_night: booking.price_per_night,
    estimated_total: booking.estimated_total,
    voucher_percent: booking.voucher_percent,
    paypal_order_id: booking.paypal_order_id,
    paypal_capture_id: booking.paypal_capture_id,
    status: booking.status,
    created_at: booking.created_at,
  }
}

async function listFromDb(): Promise<RoomBooking[]> {
  const { data, error } = await supabaseAdmin
    .from('room_bookings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return sortBookings(
    (data ?? [])
      .map((row) => normalizeBooking(row as Partial<RoomBooking>))
      .filter((booking): booking is RoomBooking => Boolean(booking)),
  )
}

async function importBookingsOnce() {
  if (await alreadyImported('room-bookings')) return
  const { count, error: countError } = await supabaseAdmin
    .from('room_bookings')
    .select('id', { count: 'exact', head: true })
  if (countError) throw new Error(countError.message)
  if (!count) {
    const legacy = await jsonStore.load()
    if (legacy.bookings.length) {
      const { error } = await supabaseAdmin.from('room_bookings').upsert(legacy.bookings.map(toRow))
      if (error) throw new Error(error.message)
    }
  }
  await markImported('room-bookings')
}

async function loadBookings(): Promise<RoomBooking[]> {
  if (await relationReady('room_bookings')) {
    await importBookingsOnce()
    return listFromDb()
  }
  const data = await jsonStore.load()
  return sortBookings(data.bookings)
}

export async function listRoomBookings(): Promise<RoomBooking[]> {
  return loadBookings()
}

async function buildRoomBooking(input: RoomBookingInput): Promise<RoomBooking> {
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

  const nights = nightsBetween(checkIn, checkOut)
  if (nights < 1) throw new Error('Check-out must be after check-in.')

  const [rooms, settings, voucher, currentBookings] = await Promise.all([
    listRooms(),
    loadBookingSettings(),
    getRoomsVoucher(),
    loadBookings(),
  ])
  const room = rooms.find((item) => item.id === roomId)
  if (!room) throw new Error('Room not found.')
  if (room.status === 'unavailable') throw new Error('This room type is unavailable.')
  const stays = currentBookings
    .filter((item) => item.room_id === roomId && item.status !== 'completed')
    .map((item) => ({ checkIn: item.check_in, checkOut: item.check_out }))
  if (
    !stayFits(
      stays,
      checkIn,
      checkOut,
      room.quantity,
      clockToMinutes(settings.checkInTime),
      clockToMinutes(settings.checkOutTime),
    )
  ) {
    throw new Error('Those dates are fully booked for this room type.')
  }

  const adults =
    typeof input.adults === 'number' && Number.isInteger(input.adults) ? input.adults : guests
  const kids = typeof input.kids === 'number' && Number.isInteger(input.kids) ? input.kids : 0
  if (adults < 1 || adults > 12) throw new Error('Enter at least 1 adult (up to 12).')
  if (kids < 0 || kids > 12) throw new Error('Kids must be between 0 and 12.')
  const totalGuests = adults + kids
  if (totalGuests > 20) throw new Error('A room can be booked for up to 20 guests.')

  const slots = extraSlots(adults, kids, parseMaxGuests(room.max_capacity))
  const submitted = Array.isArray(input.extraGuests) ? input.extraGuests : []
  const kidSubmissions = submitted.filter((item) => item.kind !== 'adult')
  const kidSlotCount = slots.filter((slot) => slot.kind === 'kid').length
  if (kidSlotCount && kidSubmissions.length !== kidSlotCount) {
    throw new Error('Enter the age of each extra child.')
  }
  let kidCursor = 0
  const ages = slots.map((slot) => {
    if (slot.kind === 'adult') return ADULT_EXTRA_AGE
    return Math.round(Number(kidSubmissions[kidCursor++]?.age))
  })
  if (
    slots.some(
      (slot, index) =>
        slot.kind === 'kid' &&
        (!Number.isInteger(ages[index]) || ages[index] < 0 || ages[index] > 120),
    )
  ) {
    throw new Error('Enter a valid age for each extra child.')
  }
  const extraGuests = quoteExtraGuests(slots, ages, settings.extraPersonRules)
  const extraPerNight = extraGuests.reduce((sum, guest) => sum + guest.charge, 0)
  const extraTotal = extraChargeForStay(extraPerNight, nights)
  const baseNightly = parsePeso(room.price_per_night)
  if (baseNightly == null || baseNightly <= 0) {
    throw new Error('This room has no online rate. Contact the resort to book.')
  }
  const voucherPercent =
    voucher.enabled && voucher.percent > 0 ? Math.min(100, voucher.percent) : 0
  const nightly =
    voucherPercent > 0
      ? Math.max(0, Math.round(baseNightly * (1 - voucherPercent / 100)))
      : baseNightly
  const amount = nightly * nights + extraTotal
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('This stay cannot be paid online.')
  }

  const booking: RoomBooking = {
    id: `bk-${randomUUID().slice(0, 10)}`,
    room_id: roomId,
    room_name: roomName,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    guests: totalGuests,
    adults,
    kids,
    extra_guests: extraGuests,
    extra_person_total: extraTotal,
    full_name: fullName,
    email,
    phone,
    price_per_night: peso(nightly),
    estimated_total: peso(amount),
    voucher_percent: voucherPercent > 0 ? Math.round(voucherPercent) : null,
    paypal_order_id: String(input.paypalOrderId || '').trim() || null,
    paypal_capture_id: String(input.paypalCaptureId || '').trim() || null,
    status: 'confirmed',
    created_at: new Date().toISOString(),
  }

  return booking
}

export async function quoteRoomBooking(input: RoomBookingInput): Promise<number> {
  const booking = await buildRoomBooking(input)
  const amount = parsePeso(booking.estimated_total)
  if (amount == null || amount <= 0) throw new Error('This stay cannot be paid online.')
  return amount
}

export async function findBookingByPayPalOrder(orderId: string): Promise<RoomBooking | null> {
  const id = orderId.trim()
  if (!id) return null
  const list = await loadBookings()
  return list.find((item) => item.paypal_order_id === id) ?? null
}

async function insertBookingRow(booking: RoomBooking) {
  const row = toRow(booking)
  const { error } = await supabaseAdmin.from('room_bookings').insert(row)
  if (error && /paypal_/i.test(error.message)) {
    const { paypal_order_id: _order, paypal_capture_id: _capture, ...rest } = row
    const retry = await supabaseAdmin.from('room_bookings').insert(rest)
    if (retry.error) throw new Error(retry.error.message)
    return
  }
  if (error) throw new Error(error.message)
}

export async function createRoomBooking(input: RoomBookingInput): Promise<RoomBooking> {
  const booking = await buildRoomBooking(input)
  if (await relationReady('room_bookings')) {
    await insertBookingRow(booking)
  } else {
    const current = await jsonStore.load()
    await jsonStore.save({ bookings: [booking, ...current.bookings] })
  }
  return booking
}

export async function updateRoomBookingStatus(
  id: string,
  status: RoomBookingStatus,
): Promise<RoomBooking[]> {
  if (await relationReady('room_bookings')) {
    const { data, error } = await supabaseAdmin
      .from('room_bookings')
      .update({ status })
      .eq('id', id)
      .select('id')
    if (error) throw new Error(error.message)
    if (!data?.length) throw new Error('Booking not found.')
    return listFromDb()
  }
  const current = await jsonStore.load()
  const idx = current.bookings.findIndex((b) => b.id === id)
  if (idx < 0) throw new Error('Booking not found.')
  const nextBookings = current.bookings.map((b) => (b.id === id ? { ...b, status } : b))
  await jsonStore.save({ bookings: nextBookings })
  return sortBookings(nextBookings)
}
