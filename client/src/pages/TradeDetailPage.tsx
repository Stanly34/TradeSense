import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, TrendingUp, TrendingDown, Minus, DollarSign, Percent, Target, X, Trash2 as TrashIcon, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TradeForm } from '../components/trades/TradeForm'
import * as tradeService from '../services/trades'
import * as tagService from '../services/tags'
import toast from 'react-hot-toast'
import api from '../services/api'
import type { Trade } from '../types/trade'
import { parseTagContent } from '../utils/tags'

const ZOOM_LEVELS = [1, 1.5, 2]

export function TradeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [tags, setTags] = useState<Array<{ id: string; name: string; content: string | null; _count?: { trades: number } }>>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      tradeService.getTrade(id),
      tagService.listTags(),
    ])
      .then(([tradeData, tagsData]) => {
        setTrade(tradeData)
        setTags(tagsData)
      })
      .catch(() => setError('Trade not found'))
  }, [id])

  useEffect(() => {
    if (!selectedImage) return
    setZoom(1)
    setPan({ x: 0, y: 0 })
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedImage(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedImage])

  if (error || !trade) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">{error || 'Trade not found'}</p>
        <Button variant="ghost" onClick={() => navigate('/trades')} className="mt-4">
          Back to trades
        </Button>
      </div>
    )
  }

  const t = trade
  const selectedTagIds = t.tags.map((tagRel) => tagRel.tag.id)
  const tagIdsFromChecklistData = t.checklistData ? Object.keys(t.checklistData) : []
  const allTagIds = selectedTagIds.length > 0 ? selectedTagIds : tagIdsFromChecklistData
  const initialForm = {
    instrument: trade.instrument,
    direction: trade.direction,
    entryPrice: trade.entryPrice ?? undefined,
    exitPrice: trade.exitPrice ?? undefined,
    stopLoss: trade.stopLoss ?? undefined,
    takeProfit: trade.takeProfit ?? undefined,
    quantity: trade.quantity ?? undefined,
    fees: trade.fees ?? undefined,
    broker: trade.broker ?? undefined,
    account: trade.account ?? undefined,
    session: trade.session ?? undefined,
    marketBias: trade.marketBias ?? undefined,
    entryTime: trade.entryTime ?? undefined,
    exitTime: trade.exitTime ?? undefined,
    status: trade.status,
    result: trade.result ?? undefined,
    riskReward: trade.riskReward ?? undefined,
    notes: t.notes ?? undefined,
    reason: t.reason ?? undefined,
    mistakes: t.mistakes ?? undefined,
    pipSize: trade.pipSize ?? undefined,
    pipValue: trade.pipValue ?? undefined,
    templateId: trade.templateId ?? undefined,
    checklistData: t.checklistData ?? undefined,
    _partialExits: t.partialExits?.map((pe) => ({
      quantity: pe.quantity,
      exitPrice: pe.exitPrice,
      exitTime: pe.exitTime ?? undefined,
    })) || undefined,
  }

  const tradePnl = t.entryPrice && t.exitPrice
    ? (() => {
        const dir = t.direction === 'LONG' ? 1 : -1
        const pipScale = t.pipSize && t.pipSize !== 0 ? 1 / t.pipSize : 1
        const pipVal = t.pipValue || 1

        const calcPnl = (price: number, qty: number) =>
          (price - t.entryPrice!) * dir * pipScale * pipVal * qty

        const partialQty = (t.partialExits || []).reduce((s, pe) => s + pe.quantity, 0)
        const mainQty = (t.quantity || 1) - partialQty

        let total = calcPnl(t.exitPrice, mainQty)
        for (const pe of t.partialExits || []) {
          total += calcPnl(pe.exitPrice, pe.quantity)
        }
        return total - (t.fees || 0)
      })()
    : null

  const pnlPercent = t.entryPrice && t.exitPrice
    ? ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100
    : null

  async function handleDeleteImage(imageId: string) {
    if (!window.confirm('Delete this image?')) return
    await api.delete(`/upload/image/${imageId}`)
    const updated = await tradeService.getTrade(t.id)
    setTrade(updated)
  }

  async function handleConfirmDelete() {
    await tradeService.deleteTrade(t.id)
    navigate('/trades')
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/trades')} className="p-2 text-text-muted hover:text-text-primary hover:bg-hover rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{t.instrument}</h1>
          <p className="text-sm text-text-muted">
            Created {new Date(t.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Edit2 className="w-4 h-4" />} onClick={() => setShowEdit(true)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDeleteDialog(true)}>
            Delete
          </Button>
        </div>
      </div>

      {tradePnl !== null && (
        <div className={`rounded-xl border p-6 ${
          tradePnl >= 0 ? 'bg-success/5 border-success/30' : 'bg-danger/5 border-danger/30'
        }`}>
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${tradePnl >= 0 ? 'bg-success/10' : 'bg-danger/10'}`}>
              {tradePnl >= 0 ? (
                <TrendingUp className={`w-10 h-10 ${tradePnl >= 0 ? 'text-success' : 'text-danger'}`} />
              ) : (
                <TrendingDown className={`w-10 h-10 text-danger`} />
              )}
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Total P&L</p>
              <p className={`text-4xl font-bold ${tradePnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {tradePnl >= 0 ? '+' : ''}{tradePnl.toFixed(2)}
              </p>
              {pnlPercent !== null && (
                <p className={`text-sm mt-1 ${tradePnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {t.partialExits && t.partialExits.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">Partial Closes</h3>
          <div className="space-y-2">
            {t.partialExits.map((pe, i) => {
              const diff = t.direction === 'LONG' ? pe.exitPrice - t.entryPrice! : t.entryPrice! - pe.exitPrice
              const pips = t.pipSize && t.pipSize !== 0 ? diff / t.pipSize : diff
              const legPnl = pips * (t.pipValue || 1) * pe.quantity
              return (
                <div key={pe.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-hover">
                  <div className="flex items-center gap-4">
                    <span className="text-text-muted">#{i + 1}</span>
                    <span><span className="text-text-muted">Qty:</span> {pe.quantity}</span>
                    <span><span className="text-text-muted">Price:</span> ${pe.exitPrice.toFixed(2)}</span>
                    {pe.exitTime && <span className="text-text-muted text-xs">{new Date(pe.exitTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <span>
                    <span className="text-text-muted mr-1">P&L:</span>
                    <span className={`font-medium ${legPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {legPnl >= 0 ? '+' : ''}{legPnl.toFixed(2)}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Direction" value={t.direction} color={t.direction === 'LONG' ? 'text-success' : 'text-danger'} />
            <StatCard label="Entry" value={t.entryPrice ? `$${t.entryPrice.toFixed(2)}` : '--'} />
            <StatCard label="Exit" value={t.exitPrice ? `$${t.exitPrice.toFixed(2)}` : '--'} />
            <StatCard label="Quantity" value={t.quantity?.toString() || '--'} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Stop Loss" value={t.stopLoss ? `$${t.stopLoss.toFixed(2)}` : '--'} />
            <StatCard label="Take Profit" value={t.takeProfit ? `$${t.takeProfit.toFixed(2)}` : '--'} />
            <StatCard label="Fees" value={t.fees ? `$${t.fees.toFixed(2)}` : '--'} />
          </div>

          {trade.reason && (
            <div className="card p-5">
              <h3 className="text-sm font-medium text-text-primary mb-2">Entry Reason</h3>
              <FormattedText text={t.reason} className="text-sm text-text-secondary" />
            </div>
          )}

          {trade.mistakes && (
            <div className="card p-5">
              <h3 className="text-sm font-medium text-text-primary mb-2">Mistakes</h3>
              <FormattedText text={t.mistakes} className="text-sm text-danger/80" />
            </div>
          )}

          {trade.notes && (
            <div className="card p-5">
              <h3 className="text-sm font-medium text-text-primary mb-2">Notes</h3>
              <FormattedText text={t.notes} className="text-sm text-text-secondary" />
            </div>
          )}

          {t.timeline && t.timeline.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-medium text-text-primary mb-3">Timeline</h3>
              <div className="space-y-3">
                {[...t.timeline].sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()).map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <div className="w-px flex-1 bg-border/50" />
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-xs text-text-muted">{new Date(entry.eventTime).toLocaleString()}</p>
                      <p className="text-sm font-medium text-text-primary mt-0.5">{entry.title}</p>
                      {entry.description && <p className="text-sm text-text-secondary mt-0.5">{entry.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-medium text-text-primary mb-3">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  t.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                  t.status === 'ARCHIVED' ? 'bg-hover text-text-muted' :
                  'bg-hover text-text-secondary'
                }`}>{t.status}</span>
              </div>
              {t.result && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Result</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    t.result === 'WIN' ? 'bg-success/10 text-success' :
                    t.result === 'LOSS' ? 'bg-danger/10 text-danger' :
                    'bg-hover text-text-secondary'
                  }`}>{t.result}</span>
                </div>
              )}
              {t.broker && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Broker</span>
                  <span className="text-text-primary">{t.broker}</span>
                </div>
              )}
              {t.session && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Session</span>
                  <span className="text-text-primary">{t.session.replace('_', ' ')}</span>
                </div>
              )}
              {t.marketBias && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Bias</span>
                  <span className="text-text-primary">{t.marketBias}</span>
                </div>
              )}
              {t.account && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Account</span>
                  <span className="text-text-primary">{t.account}</span>
                </div>
              )}
            </div>
          </div>

          {allTagIds.length > 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">Checklist</h3>
              {tags.filter((tag) => allTagIds.includes(tag.id)).map((tag) => {
                const items = parseTagContent(tag.content)
                const checkedItems = (trade.checklistData as Record<string, string[]> | null)?.[tag.id] || []
                return (
                  <div key={tag.id}>
                    <p className="text-xs font-medium text-text-primary">{tag.name}</p>
                    {items.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checkedItems.includes(item) ? 'bg-primary border-primary' : 'border-border'}`}>
                              {checkedItems.includes(item) && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <span className={checkedItems.includes(item) ? 'text-text-primary' : ''}>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-text-muted">No items</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {(t.images.length > 0 || true) && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Trade Images</h3>

          {t.images.length > 0 && (
            <div className="space-y-4">
              {t.images.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border cursor-pointer"
                  onClick={() => setSelectedImage(img.imageUrl)}>
                  <img src={img.imageUrl} alt="" className="w-full h-80 object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-sm text-white">Click to view</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}>
          <div ref={imageRef} className="relative flex items-center justify-center max-w-5xl max-h-[92vh] w-full h-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => { if (zoom > 1) { setIsDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); (e.target as HTMLElement).style.cursor = 'grabbing' } }}
            onMouseMove={(e) => { if (isDragging && zoom > 1) { setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) } }}
            onMouseUp={() => { setIsDragging(false); if (imageRef.current) imageRef.current.style.cursor = '' }}
            onMouseLeave={() => { setIsDragging(false); if (imageRef.current) imageRef.current.style.cursor = '' }}
            onWheel={(e) => { e.preventDefault(); setZoom(z => { const idx = ZOOM_LEVELS.indexOf(z); const next = e.deltaY < 0 ? Math.min(ZOOM_LEVELS.length - 1, idx + 1) : Math.max(0, idx - 1); if (idx === next) return z; setPan({ x: 0, y: 0 }); return ZOOM_LEVELS[next] }) }}>
            <img src={selectedImage} alt="" draggable={false}
              className="max-w-full max-h-[85vh] rounded-lg transition-transform duration-100 select-none"
              style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, cursor: zoom > 1 ? 'grab' : '' }}
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => setZoom(z => { const idx = ZOOM_LEVELS.indexOf(z); if (idx >= ZOOM_LEVELS.length - 1) return z; setPan({ x: 0, y: 0 }); return ZOOM_LEVELS[idx + 1] })}
                className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button onClick={() => setZoom(z => { const idx = ZOOM_LEVELS.indexOf(z); if (idx <= 0) return z; setPan({ x: 0, y: 0 }); return ZOOM_LEVELS[idx - 1] })}
                className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                <ZoomOut className="w-5 h-5" />
              </button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
                className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={() => {
                const img = t.images.find((i) => i.imageUrl === selectedImage)
                if (img) handleDeleteImage(img.id)
                setSelectedImage(null)
              }}
                className="p-2 bg-danger/90 text-white rounded-full hover:bg-danger transition-colors">
                <TrashIcon className="w-5 h-5" />
              </button>
              <button onClick={() => setSelectedImage(null)}
                className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
              {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <TradeForm
          initial={initialForm}
          existingImagesCount={t.images.length}
          onSubmit={async (data) => {
            try {
              const { _pendingImages, ...tradeData } = data
              const updated = await tradeService.updateTrade(t.id, tradeData)
              if (_pendingImages && _pendingImages.length > 0) {
                for (const file of _pendingImages) {
                  const formData = new FormData()
                  formData.append('image', file)
                  formData.append('tradeId', t.id)
                  formData.append('category', 'ANALYSIS')
                  try {
                    const uploadRes = await api.post('/upload/image', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    })
                  } catch (uploadErr: any) {
                  }
                }
                const refreshed = await tradeService.getTrade(t.id)
                setTrade(refreshed)
              } else {
                setTrade(updated)
              }
              setShowEdit(false)
              toast.success('Trade saved')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to save trade')
              throw err
            }
          }}
          onClose={() => setShowEdit(false)}
          title="Edit Trade"
        />
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This action cannot be undone."
      />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color || 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

function FormattedText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n')
  return (
    <div className={className}>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (/^[-•*]\s/.test(trimmed)) {
          return <li key={i} className="ml-4 list-disc">{trimmed.replace(/^[-•*]\s/, '')}</li>
        }
        if (/^\d+[.)]\s/.test(trimmed)) {
          return <li key={i} className="ml-4 list-decimal">{trimmed.replace(/^\d+[.)]\s/, '')}</li>
        }
        if (trimmed === '') {
          return <br key={i} />
        }
        return <p key={i} className="whitespace-pre-wrap">{line}</p>
      })}
    </div>
  )
}