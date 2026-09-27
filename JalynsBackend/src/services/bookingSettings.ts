import { supabaseAdmin } from '../config/supabase.js'
import { createJsonCloudStore } from './jsonCloudStore.js'
import { alreadyImported, markImported, relationReady } from './siteDataImport.js'
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

const jsonStore = createJsonCloudStore<BookingSettings>({
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

async function settingsDbReady() {
  const [times, rules, quantity] = await Promise.all([
    relationReady('rooms_settings', 'check_in_time'),
    relationReady('room_extra_person_rules', 'id'),
    relationReady('rooms', 'quantity'),
  ])
  return times && rules && quantity
}

async function readDb(): Promise<BookingSettings> {
  const [{ data: settings, error: settingsError }, { data: rules, error: rulesError }, { data: rooms, error: roomsError }] =
    await Promise.all([
      supabaseAdmin.from('rooms_settings').select('check_in_time, check_out_time').eq('id', 1).maybeSingle(),
      supabaseAdmin.from('room_extra_person_rules').select('id, min_age, max_age, charge, applies_to, sort_order').order('sort_order'),
      supabaseAdmin.from('rooms').select('id, quantity'),
    ])
  if (settingsError) throw new Error(settingsError.message)
  if (rulesError) throw new Error(rulesError.message)
  if (roomsError) throw new Error(roomsError.message)

  const extraPersonRules = (rules ?? [])
    .map((row) => {
      const applies = row.applies_to === 'adults' || row.applies_to === 'kids' || row.applies_to === 'both'
        ? row.applies_to
        : 'both'
      return {
        id: String(row.id),
        minAge: Number(row.min_age),
        maxAge: row.max_age == null ? null : Number(row.max_age),
        charge: Number(row.charge),
        appliesTo: applies,
      } satisfies ExtraPersonRule
    })

  const quantities: Record<string, number> = {}
  for (const room of rooms ?? []) {
    quantities[String(room.id)] = asQuantity(room.quantity, 1)
  }

  return {
    checkInTime: normalizeClock(settings?.check_in_time, DEFAULT_CHECK_IN_TIME),
    checkOutTime: normalizeClock(settings?.check_out_time, DEFAULT_CHECK_OUT_TIME),
    quantities,
    extraPersonRules: extraPersonRules.length
      ? normalizeExtraPersonRules(extraPersonRules, DEFAULT_EXTRA_PERSON_RULES)
      : DEFAULT_EXTRA_PERSON_RULES.map((rule) => ({ ...rule })),
  }
}

async function saveDb(value: BookingSettings) {
  const { data: existing, error: readError } = await supabaseAdmin
    .from('rooms_settings')
    .select('id')
    .eq('id', 1)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  if (existing) {
    const { error } = await supabaseAdmin
      .from('rooms_settings')
      .update({
        check_in_time: value.checkInTime,
        check_out_time: value.checkOutTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabaseAdmin.from('rooms_settings').insert({
      id: 1,
      voucher_enabled: false,
      voucher_percent: 0,
      check_in_time: value.checkInTime,
      check_out_time: value.checkOutTime,
    })
    if (error) throw new Error(error.message)
  }

  const { error: clearError } = await supabaseAdmin.from('room_extra_person_rules').delete().neq('id', '')
  if (clearError) throw new Error(clearError.message)
  if (value.extraPersonRules.length) {
    const { error } = await supabaseAdmin.from('room_extra_person_rules').insert(
      value.extraPersonRules.map((rule, index) => ({
        id: rule.id,
        min_age: rule.minAge,
        max_age: rule.maxAge,
        charge: rule.charge,
        applies_to: rule.appliesTo,
        sort_order: index,
      })),
    )
    if (error) throw new Error(error.message)
  }

  const { data: rooms, error: roomsError } = await supabaseAdmin.from('rooms').select('id')
  if (roomsError) throw new Error(roomsError.message)
  for (const room of rooms ?? []) {
    const { error } = await supabaseAdmin
      .from('rooms')
      .update({ quantity: asQuantity(value.quantities[String(room.id)], 1) })
      .eq('id', room.id)
    if (error) throw new Error(error.message)
  }
}

const store = {
  async load(): Promise<BookingSettings> {
    if (!(await settingsDbReady())) return jsonStore.load()
    if (!(await alreadyImported('booking-settings'))) {
      const legacy = await jsonStore.load()
      await saveDb(legacy)
      await markImported('booking-settings')
    }
    return readDb()
  },
  async save(value: BookingSettings) {
    if (await settingsDbReady()) {
      await saveDb(value)
      return
    }
    await jsonStore.save(value)
  },
}

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
