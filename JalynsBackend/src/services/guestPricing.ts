/** Extra-guest pricing. Keep in sync with JalynsFrontend/src/lib/guestPricing.ts */

export type ExtraAppliesTo = 'adults' | 'kids' | 'both'
export type ExtraGuestKind = 'adult' | 'kid'

export type ExtraPersonRule = {
  id: string
  minAge: number
  maxAge: number | null
  charge: number
  appliesTo: ExtraAppliesTo
}

export type ExtraGuestQuote = {
  kind: ExtraGuestKind
  age: number
  charge: number
}

export const DEFAULT_EXTRA_PERSON_RULES: ExtraPersonRule[] = [
  { id: 'ages-7-9', minAge: 7, maxAge: 9, charge: 500, appliesTo: 'both' },
  { id: 'ages-10-plus', minAge: 10, maxAge: null, charge: 700, appliesTo: 'both' },
]

export function parseMaxGuests(value: string | null | undefined, fallback = 2): number {
  const match = String(value ?? '').match(/\d+/)
  const n = match ? Number(match[0]) : NaN
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(30, Math.round(n))
}

export function formatMaxGuests(count: number): string {
  const n = parseMaxGuests(String(count), 2)
  return `${n} ${n === 1 ? 'guest' : 'guests'}`
}

export type ExtraSlot = { kind: ExtraGuestKind }

/** Adults fill the included capacity first. Anyone past that capacity is an extra guest. */
export function extraSlots(adults: number, kids: number, capacity: number): ExtraSlot[] {
  const included = Math.max(1, capacity)
  const extraAdults = Math.max(0, adults - included)
  const includedKids = Math.max(0, included - Math.max(0, adults))
  const extraKids = Math.max(0, kids - includedKids)
  return [
    ...Array.from({ length: extraAdults }, () => ({ kind: 'adult' as const })),
    ...Array.from({ length: extraKids }, () => ({ kind: 'kid' as const })),
  ]
}

/** Extra adults are priced as 10+ and are not asked for an age. */
export const ADULT_EXTRA_AGE = 10

export function chargeForExtraGuest(
  age: number,
  kind: ExtraGuestKind,
  rules: ExtraPersonRule[],
): number {
  const applies = kind === 'adult' ? 'adults' : 'kids'
  for (const rule of rules) {
    if (rule.appliesTo !== 'both' && rule.appliesTo !== applies) continue
    if (age < rule.minAge) continue
    if (rule.maxAge != null && age > rule.maxAge) continue
    return rule.charge
  }
  return 0
}

export function quoteExtraGuests(
  slots: ExtraSlot[],
  ages: number[],
  rules: ExtraPersonRule[],
): ExtraGuestQuote[] {
  return slots.map((slot, index) => {
    if (slot.kind === 'adult') {
      return {
        kind: 'adult',
        age: ADULT_EXTRA_AGE,
        charge: chargeForExtraGuest(ADULT_EXTRA_AGE, 'adult', rules),
      }
    }
    const age = ages[index]
    const charge =
      Number.isInteger(age) && age >= 0 && age <= 120
        ? chargeForExtraGuest(age, 'kid', rules)
        : 0
    return { kind: 'kid', age, charge }
  })
}

/** Extra-person rates are per guest per night. */
export function extraChargeForStay(perNight: number, nights: number): number {
  const stayNights = Number.isFinite(nights) && nights > 0 ? Math.round(nights) : 0
  const rate = Number.isFinite(perNight) && perNight > 0 ? perNight : 0
  return rate * stayNights
}

export function normalizeExtraPersonRules(raw: unknown, whenMissing: ExtraPersonRule[]): ExtraPersonRule[] {
  if (!Array.isArray(raw)) return whenMissing.map((rule) => ({ ...rule }))
  const rules: ExtraPersonRule[] = []
  for (const item of raw) {
    const row = (item && typeof item === 'object' ? item : {}) as Partial<ExtraPersonRule>
    const minAge = Math.round(Number(row.minAge))
    const maxRaw = row.maxAge
    const maxAge =
      maxRaw == null || maxRaw === ('' as unknown)
        ? null
        : Number.isFinite(Number(maxRaw))
          ? Math.round(Number(maxRaw))
          : null
    const charge = Math.round(Number(row.charge))
    const appliesTo: ExtraAppliesTo =
      row.appliesTo === 'adults' || row.appliesTo === 'kids' || row.appliesTo === 'both'
        ? row.appliesTo
        : 'both'
    if (!Number.isInteger(minAge) || minAge < 0 || minAge > 120) continue
    if (maxAge != null && (maxAge < minAge || maxAge > 120)) continue
    if (!Number.isInteger(charge) || charge < 0 || charge > 100000) continue
    rules.push({
      id: String(row.id || '').trim() || `rule-${rules.length + 1}`,
      minAge,
      maxAge,
      charge,
      appliesTo,
    })
    if (rules.length >= 12) break
  }
  return rules
}
