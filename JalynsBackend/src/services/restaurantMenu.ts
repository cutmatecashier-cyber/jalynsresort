import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

export type MenuItem = {
  id: string
  category_id: string
  name: string
  description: string
  price: number | null
  image_url: string | null
  sort_order: number
  available: boolean
}

export type MenuCategory = {
  id: string
  name: string
  sort_order: number
  items: MenuItem[]
}

type Store = {
  categories: Omit<MenuCategory, 'items'>[]
  items: MenuItem[]
}

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const fallbackFile = path.join(dataDir, 'restaurant-menu.json')

const DEFAULT_SEED: Omit<MenuCategory, 'items'>[] = [
  { id: 'seed-breakfast', name: 'Breakfast', sort_order: 1 },
  { id: 'seed-salad', name: 'Salad & Soup', sort_order: 2 },
  { id: 'seed-seafood', name: 'Seafood & Filipino', sort_order: 3 },
  { id: 'seed-german', name: 'German Dishes', sort_order: 4 },
  { id: 'seed-pasta', name: 'Pasta', sort_order: 5 },
  { id: 'seed-beef', name: 'Beef', sort_order: 6 },
  { id: 'seed-burgers', name: 'Burgers', sort_order: 7 },
  { id: 'seed-pizza', name: 'Pizza', sort_order: 8 },
  { id: 'seed-pork', name: 'Pork', sort_order: 9 },
  { id: 'seed-chicken', name: 'Chicken', sort_order: 10 },
  { id: 'seed-desserts', name: 'Desserts', sort_order: 11 },
]

function isMissingTableError(message: string) {
  return /Could not find the table|relation .* does not exist|PGRST205/i.test(message)
}

function nest(store: Store): MenuCategory[] {
  const cats = [...store.categories].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  )
  return cats.map((c) => ({
    ...c,
    items: store.items
      .filter((i) => i.category_id === c.id)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
  }))
}

async function readFallback(): Promise<Store> {
  try {
    const raw = await readFile(fallbackFile, 'utf8')
    const parsed = JSON.parse(raw) as Store
    if (parsed?.categories && parsed?.items) return parsed
  } catch {
    // seed below
  }
  return {
    categories: DEFAULT_SEED.map((c) => ({ ...c })),
    items: [],
  }
}

async function writeFallback(store: Store) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(fallbackFile, JSON.stringify(store, null, 2), 'utf8')
}

function mapCategory(row: Record<string, unknown>): Omit<MenuCategory, 'items'> {
  return {
    id: String(row.id),
    name: String(row.name),
    sort_order: Number(row.sort_order ?? 0),
  }
}

