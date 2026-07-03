import { useState, useCallback } from 'react'
import { Upload, X } from 'lucide-react'

interface UploadedImage {
  id: string
  imageUrl: string
  category: string
  description: string | null
}

interface ImageUploadProps {
  images: UploadedImage[]
  onUpload: (file: File, category: string, description?: string) => Promise<void>
  onDelete: (imageId: string) => Promise<void>
}

export function ImageUpload({ images, onUpload, onDelete }: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file)
  }, [])

  async function handleFile(file: File) {
    setIsUploading(true)
    try {
      await onUpload(file, 'ANALYSIS')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-border-hover'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="image-upload"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-text-muted">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-text-muted" />
              <p className="text-sm text-text-secondary">
                <span className="text-primary-light font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-text-muted">PNG, JPG, GIF, WebP up to 10MB</p>
            </div>
          )}
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
              <img src={img.imageUrl} alt="" className="w-full h-24 object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => onDelete(img.id)}
                  className="p-1.5 bg-danger text-text-primary rounded-full hover:bg-danger/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
