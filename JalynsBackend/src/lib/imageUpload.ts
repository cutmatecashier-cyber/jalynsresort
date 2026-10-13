import multer from 'multer'

const IMAGE_NAME =
  /\.(jpe?g|jpe|png|gif|webp|bmp|avif|hei[cf]|tiff?|nef|nrw|cr2|cr3|arw|dng|orf|rw2|raf|srw|raw|pef|x3f)$/i

export function isUploadableImage(file: { mimetype?: string; originalname?: string }) {
  const mime = (file.mimetype || '').toLowerCase()
  if (mime.startsWith('image/')) return true
  return IMAGE_NAME.test(file.originalname || '')
}

const VIDEO_NAME = /\.mp4$/i

export function isUploadableHeroVideo(file: { mimetype?: string; originalname?: string }) {
  const mime = (file.mimetype || '').toLowerCase()
  if (mime === 'video/mp4') return true
  return VIDEO_NAME.test(file.originalname || '')
}

export function formatUploadError(err: unknown, fallback: string) {
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : ''
  if (code === 'LIMIT_FILE_SIZE') {
    return 'This file is too large. Photos are compressed before upload. Hero videos must be MP4, 5 seconds or shorter, and under 40 MB.'
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

/** Accept any picture the browser can pick, including WebP, HEIC, and camera RAW. */
export function createImageUpload(options?: { files?: number }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 80 * 1024 * 1024,
      ...(options?.files ? { files: options.files } : {}),
    },
    fileFilter: (_req, file, cb) => {
      if (!isUploadableImage(file)) {
        cb(new Error('Please choose an image file.'))
        return
      }
      cb(null, true)
    },
  })
}

/** Hero backgrounds: existing image types, plus a short MP4. */
export function createHeroMediaUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 40 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!isUploadableImage(file) && !isUploadableHeroVideo(file)) {
        cb(new Error('Please choose an image or an MP4 video.'))
        return
      }
      cb(null, true)
    },
  })
}
