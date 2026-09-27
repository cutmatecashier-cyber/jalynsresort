import { createJsonCloudStore } from './jsonCloudStore.js'
import {
  DEFAULT_EXTRA_PERSON_RULES,
  normalizeExtraPersonRules,
  type ExtraPersonRule,
} from './guestPricing.js'

export const DEFAULT_CHECK_IN_TIME = '14:00'
export const DEFAULT_CHECK_OUT_TIME = '11:00'

export type BookingSettings = {
  checkInTime: string
  checkOutTime: string
  quantities: Record<string, number>
  extraPersonRules: ExtraPersonRule[]
}

const TIME_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

export function normalizeClock(value: unknown, fallback: string): string {
  const match = String(value ?? '')
    .trim()
    .match(TIME_RE)
  if (!match) return fallback
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return fallback
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function asQuantity(value: unknown, fallback = 1): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(99, Math.max(1, Math.round(n)))
}

function normalizeQuantities(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = key.trim()
    if (!id) continue
    out[id] = asQuantity(value, 1)
  }
  return out
}

function parseSettings(raw: unknown): BookingSettings {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Partial<BookingSettings>
  return {
    checkInTime: normalizeClock(row.checkInTime, DEFAULT_CHECK_IN_TIME),
    checkOutTime: normalizeClock(row.checkOutTime, DEFAULT_CHECK_OUT_TIME),
    quantities: normalizeQuantities(row.quantities),
    extraPersonRules: normalizeExtraPersonRules(row.extraPersonRules, DEFAULT_EXTRA_PERSON_RULES),
  }
}

const store = createJsonCloudStore<BookingSettings>({
  cloudObject: 'room-booking-settings.json',
  parse: parseSettings,
  serialize: (value) => value,
  defaultValue: () => ({
    checkInTime: DEFAULT_CHECK_IN_TIME,
    checkOutTime: DEFAULT_CHECK_OUT_TIME,
    quantities: {},
    extraPersonRules: DEFAULT_EXTRA_PERSON_RULES.map((rule) => ({ ...rule })),
  }),
  emptyValue: () => ({
    checkInTime: '',
    checkOutTime: '',
    quantities: {},
    extraPersonRules: [],
  }),
  hasContent: (value) => TIME_RE.test(value.checkInTime) && TIME_RE.test(value.checkOutTime),
})

export async function loadBookingSettings(): Promise<BookingSettings> {
  return store.load()
}

export function quantityFor(settings: BookingSettings, roomId: string): number {
  return asQuantity(settings.quantities[roomId], 1)
}

export async function saveBookingSchedule(input: {
  checkInTime?: unknown
  checkOutTime?: unknown
}): Promise<BookingSettings> {
  const current = await store.load()
  const next: BookingSettings = {
    ...current,
    checkInTime: normalizeClock(input.checkInTime ?? current.checkInTime, current.checkInTime),
    checkOutTime: normalizeClock(input.checkOutTime ?? current.checkOutTime, current.checkOutTime),
  }
  await store.save(next)
  return next
}

export async function saveExtraPersonRules(raw: unknown): Promise<ExtraPersonRule[]> {
  if (!Array.isArray(raw)) throw new Error('Extra person rules are required.')
  const current = await store.load()
  const rules = normalizeExtraPersonRules(raw, [])
  if (!rules.length) throw new Error('Add at least one extra-person rule.')
  await store.save({ ...current, extraPersonRules: rules })
  return rules
}

export async function setRoomQuantity(roomId: string, quantity: number): Promise<void> {
  const id = roomId.trim()
  if (!id) return
  const current = await store.load()
  await store.save({
    ...current,
    quantities: { ...current.quantities, [id]: asQuantity(quantity, 1) },
  })
}

export async function removeRoomQuantity(roomId: string): Promise<void> {
  const current = await store.load()
  if (!(roomId in current.quantities)) return
  const quantities = { ...current.quantities }
  delete quantities[roomId]
  await store.save({ ...current, quantities })
}

export async function clearRoomQuantities(): Promise<void> {
  const current = await store.load()
  if (Object.keys(current.quantities).length === 0) return
  await store.save({ ...current, quantities: {} })
}
