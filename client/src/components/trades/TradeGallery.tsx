import { useRef } from 'react'
import { Download, Trash2 as TrashIcon } from 'lucide-react'
import type { Trade, TradeImage } from '../../types/trade'

const CATEGORIES = ['ENTRY', 'EXIT', 'ANALYSIS', 'CUSTOM'] as const

const CATEGORY_LABELS: Record<string, string> = {
  ENTRY: 'Before Entry',
  EXIT: 'After Exit',
  ANALYSIS: 'Markups',
  CUSTOM: 'Extra',
}

interface TradeGalleryProps {
  trade: Trade
  onDeleteImage: (imageId: string) => void
  isEditing?: boolean
}

export function TradeGallery({ trade, onDeleteImage, isEditing }: TradeGalleryProps) {
  const imageRefs = useRef<Record<string, HTMLDivElement | null>>({})

  async function downloadImage(img: TradeImage) {
    try {
      const res = await fetch(img.imageUrl, { mode: 'cors' })
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = img.imageUrl.split('.').pop()?.split('?')[0] || 'jpg'
      a.download = `${trade.instrument}-${(CATEGORY_LABELS[img.category] || img.category.toLowerCase()).replace(/\s+/g, '-').toLowerCase()}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(img.imageUrl, '_blank', 'noopener')
    }
  }

  const groups = CATEGORIES.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    images: trade.images.filter((img) => img.category === cat),
  })).filter((g) => g.images.length > 0)

  if (groups.length === 0) return null

  return (
    <div className="space-y-6">
      {groups.map(({ cat, label, images }) => (
        <div key={cat} className="space-y-3">
          <p className="text-xs font-medium text-text-muted">{label}</p>
          {images.map((img) => (
            <div
              key={img.id}
              ref={(el) => { imageRefs.current[img.id] = el }}
              className="relative group rounded-xl overflow-hidden border border-border bg-hover"
            >
              <img
                src={img.imageUrl}
                alt={`${trade.instrument} ${label.toLowerCase()} chart`}
                loading="lazy"
                className="w-full h-auto object-contain max-h-[80vh]"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => downloadImage(img)}
                  className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                  title="Download image"
                  aria-label="Download image"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              {isEditing && (
                <button
                  onClick={() => onDeleteImage(img.id)}
                  className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger transition-opacity"
                  title="Delete image"
                  aria-label="Delete image"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}