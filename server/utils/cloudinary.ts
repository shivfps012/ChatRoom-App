import { v2 as cloudinary } from 'cloudinary'

/**
 * Upload a base64 image string to Cloudinary.
 * @param {string} base64String - Full data URI, e.g. "data:image/png;base64,..."
 * @returns {Promise<string>} - Secure URL of the uploaded image
 */
export async function uploadImage(base64String: string): Promise<string> {
  const result = await cloudinary.uploader.upload(base64String, {
    folder: 'chatroom',
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  })
  return result.secure_url
}
