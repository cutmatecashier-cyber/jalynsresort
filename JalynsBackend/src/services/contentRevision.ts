import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')

const TRACKED_FILES = ['home-hero.json', 'rooms.json', 'gallery.json', 'news.json'] as const

/** Monotonic-ish revision from JSON store mtimes — guests poll this to refresh media. */
export function getContentRevision(): { revision: string; updatedAt: string } {
  let latest = 0
  for (const file of TRACKED_FILES) {
    const full = path.join(DATA_DIR, file)
    if (!existsSync(full)) continue
    try {
      const mtime = statSync(full).mtimeMs
      if (mtime > latest) latest = mtime
    } catch {
      // ignore missing/locked files
    }
  }
  const updatedAt = latest > 0 ? new Date(latest).toISOString() : new Date(0).toISOString()
  return {
    revision: latest > 0 ? String(Math.floor(latest)) : '0',
    updatedAt,
  }
}
