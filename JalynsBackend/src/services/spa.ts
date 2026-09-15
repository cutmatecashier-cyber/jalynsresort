import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

export type SpaService = {
  id: string
  category_id: string
  name: string
  mins: number | null
  rate: string
  sort_order: number
}

export type SpaCategory = {
  id: string
  label: string
  note: string | null
  image_url: string | null
  sort_order: number
  services: SpaService[]
}

type Store = {
  categories: Omit<SpaCategory, 'services'>[]
  services: SpaService[]
}

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const fallbackFile = path.join(dataDir, 'spa.json')

const DEFAULT_SEED: Store = {
  categories: [
    {
      id: 'seed-massage',
      label: 'Massage',
      note: null,
      image_url:
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
      sort_order: 1,
    },
    {
      id: 'seed-packages',
      label: 'Packages',
      note: 'Combination treatments for a fuller spa day.',
      image_url:
        'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80',
      sort_order: 2,
    },
    {
      id: 'seed-beauty',
      label: 'Beauty',
      note: null,
      image_url:
        'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80',
      sort_order: 3,
    },
    {
      id: 'seed-waxing',
      label: 'Hair removal',
      note: null,
      image_url:
        'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80',
      sort_order: 4,
    },
    {
      id: 'seed-scrubs',
      label: 'Body scrubs',
      note: null,
      image_url:
        'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=1200&q=80',
      sort_order: 5,
    },
  ],
  services: [
    { id: 's-m1', category_id: 'seed-massage', name: 'Swedish', mins: 60, rate: '₱500', sort_order: 1 },
    { id: 's-m2', category_id: 'seed-massage', name: 'Shiatsu', mins: 60, rate: '₱500', sort_order: 2 },
    { id: 's-m3', category_id: 'seed-massage', name: 'Thai', mins: 60, rate: '₱500', sort_order: 3 },
    {
      id: 's-m4',
      category_id: 'seed-massage',
      name: 'Reflexzone Signature Massage (Shiatsu, Swedish, Thai & reflexology)',
      mins: 60,
      rate: '₱500',
      sort_order: 4,
    },
    {
      id: 's-m5',
      category_id: 'seed-massage',
      name: 'Foot massage with reflexology',
      mins: 60,
      rate: '₱500',
      sort_order: 5,
    },
    {
      id: 's-m6',
      category_id: 'seed-massage',
      name: 'Natural Face Lift Massage',
      mins: 60,
      rate: '₱500',
      sort_order: 6,
    },
    {
      id: 's-m7',
      category_id: 'seed-massage',
      name: 'Thai Foot Stick Massage',
      mins: 60,
      rate: '₱500',
      sort_order: 7,
    },
    {
      id: 's-m8',
      category_id: 'seed-massage',
      name: 'Herbal Bali Massage',
      mins: 60,
      rate: '₱1,300',
      sort_order: 8,
    },
    {
      id: 's-m9',
      category_id: 'seed-massage',
      name: 'Pinoy Hilot Massage',
      mins: 60,
      rate: '₱500',
      sort_order: 9,
    },
    {
      id: 's-m10',
      category_id: 'seed-massage',
      name: 'Ventuza Cupping with Back Massage',
      mins: 60,
      rate: '₱600',
      sort_order: 10,
    },
    {
      id: 's-m11',
      category_id: 'seed-massage',
      name: 'Body Massage with Ventuza',
      mins: 90,
      rate: '₱900',
      sort_order: 11,
    },
    {
      id: 's-m12',
      category_id: 'seed-massage',
      name: 'Twin Massage',
      mins: 60,
      rate: '₱1,000',
      sort_order: 12,
    },
    {
      id: 's-m13',
      category_id: 'seed-massage',
      name: 'Aromatherapy with Special Reflexzone Pre-Blended Oils',
      mins: 60,
      rate: '₱500',
      sort_order: 13,
    },
    {
      id: 's-m14',
      category_id: 'seed-massage',
      name: 'Japanese Shitao Stone Body Treatment',
      mins: 60,
      rate: '₱1,400',
      sort_order: 14,
    },
    {
      id: 's-m15',
      category_id: 'seed-massage',
      name: 'Japanese Shitao Stone Treatment for face & body (with Special Reflexzone Oil)',
      mins: 90,
      rate: '₱1,400',
      sort_order: 15,
    },
    {
      id: 's-p1',
      category_id: 'seed-packages',
      name: 'Package 1 — Shiatsu, Swedish, Reflex & Thai / Aromatherapy / Body Scrub',
      mins: null,
      rate: '₱1,000',
      sort_order: 1,
    },
    {
      id: 's-p2',
      category_id: 'seed-packages',
      name: 'Package 2 — Package 1 + Foot Spa with free Pedicure',
      mins: null,
      rate: '₱1,600',
      sort_order: 2,
    },
    {
      id: 's-p3',
      category_id: 'seed-packages',
      name: 'Package 3 — Package 2 + Facial Spa',
      mins: null,
      rate: '₱2,200',
      sort_order: 3,
    },
    {
      id: 's-p4',
      category_id: 'seed-packages',
      name: 'Package 4 — Hot Stone Massage / Aromatherapy / Body Scrub / Foot Spa with free Pedicure / Facial Spa',
      mins: null,
      rate: '₱2,850',
      sort_order: 4,
    },
    {
      id: 's-b1',
      category_id: 'seed-beauty',
      name: 'Foot Spa with Free Pedicure',
      mins: null,
      rate: '₱800',
      sort_order: 1,
    },
    { id: 's-b2', category_id: 'seed-beauty', name: 'Manicure', mins: null, rate: '₱150', sort_order: 2 },
    { id: 's-b3', category_id: 'seed-beauty', name: 'Pedicure', mins: null, rate: '₱150', sort_order: 3 },
    {
      id: 's-b4',
      category_id: 'seed-beauty',
      name: 'Nail Art',
      mins: null,
      rate: '₱350 / ₱450 / ₱550',
      sort_order: 4,
    },
    {
      id: 's-b5',
      category_id: 'seed-beauty',
      name: 'Reflexzone Facial',
      mins: null,
      rate: '₱800',
      sort_order: 5,
    },
    {
      id: 's-b6',
      category_id: 'seed-beauty',
      name: 'NU SKIN (Galanic Spa)',
      mins: null,
      rate: '₱1,200',
      sort_order: 6,
    },
    {
      id: 's-w1',
      category_id: 'seed-waxing',
      name: 'Paraffin Waxing with free Pedicure or Manicure',
      mins: null,
      rate: '₱600',
      sort_order: 1,
    },
    {
      id: 's-w2',
      category_id: 'seed-waxing',
      name: 'Waxing — half/full legs, underarm, body, bikini line, chin, back, upper lip, hands, nape, eyebrows',
      mins: null,
      rate: '₱600',
      sort_order: 2,
    },
    {
      id: 's-w3',
      category_id: 'seed-waxing',
      name: 'Brazilian Waxing',
      mins: null,
      rate: '₱600',
      sort_order: 3,
    },
    {
      id: 's-sc1',
      category_id: 'seed-scrubs',
      name: 'Kojic Body Scrub',
      mins: null,
      rate: '₱900',
      sort_order: 1,
    },
    {
      id: 's-sc2',
      category_id: 'seed-scrubs',
      name: 'Ginger Zest Body Scrub',
      mins: null,
      rate: '₱700',
      sort_order: 2,
    },
    {
      id: 's-sc3',
      category_id: 'seed-scrubs',
      name: 'Lavender Body Scrub',
      mins: null,
      rate: '₱700',
      sort_order: 3,
    },
    {
      id: 's-sc4',
      category_id: 'seed-scrubs',
      name: 'Olive Body Scrub',
      mins: null,
      rate: '₱700',
      sort_order: 4,
    },
    {
      id: 's-sc5',
      category_id: 'seed-scrubs',
      name: 'White Apricot Scrub Glutathione',
      mins: null,
      rate: '₱1,000',
      sort_order: 5,
    },
    {
      id: 's-sc6',
      category_id: 'seed-scrubs',
      name: 'Green Seaweed Marine Scrub',
      mins: null,
      rate: '₱1,000',
      sort_order: 6,
    },
    {
      id: 's-sc7',
      category_id: 'seed-scrubs',
      name: 'Soothing Egyptian Ear Candling with Back Massage',
      mins: null,
      rate: '₱800',
      sort_order: 7,
    },
  ],
}

