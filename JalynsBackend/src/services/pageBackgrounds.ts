import { supabaseAdmin } from '../config/supabase.js'
import { ensurePublicMediaBucket, MEDIA_CACHE_CONTROL } from './cloudUpload.js'
import { assertHeroVideo, heroVideoKeepsSound } from './heroVideo.js'
import { isHeroVideoFile, prepareRoomImage } from './prepareRoomImage.js'

export type PageBackground = { url: string | null; path: string | null }

type FormatError = (
  error: { message: string; code?: string } | null,
  fallback: string,
) => string

function isMediaFile(name: string) {
  return /\.(jpe?g|png|webp|gif|mp4)$/i.test(name) && !name.startsWith('.')
}

function extFromMime(mime: string) {
  if (mime === 'video/mp4') return 'mp4'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

/**
 * Stable folder backgrounds used by Scuba Diving (hero + content).
 * Other pages reuse the same current.{ext} upload/resolve/remove behavior.
 */
export function createFolderBackgroundStore(options: {
  bucket: string
  formatError?: FormatError
}) {
  const { bucket, formatError = (_error, fallback) => fallback } = options

  function publicImageUrl(path: string, cacheKey?: string) {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    const url = data.publicUrl
    if (!cacheKey) return url
    return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
  }

  async function listFolderMedia(folder: string) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, {
      limit: 100,
      sortBy: { column: 'updated_at', order: 'desc' },
    })
    if (error || !data) return []
    return data.filter((item) => item.name && isMediaFile(item.name))
  }

  async function resolve(folder: string, stablePrefix: string): Promise<PageBackground> {
    const files = await listFolderMedia(folder)
    const soundPrefix = stablePrefix.endsWith('.') ? `${stablePrefix.slice(0, -1)}-sound.` : stablePrefix
    const stable = files.find((file) => {
      const path = `${folder}/${file.name}`
      return path.startsWith(stablePrefix) || path.startsWith(soundPrefix)
    })
    const newest = stable ?? files[0]
    if (!newest) return { url: null, path: null }
    const path = `${folder}/${newest.name}`
    return {
      path,
      url: publicImageUrl(path, newest.updated_at ?? newest.created_at ?? String(Date.now())),
    }
  }

  async function upload(
    folder: string,
    incoming: Express.Multer.File,
  ): Promise<{ path: string; url: string }> {
    await ensurePublicMediaBucket(bucket)
    const video = isHeroVideoFile(incoming)
    const file = video ? incoming : await prepareRoomImage(incoming)
    if (video) assertHeroVideo(file)
    const ext = extFromMime(file.mimetype || (video ? 'video/mp4' : 'image/jpeg'))
    const stablePath = video
      ? `${folder}/${heroVideoKeepsSound(incoming) ? 'current-sound' : 'current'}.mp4`
      : `${folder}/current.${ext}`
    const { error } = await supabaseAdmin.storage.from(bucket).upload(stablePath, file.buffer, {
      cacheControl: MEDIA_CACHE_CONTROL,
      upsert: true,
      contentType:
        file.mimetype || (video ? 'video/mp4' : `image/${ext === 'jpg' ? 'jpeg' : ext}`),
    })
    if (error) throw new Error(formatError(error, video ? 'Could not upload video.' : 'Could not upload image.'))

    const leftovers = (await listFolderMedia(folder))
      .filter((item) => `${folder}/${item.name}` !== stablePath)
      .map((item) => `${folder}/${item.name}`)
    if (leftovers.length) {
      await supabaseAdmin.storage.from(bucket).remove(leftovers)
    }

    return { path: stablePath, url: publicImageUrl(stablePath, String(Date.now())) }
  }

  async function remove(folder: string) {
    const files = await listFolderMedia(folder)
    const paths = files.map((item) => `${folder}/${item.name}`)
    if (!paths.length) return
    const { error } = await supabaseAdmin.storage.from(bucket).remove(paths)
    if (error) throw new Error(formatError(error, 'Could not remove background.'))
  }

  return { resolve, upload, remove }
}
