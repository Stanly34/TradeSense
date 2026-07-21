import fs from 'fs'
import path from 'path'
import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'

const hasCloudinary = !!(env.cloudinary.name && env.cloudinary.apiKey && env.cloudinary.apiSecret)

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: env.cloudinary.name,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  })
}

export async function uploadImage(
  filePath: string
): Promise<{ url: string; publicId: string; width: number; height: number }> {
  if (hasCloudinary) {
    const result = await cloudinary.uploader.upload(filePath, { folder: 'tradesense' })
    try { fs.unlinkSync(filePath) } catch { /* ignore */ }
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    }
  }

  const filename = path.basename(filePath)
  return {
    url: `/uploads/${filename}`,
    publicId: filename,
    width: 0,
    height: 0,
  }
}

export async function deleteImage(identifier: string) {
  if (hasCloudinary) {
    try { await cloudinary.uploader.destroy(identifier) } catch { /* ignore Cloudinary errors on delete */ }
    return
  }

  const filePath = path.join(process.cwd(), 'uploads', identifier)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