function isMissingTableError(message: string) {
  return /Could not find the table|relation .* does not exist|PGRST205/i.test(message)
}

function nest(store: Store): SpaCategory[] {
  const cats = [...store.categories].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
  return cats.map((c) => ({
    ...c,
    services: store.services
      .filter((s) => s.category_id === c.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  }))
}

async function readFallback(): Promise<Store> {
  try {
    const raw = await readFile(fallbackFile, 'utf8')
    const parsed = JSON.parse(raw) as Store
    if (parsed?.categories && parsed?.services) return parsed
  } catch {
    // seed below
  }
  const seeded: Store = {
    categories: DEFAULT_SEED.categories.map((c) => ({ ...c })),
    services: DEFAULT_SEED.services.map((s) => ({ ...s })),
  }
  await writeFallback(seeded)
  return seeded
}

async function writeFallback(store: Store) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(fallbackFile, JSON.stringify(store, null, 2), 'utf8')
}

function mapCategory(row: Record<string, unknown>): Omit<SpaCategory, 'services'> {
  return {
    id: String(row.id),
    label: String(row.label ?? row.name ?? ''),
    note: row.note == null || row.note === '' ? null : String(row.note),
    image_url: row.image_url == null || row.image_url === '' ? null : String(row.image_url),
    sort_order: Number(row.sort_order ?? 0),
  }
}

