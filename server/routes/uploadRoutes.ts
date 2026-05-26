import { Router, Request, Response, NextFunction } from 'express'
import multer, { MulterError } from 'multer'
import cloudinary from '../config/cloudinary.js'
import { protect } from '../middleware/auth.js'

interface MulterRequest extends Request {
  file?: Express.Multer.File
}

type MediaType = 'image' | 'video'

const router = Router()
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_VIDEO_SIZE = 50 * 1024 * 1024

function getMediaType(mimetype: string): MediaType | null {
  if (mimetype.startsWith('image/')) return 'image'
  if (mimetype.startsWith('video/')) return 'video'
  return null
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!getMediaType(file.mimetype)) {
      return cb(new Error('Only image and video files are allowed.'))
    }
    cb(null, true)
  },
})

const handleMulterError =
  (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, (err: any) => {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File is too large. Max video size is 50MB.' })
        }
        return res.status(400).json({ message: 'Upload error: ' + err.message })
      }
      if (err) {
        return res.status(400).json({ message: 'File error: ' + err.message })
      }
      next()
    })
  }

router.post(
  '/',
  protect,
  handleMulterError(upload.single('media')),
  async (req: MulterRequest, res: Response) => {
    try {
      console.log('📤 Upload request received', {
        hasFile: !!req.file,
        fileSize: req.file?.size,
        fileMimetype: req.file?.mimetype,
        userId: (req as any).userId,
      })

      if (!req.file) {
        console.warn('⚠️  No file provided')
        res.status(400).json({ message: 'No media file provided.' })
        return
      }

      const mediaType = getMediaType(req.file.mimetype)
      if (!mediaType) {
        console.warn('⚠️  Unsupported media type:', req.file.mimetype)
        res.status(400).json({ message: 'Unsupported media type.' })
        return
      }

      if (mediaType === 'image' && req.file.size > MAX_IMAGE_SIZE) {
        console.warn('⚠️  Image too large:', req.file.size)
        res.status(400).json({ message: 'Image is too large. Max 5MB.' })
        return
      }

      console.log('📤 Uploading to Cloudinary...')
      const url = await new Promise<string>((resolve, reject) => {
        const uploadOptions: any = {
          folder: 'chatroom',
          resource_type: 'auto',
        }

        // For videos, add specific timeout and queue settings
        if (mediaType === 'video') {
          uploadOptions.timeout = 60000
          uploadOptions.eager = [{ format: 'mp4' }]
        }

        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error: any, result: any) => {
          if (error) {
            console.error('❌ Cloudinary upload failed:', error)
            return reject(error)
          }
          console.log('✅ Cloudinary upload succeeded:', result.secure_url)
          resolve(result.secure_url)
        })
        stream.end(req.file!.buffer)
      })

      console.log('✅ Sending response:', { url, mediaType })
      res.status(200).json({ url, mediaType })
    } catch (err) {
      const error = err as Error
      console.error('❌ Upload error:', err)
      res.status(500).json({ message: 'Media upload failed.', error: error.message })
    }
  }
)

export default router
