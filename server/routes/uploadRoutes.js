import express from 'express'
import multer from 'multer'
import cloudinary from '../config/cloudinary.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Use memory storage — buffer goes straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'))
    }
    cb(null, true)
  },
})

// Wrapper to handle multer errors
const handleMulterError = (fn) => (req, res, next) => {
  fn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'FILE_TOO_LARGE') {
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
router.post('/', protect, handleMulterError(upload.single('image')), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' })
    }

    // Upload buffer to Cloudinary using upload_stream
    const url = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'chatroom', resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error)
          resolve(result.secure_url)
        }
      )
      stream.end(req.file.buffer)
    })

    res.status(200).json({ url })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ message: 'Image upload failed.', error: err.message })
  }
})

export default router