function localUploadExists(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  if (!imageUrl.startsWith('/uploads/')) return imageUrl
  const full = path.resolve(dataDir, '..', imageUrl.replace(/^\//, ''))
  try {
    return existsSync(full) ? imageUrl : null
  } catch {
    return null
  }
}

function mapItem(row: Record<string, unknown>): MenuItem {
  const priceRaw = row.price
  let price: number | null = null
  if (priceRaw !== null && priceRaw !== undefined && priceRaw !== '') {
    const n = Number(priceRaw)
    price = Number.isFinite(n) ? n : null
  }
  const rawImage =
    row.image_url == null || row.image_url === '' ? null : String(row.image_url)
  return {
    id: String(row.id),
    category_id: String(row.category_id),
    name: String(row.name),
    description: String(row.description ?? ''),
    price,
    image_url: localUploadExists(rawImage),
    sort_order: Number(row.sort_order ?? 0),
    available: row.available !== false,
  }
}

export async function listMenu(): Promise<MenuCategory[]> {
  try {
    const { data: cats, error: catErr } = await supabaseAdmin
      .from('restaurant_menu_categories')
      .select('id, name, sort_order')
      .order('name', { ascending: true })

    if (catErr) {
      if (isMissingTableError(catErr.message || '')) {
        return nest(await readFallback())
      }
      throw new Error(catErr.message)
    }

    const { data: items, error: itemErr } = await supabaseAdmin
      .from('restaurant_menu_items')
      .select('id, category_id, name, description, price, image_url, sort_order, available')
      .order('name', { ascending: true })

    if (itemErr) {
      if (isMissingTableError(itemErr.message || '')) {
        return nest(await readFallback())
      }
      throw new Error(itemErr.message)
    }

    const mappedCats = (cats ?? []).map((r) => mapCategory(r as Record<string, unknown>))
    const mappedItems = (items ?? []).map((r) => mapItem(r as Record<string, unknown>))
    if (!mappedCats.length) {
      const local = await readFallback()
      if (local.categories.length) return nest(local)
    }
    return nest({ categories: mappedCats, items: mappedItems })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      return nest(await readFallback())
    }
    throw err
  }
}

function validateCategoryInput(input: {
  name?: unknown
  sort_order?: unknown
}) {
  const name = String(input.name ?? '').trim()
  if (!name || name.length < 2) throw new Error('Category name must be at least 2 characters.')
  const sort_order = Number(input.sort_order ?? 0)
  if (!Number.isFinite(sort_order)) throw new Error('Sort order must be a number.')
  return { name, sort_order: Math.round(sort_order) }
}

function validateItemInput(input: {
  category_id?: unknown
  name?: unknown
  description?: unknown
  price?: unknown
  image_url?: unknown
  sort_order?: unknown
  available?: unknown
}) {
  const category_id = String(input.category_id ?? '').trim()
  if (!category_id) throw new Error('Category is required.')
  const name = String(input.name ?? '').trim()
  if (!name || name.length < 2) throw new Error('Item name must be at least 2 characters.')
  const description = String(input.description ?? '').trim()
  let price: number | null = null
  if (input.price !== null && input.price !== undefined && String(input.price).trim() !== '') {
    const n = Number(input.price)
    if (!Number.isFinite(n) || n < 0) throw new Error('Enter a valid price (0 or more).')
    price = Math.round(n * 100) / 100
  }
  const imageRaw = String(input.image_url ?? '').trim()
  const image_url = imageRaw || null
  if (image_url && !image_url.startsWith('/')) {
    try {
      new URL(image_url)
    } catch {
      throw new Error('Enter a valid image URL.')
    }
  }
  const sort_order = Number(input.sort_order ?? 0)
  if (!Number.isFinite(sort_order)) throw new Error('Sort order must be a number.')
  const available = input.available === false || input.available === 'false' ? false : true
  return {
    category_id,
    name,
    description,
    price,
    image_url,
    sort_order: Math.round(sort_order),
    available,
  }
}

export async function createCategory(input: {
  name?: unknown
  sort_order?: unknown
}): Promise<Omit<MenuCategory, 'items'>> {
  const data = validateCategoryInput(input)
  try {
    const { data: row, error } = await supabaseAdmin
      .from('restaurant_menu_categories')
      .insert(data)
      .select('id, name, sort_order')
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
  input: { name?: unknown; sort_order?: unknown },
): Promise<Omit<MenuCategory, 'items'>> {
  const data = validateCategoryInput(input)
  try {
    const { data: row, error } = await supabaseAdmin
      .from('restaurant_menu_categories')
      .update(data)
      .eq('id', id)
      .select('id, name, sort_order')
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
    const { error } = await supabaseAdmin.from('restaurant_menu_categories').delete().eq('id', id)
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        store.categories = store.categories.filter((c) => c.id !== id)
        store.items = store.items.filter((i) => i.category_id !== id)
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
      store.items = store.items.filter((i) => i.category_id !== id)
      await writeFallback(store)
      return
    }
    throw err
  }
}

export async function createItem(input: {
  category_id?: unknown
  name?: unknown
  description?: unknown
  price?: unknown
  image_url?: unknown
  sort_order?: unknown
  available?: unknown
}): Promise<MenuItem> {
  const data = validateItemInput(input)
  try {
    const { data: row, error } = await supabaseAdmin
      .from('restaurant_menu_items')
      .insert(data)
      .select('id, category_id, name, description, price, image_url, sort_order, available')
      .single()
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        if (!store.categories.some((c) => c.id === data.category_id)) {
          throw new Error('Category not found.')
        }
        const item: MenuItem = { id: randomUUID(), ...data }
        store.items.push(item)
        await writeFallback(store)
        return item
      }
      throw new Error(error.message)
    }
    return mapItem(row as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      if (!store.categories.some((c) => c.id === data.category_id)) {
        throw new Error('Category not found.')
      }
      const item: MenuItem = { id: randomUUID(), ...data }
      store.items.push(item)
      await writeFallback(store)
      return item
    }
    throw err
  }
}

export async function updateItem(
  id: string,
  input: {
    category_id?: unknown
    name?: unknown
    description?: unknown
    price?: unknown
    image_url?: unknown
    sort_order?: unknown
    available?: unknown
  },
): Promise<MenuItem> {
  const data = validateItemInput(input)
  try {
    const { data: row, error } = await supabaseAdmin
      .from('restaurant_menu_items')
      .update(data)
      .eq('id', id)
      .select('id, category_id, name, description, price, image_url, sort_order, available')
      .single()
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        const idx = store.items.findIndex((i) => i.id === id)
        if (idx < 0) throw new Error('Menu item not found.')
        store.items[idx] = { id, ...data }
        await writeFallback(store)
        return store.items[idx]
      }
      throw new Error(error.message)
    }
    return mapItem(row as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      const idx = store.items.findIndex((i) => i.id === id)
      if (idx < 0) throw new Error('Menu item not found.')
      store.items[idx] = { id, ...data }
      await writeFallback(store)
      return store.items[idx]
    }
    throw err
  }
}

export async function deleteItem(id: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('restaurant_menu_items').delete().eq('id', id)
    if (error) {
      if (isMissingTableError(error.message || '')) {
        const store = await readFallback()
        store.items = store.items.filter((i) => i.id !== id)
        await writeFallback(store)
        return
      }
      throw new Error(error.message)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (isMissingTableError(message) || /fetch failed|ECONNREFUSED|network/i.test(message)) {
      const store = await readFallback()
      store.items = store.items.filter((i) => i.id !== id)
      await writeFallback(store)
      return
    }
    throw err
  }
}
