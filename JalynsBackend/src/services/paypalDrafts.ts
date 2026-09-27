import { supabaseAdmin } from '../config/supabase.js'
import type { RoomBookingInput } from './roomBookings.js'

const OBJECT = 'paypal-checkout-drafts.json'
const BUCKET = 'site-data'
const TTL_MS = 45 * 60 * 1000

export type CheckoutDraft = {
  orderId: string
  amount: number
  input: RoomBookingInput
  createdAt: number
}

const memory = new Map<string, CheckoutDraft>()

function fresh(list: CheckoutDraft[]) {
  const now = Date.now()
  return list.filter((draft) => now - draft.createdAt < TTL_MS && draft.orderId && draft.amount > 0)
}

async function readCloud(): Promise<CheckoutDraft[]> {
  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(OBJECT)
    if (error || !data) return []
    const raw = JSON.parse(await data.text()) as unknown
    return fresh(Array.isArray(raw) ? (raw as CheckoutDraft[]) : [])
  } catch {
    return []
  }
}

async function writeCloud(list: CheckoutDraft[]) {
  const body = Buffer.from(JSON.stringify(fresh(list)))
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(OBJECT, body, {
    contentType: 'application/json',
    cacheControl: '0',
    upsert: true,
  })
  if (error) throw new Error(error.message)
}

export async function saveCheckoutDraft(draft: CheckoutDraft) {
  memory.set(draft.orderId, draft)
  try {
    const list = fresh([...(await readCloud()).filter((item) => item.orderId !== draft.orderId), draft])
    await writeCloud(list)
  } catch (err) {
    console.warn('[paypal] could not store checkout draft:', err instanceof Error ? err.message : err)
  }
}

export async function loadCheckoutDraft(orderId: string): Promise<CheckoutDraft | null> {
  const cached = memory.get(orderId)
  if (cached && Date.now() - cached.createdAt < TTL_MS) return cached
  const list = await readCloud()
  const found = list.find((item) => item.orderId === orderId) ?? null
  if (found) memory.set(orderId, found)
  return found
}

export async function deleteCheckoutDraft(orderId: string) {
  memory.delete(orderId)
  try {
    const list = (await readCloud()).filter((item) => item.orderId !== orderId)
    await writeCloud(list)
  } catch {
    // The booking is already saved; a leftover draft expires on its own.
  }
}