function mapService(row: Record<string, unknown>): SpaService {
  let mins: number | null = null
  if (row.mins !== null && row.mins !== undefined && String(row.mins).trim() !== '') {
    const n = Number(row.mins)
    mins = Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }
  return {
    id: String(row.id),
    category_id: String(row.category_id),
    name: String(row.name),
    mins,
    rate: String(row.rate ?? ''),
    sort_order: Number(row.sort_order ?? 0),
  }
}

function validateImageUrl(raw: unknown): string | null {
  const imageRaw = String(raw ?? '').trim()
  if (!imageRaw) return null
  if (imageRaw.startsWith('/')) return imageRaw
  try {
    new URL(imageRaw)
    return imageRaw
  } catch {
    throw new Error('Enter a valid image URL or upload a picture.')
  }
}

function validateCategoryInput(input: {
  label?: unknown
  name?: unknown
  note?: unknown
  image_url?: unknown
  sort_order?: unknown
}) {
  const label = String(input.label ?? input.name ?? '').trim()
  if (!label || label.length < 2) throw new Error('Category name must be at least 2 characters.')
  const noteRaw = String(input.note ?? '').trim()
  const note = noteRaw || null
  const image_url = validateImageUrl(input.image_url)
  const sort_order = Number(input.sort_order ?? 0)
  if (!Number.isFinite(sort_order)) throw new Error('Sort order must be a number.')
  return { label, note, image_url, sort_order: Math.round(sort_order) }
}

function validateServiceInput(input: {
  category_id?: unknown
  name?: unknown
  mins?: unknown
  rate?: unknown
  sort_order?: unknown
}) {
  const category_id = String(input.category_id ?? '').trim()
  if (!category_id) throw new Error('Category is required.')
  const name = String(input.name ?? '').trim()
  if (!name || name.length < 2) throw new Error('Service name must be at least 2 characters.')
  let mins: number | null = null
  if (input.mins !== null && input.mins !== undefined && String(input.mins).trim() !== '') {
    const n = Number(input.mins)
    if (!Number.isFinite(n) || n < 0) throw new Error('Enter a valid duration in minutes.')
    mins = n === 0 ? null : Math.round(n)
  }
  const rate = String(input.rate ?? '').trim()
  if (!rate) throw new Error('Rate is required (e.g. ₱500).')
  const sort_order = Number(input.sort_order ?? 0)
  if (!Number.isFinite(sort_order)) throw new Error('Sort order must be a number.')
  return { category_id, name, mins, rate, sort_order: Math.round(sort_order) }
}

export async function listSpa(): Promise<SpaCategory[]> {
  try {
    const { data: cats, error: catErr } = await supabaseAdmin
      .from('spa_categories')
      .select('id, label, note, image_url, sort_order')
      .order('sort_order', { ascending: true })

    if (catErr) {
      if (isMissingTableError(catErr.message || '')) return nest(await readFallback())
      throw new Error(catErr.message)
    }

    const { data: services, error: svcErr } = await supabaseAdmin
      .from('spa_services')
      .select('id, category_id, name, mins, rate, sort_order')
      .order('sort_order', { ascending: true })

    if (svcErr) {
      if (isMissingTableError(svcErr.message || '')) return nest(await readFallback())
      throw new Error(svcErr.message)
    }

    const mappedCats = (cats ?? []).map((r) => mapCategory(r as Record<string, unknown>))
    const mappedServices = (services ?? []).map((r) => mapService(r as Record<string, unknown>))
    if (!mappedCats.length) {
      const local = await readFallback()
      if (local.categories.length) return nest(local)
    }
    return nest({ categories: mappedCats, services: mappedServices })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      return nest(await readFallback())
    }
    throw err
  }
}

