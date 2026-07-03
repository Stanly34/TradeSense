import fs from 'fs'
import path from 'path'

export async function uploadImage(
  filePath: string
): Promise<{ url: string; publicId: string; width: number; height: number }> {
  const filename = path.basename(filePath)

  return {
    url: `/uploads/${filename}`,
    publicId: filename,
    width: 0,
    height: 0,
  }
}

export async function deleteImage(filename: string) {
  const filePath = path.join(process.cwd(), 'uploads', filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
