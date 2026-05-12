import { Router, Request, Response, NextFunction } from 'express'
import multer, { MulterError } from 'multer'
import cloudinary from '../config/cloudinary.js'
import { protect } from '../middleware/auth.js'

interface MulterRequest extends Request {
  file?: Express.Multer.File
}

const router = Router()

// Use memory storage — buffer goes straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'))
    }
    cb(null, true)
  },
})

// Wrapper to handle multer errors
const handleMulterError =
  (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, (err: any) => {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File is too large. Max 5MB.' })
        }
        return res.status(400).json({ message: 'Upload error: ' + err.message })
      }
      if (err) {
        return res.status(400).json({ message: 'File error: ' + err.message })
      }
      next()
    })
  }

/**
 * POST /api/upload
 * Uploads image buffer to Cloudinary and returns the secure URL.
 */
router.post(
  '/',
  protect,
  handleMulterError(upload.single('image')),
  async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No image file provided.' })
        return
      }

      // Upload buffer to Cloudinary using upload_stream
      const url = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'chatroom', resource_type: 'auto' },
          (error: any, result: any) => {
            if (error) return reject(error)
            resolve(result.secure_url)
          }
        )
        stream.end(req.file!.buffer)
      })

      res.status(200).json({ url })
    } catch (err) {
      const error = err as Error
      console.error('Upload error:', err)
      res.status(500).json({ message: 'Image upload failed.', error: error.message })
    }
  }
)

export default router