export async function createCategory(input: {
  label?: unknown
  name?: unknown
  note?: unknown
  image_url?: unknown
  sort_order?: unknown
}): Promise<Omit<SpaCategory, 'services'>> {
  const data = validateCategoryInput(input)
  try {
    const { data: row, error } = await supabaseAdmin
      .from('spa_categories')
      .insert(data)
      .select('id, label, note, image_url, sort_order')
      .single()
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        const cat = { id: randomUUID(), ...data }
        store.categories.push(cat)
        await writeFallback(store)
        return cat
      }
      throw new Error(error.message)
    }
    return mapCategory(row as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      const cat = { id: randomUUID(), ...data }
      store.categories.push(cat)
      await writeFallback(store)
      return cat
    }
    throw err
  }
}

export async function updateCategory(
  id: string,
  input: { label?: unknown; name?: unknown; note?: unknown; image_url?: unknown; sort_order?: unknown },
): Promise<Omit<SpaCategory, 'services'>> {
  const data = validateCategoryInput(input)
  try {
    const { data: row, error } = await supabaseAdmin
      .from('spa_categories')
      .update(data)
      .eq('id', id)
      .select('id, label, note, image_url, sort_order')
      .single()
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        const idx = store.categories.findIndex((c) => c.id === id)
        if (idx < 0) throw new Error('Category not found.')
        store.categories[idx] = { id, ...data }
        await writeFallback(store)
        return store.categories[idx]
      }
      throw new Error(error.message)
    }
    return mapCategory(row as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      const idx = store.categories.findIndex((c) => c.id === id)
      if (idx < 0) throw new Error('Category not found.')
      store.categories[idx] = { id, ...data }
      await writeFallback(store)
      return store.categories[idx]
    }
    throw err
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('spa_categories').delete().eq('id', id)
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        store.categories = store.categories.filter((c) => c.id !== id)
        store.services = store.services.filter((s) => s.category_id !== id)
        await writeFallback(store)
        return
      }
      throw new Error(error.message)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      store.categories = store.categories.filter((c) => c.id !== id)
      store.services = store.services.filter((s) => s.category_id !== id)
      await writeFallback(store)
      return
    }
    throw err
  }
}

export async function createService(input: {
  category_id?: unknown
  name?: unknown
  mins?: unknown
  rate?: unknown
  sort_order?: unknown
}): Promise<SpaService> {
  const data = validateServiceInput(input)
  try {
    const { data: row, error } = await supabaseAdmin
      .from('spa_services')
      .insert(data)
      .select('id, category_id, name, mins, rate, sort_order')
      .single()
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        if (!store.categories.some((c) => c.id === data.category_id)) {
          throw new Error('Category not found.')
        }
        const service: SpaService = { id: randomUUID(), ...data }
        store.services.push(service)
        await writeFallback(store)
        return service
      }
      throw new Error(error.message)
    }
    return mapService(row as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      if (!store.categories.some((c) => c.id === data.category_id)) {
        throw new Error('Category not found.')
      }
      const service: SpaService = { id: randomUUID(), ...data }
      store.services.push(service)
      await writeFallback(store)
      return service
    }
    throw err
  }
}

export async function updateService(
  id: string,
  input: {
    category_id?: unknown
    name?: unknown
    mins?: unknown
    rate?: unknown
    sort_order?: unknown
  },
): Promise<SpaService> {
  const data = validateServiceInput(input)
  try {
    const { data: row, error } = await supabaseAdmin
      .from('spa_services')
      .update(data)
      .eq('id', id)
      .select('id, category_id, name, mins, rate, sort_order')
      .single()
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        const idx = store.services.findIndex((s) => s.id === id)
        if (idx < 0) throw new Error('Service not found.')
        store.services[idx] = { id, ...data }
        await writeFallback(store)
        return store.services[idx]
      }
      throw new Error(error.message)
    }
    return mapService(row as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      const idx = store.services.findIndex((s) => s.id === id)
      if (idx < 0) throw new Error('Service not found.')
      store.services[idx] = { id, ...data }
      await writeFallback(store)
      return store.services[idx]
    }
    throw err
  }
}

export async function deleteService(id: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('spa_services').delete().eq('id', id)
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        store.services = store.services.filter((s) => s.id !== id)
        await writeFallback(store)
        return
      }
      throw new Error(error.message)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      store.services = store.services.filter((s) => s.id !== id)
      await writeFallback(store)
      return
    }
    throw err
  }
}
