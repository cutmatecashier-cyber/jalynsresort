import { supabaseAdmin } from '../config/supabase.js'
import { bumpContentRevision } from './contentRevision.js'

const CLOUD_BUCKET = 'site-data'
let bucketReady = false

/** Same-process write-through so a delete isn't undone by a stale CDN read. */
const recentWrites = new Map<string, { value: unknown; until: number }>()
const RECENT_MS = 60_000

export type JsonCloudStoreOptions<T> = {
  /** Object path inside site-data bucket */
  cloudObject: string
  /** Parse raw JSON into the store type */
  parse: (raw: unknown) => T
  /** Turn store into JSON-serializable payload */
  serialize: (value: T) => unknown
  /** Used when cloud object is missing or empty */
  defaultValue: () => T
  /** Returned when cloud object is missing (must fail hasContent) */
  emptyValue: () => T
  /** Whether this value counts as real content (vs empty) */
  hasContent: (value: T) => boolean
}

async function ensureCloudBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(CLOUD_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(CLOUD_BUCKET, {
      public: false,
      fileSizeLimit: 4_194_304,
      allowedMimeTypes: ['application/json'],
    })
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      throw new Error(error.message || 'Could not create site-data storage bucket.')
    }
  }
  bucketReady = true
}

function serviceKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
}

/**
 * Supabase Storage JSON store — cloud only (no local disk).
 * Uses no-cache uploads + short write-through memory so deletes stick.
 */
export function createJsonCloudStore<T>(opts: JsonCloudStoreOptions<T>) {
  async function readCloud(): Promise<T | null> {
    try {
      await ensureCloudBucket()

      // Bypass CDN/browser caches that otherwise resurrect deleted photos.
      const base = supabaseUrl()
      const key = serviceKey()
      if (base && key) {
        const url = `${base}/storage/v1/object/${CLOUD_BUCKET}/${opts.cloudObject}?v=${Date.now()}`
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${key}`,
            apikey: key,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
          cache: 'no-store',
        })
        if (res.status === 404) return opts.emptyValue()
        if (!res.ok) {
          // Fall through to SDK download
        } else {
          const raw = JSON.parse(await res.text()) as unknown
          return opts.parse(raw)
        }
      }

      const { data, error } = await supabaseAdmin.storage
        .from(CLOUD_BUCKET)
        .download(opts.cloudObject)
      if (error || !data) {
        if (/not found|404|Object not found/i.test(error?.message || '')) {
          return opts.emptyValue()
        }
        return null
      }
      const raw = JSON.parse(await data.text()) as unknown
      return opts.parse(raw)
    } catch {
      return null
    }
  }

  async function writeCloud(value: T) {
    await ensureCloudBucket()
    const body = Buffer.from(JSON.stringify(opts.serialize(value), null, 2), 'utf8')
    const { error } = await supabaseAdmin.storage.from(CLOUD_BUCKET).upload(opts.cloudObject, body, {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true,
    })
    if (error) {
      throw new Error(error.message || `Could not save ${opts.cloudObject} to cloud storage.`)
    }
  }

  async function load(): Promise<T> {
    const recent = recentWrites.get(opts.cloudObject)
    if (recent && Date.now() < recent.until) {
      return recent.value as T
    }

    const cloud = await readCloud()
    if (cloud === null) {
      throw new Error(`Could not load ${opts.cloudObject} from cloud storage.`)
    }
    if (opts.hasContent(cloud)) return cloud

    // First run: seed defaults into cloud so every device shares them
    const seeded = opts.defaultValue()
    try {
      await writeCloud(seeded)
      recentWrites.set(opts.cloudObject, { value: seeded, until: Date.now() + RECENT_MS })
      await bumpContentRevision()
    } catch {
      // still return defaults for this response
    }
    return seeded
  }

  async function save(value: T): Promise<void> {
    await writeCloud(value)
    recentWrites.set(opts.cloudObject, { value, until: Date.now() + RECENT_MS })
    await bumpContentRevision()
  }

  return { load, save }
}
