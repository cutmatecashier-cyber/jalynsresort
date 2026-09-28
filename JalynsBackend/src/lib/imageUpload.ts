import multer from 'multer'

const IMAGE_NAME =
  /\.(jpe?g|jpe|png|gif|webp|bmp|avif|hei[cf]|tiff?|nef|nrw|cr2|cr3|arw|dng|orf|rw2|raf|srw|raw|pef|x3f)$/i

export function isUploadableImage(file: { mimetype?: string; originalname?: string }) {
  const mime = (file.mimetype || '').toLowerCase()
  if (mime.startsWith('image/')) return true
  return IMAGE_NAME.test(file.originalname || '')
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
