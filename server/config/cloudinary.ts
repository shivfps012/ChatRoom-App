import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load from server root (.env is in /server, not /server/dist/config)
dotenv.config()

interface CloudinaryConfig {
  cloud_name?: string
  api_key?: string
  api_secret?: string
}

const config: CloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
}
// Validate required Cloudinary env vars (warning only, not blocking)
if (!config.cloud_name || !config.api_key || !config.api_secret) {
  console.warn(
    '⚠️  Cloudinary environment variables not fully configured. Image uploads will not work. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
  )
}

cloudinary.config(config)

export default cloudinary
