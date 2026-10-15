import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { TradeForm } from '../components/trades/TradeForm'
import * as tradeService from '../services/trades'
import type { TradeFormData } from '../types/trade'
import { getAccessToken } from '../services/api'
import { useCrumbs } from '../lib/breadcrumbs'

export function TradeEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trade, setTrade] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  void isSaving

  useCrumbs(trade ? [
    { label: 'Journals', to: '/trades' },
    { label: `${new Date(trade.entryTime || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Journal`, to: `/trades/${trade.id}` },
    { label: 'Edit' },
  ] : null)

  useEffect(() => {
    if (!id) return
    tradeService.getTrade(id)
      .then(setTrade)
      .catch(() => { toast.error('Trade not found'); navigate('/trades') })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-6 lg:p-8 text-text-muted">Loading…</div>
  if (!trade) return null

  async function handleSubmit(data: TradeFormData): Promise<void> {
    setIsSaving(true)
    try {
      const { _pendingImages, ...tradeData } = data
      await tradeService.updateTrade(trade!.id, tradeData)
      if (_pendingImages && _pendingImages.length > 0) {
        for (const item of _pendingImages) {
          const formData = new FormData()
          formData.append('image', item.file)
          formData.append('tradeId', trade!.id)
          formData.append('category', item.category)
          await fetch('/api/v1/upload/image', {
            method: 'POST',
            headers: { Authorization: `Bearer ${getAccessToken()}` },
            body: formData,
          })
        }
      }
      toast.success('Trade updated')
      navigate(`/trades/${trade!.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update trade')
    } finally {
      setIsSaving(false)
    }
  }

  const t = trade!
  const initial = {
    instrument: t.instrument, direction: t.direction,
    entryPrice: t.entryPrice ?? undefined, exitPrice: t.exitPrice ?? undefined,
    stopLoss: t.stopLoss ?? undefined, takeProfit: t.takeProfit ?? undefined,
    quantity: t.quantity ?? undefined, fees: t.fees ?? undefined,
    broker: t.broker ?? undefined, account: t.accountId ?? undefined,
    session: t.session ?? undefined, marketBias: t.marketBias ?? undefined,
    entryTime: t.entryTime ?? undefined, exitTime: t.exitTime ?? undefined,
    status: t.status, result: t.result ?? undefined,
    riskReward: t.riskReward ?? undefined,
    notes: t.notes ?? undefined, reason: t.reason ?? undefined,
    mistakes: t.mistakes ?? undefined, lesson: t.lesson ?? undefined,
    emotion: t.emotion ?? undefined, confidence: t.confidence ?? undefined,
    executionRating: t.executionRating ?? undefined,
    patienceRating: t.patienceRating ?? undefined, disciplineRating: t.disciplineRating ?? undefined,
    setup: t.setup ?? undefined, accountId: t.accountId ?? undefined,
    pipSize: t.pipSize ?? undefined, pipValue: t.pipValue ?? undefined,
    checklistData: t.checklistData ?? undefined,
    _partialExits: t.partialExits?.map((pe: any) => ({ quantity: pe.quantity, exitPrice: pe.exitPrice, exitTime: pe.exitTime ?? undefined })) || undefined,
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
        Edit Journal
      </h1>
      <TradeForm
        initial={initial}
        existingImages={t.images}
        noFrame
        onSubmit={handleSubmit}
        onClose={() => navigate(`/trades/${t.id}`)}
      />
    </div>
  )
}