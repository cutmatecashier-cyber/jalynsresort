import { supabaseAdmin } from '../config/supabase.js'

const CLOUD_BUCKET = 'site-data'
const CLOUD_OBJECT = 'content-revision.json'

let bucketReady = false
/** In-process cache so polls stay cheap; bumped on every content save. */
let memoryRevision = 0
let memoryUpdatedAt = new Date(0).toISOString()
let hydratePromise: Promise<void> | null = null

async function ensureCloudBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(CLOUD_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(CLOUD_BUCKET, {
      public: false,
      fileSizeLimit: 1_048_576,
      allowedMimeTypes: ['application/json'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(error.message || 'Could not create site-data storage bucket.')
    }
  }
  bucketReady = true
}

async function hydrateFromCloud() {
  try {
    await ensureCloudBucket()
    const { data, error } = await supabaseAdmin.storage.from(CLOUD_BUCKET).download(CLOUD_OBJECT)
    if (error || !data) return
    const parsed = JSON.parse(await data.text()) as { revision?: unknown; updatedAt?: unknown }
    const rev = Number(parsed.revision)
    if (Number.isFinite(rev) && rev > memoryRevision) {
      memoryRevision = Math.floor(rev)
      memoryUpdatedAt =
        typeof parsed.updatedAt === 'string' && parsed.updatedAt
          ? parsed.updatedAt
          : new Date(memoryRevision).toISOString()
    }
  } catch {
    // keep memory
  }
}

async function ensureHydrated() {
  if (memoryRevision > 0) return
  if (!hydratePromise) {
    hydratePromise = hydrateFromCloud().finally(() => {
      hydratePromise = null
    })
  }
  await hydratePromise
}

async function writeRevision(revision: number, updatedAt: string) {
  await ensureCloudBucket()
  const body = Buffer.from(JSON.stringify({ revision, updatedAt }, null, 2), 'utf8')
  const { error } = await supabaseAdmin.storage.from(CLOUD_BUCKET).upload(CLOUD_OBJECT, body, {
    contentType: 'application/json',
    upsert: true,
  })
  if (error) throw new Error(error.message || 'Could not save content revision.')
}

/** Call after any shared media/content change so other devices refresh. */
export async function bumpContentRevision(): Promise<{ revision: string; updatedAt: string }> {
  await ensureHydrated()
  const next = Math.max(memoryRevision + 1, Date.now())
  const updatedAt = new Date(next).toISOString()
  memoryRevision = next
  memoryUpdatedAt = updatedAt
  try {
    await writeRevision(next, updatedAt)
  } catch {
    // memory bump still helps same-process clients
  }
  return { revision: String(next), updatedAt }
}

/** Guests poll this to refresh gallery/rooms/home/news after admin edits. */
export async function getContentRevision(): Promise<{ revision: string; updatedAt: string }> {
  await ensureHydrated()
  // Cheap re-check so other backends' bumps are visible
  await hydrateFromCloud()
  return {
    revision: memoryRevision > 0 ? String(memoryRevision) : '0',
    updatedAt: memoryUpdatedAt,
  }
}
