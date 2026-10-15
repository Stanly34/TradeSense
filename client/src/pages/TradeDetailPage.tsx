import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit2, MoreVertical, Trash2, Star, Target, Activity, AlertTriangle, GraduationCap } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TradeGallery } from '../components/trades/TradeGallery'
import * as tradeService from '../services/trades'
import * as tagService from '../services/tags'
import api from '../services/api'
import type { Trade } from '../types/trade'
import { parseTagContent } from '../utils/tags'
import { calcTradePnl, tradeDayKey } from '../lib/tradeMath'
import { useCrumbs } from '../lib/breadcrumbs'

const EMOTION_EMOJIS: Record<string, string> = {
  CALM: '😎',
  NEUTRAL: '😐',
  FEAR: '😨',
  REVENGE: '😡',
  BORED: '😴',
}

const STORY_TONES: Record<string, { icon: string }> = {
  primary: { icon: 'text-primary-light' },
  danger: { icon: 'text-danger' },
  success: { icon: 'text-success' },
  neutral: { icon: 'text-text-muted' },
}

function resultVariant(result: string): 'success' | 'danger' | 'default' {
  if (result === 'WIN') return 'success'
  if (result === 'LOSS') return 'danger'
  return 'default'
}

export function TradeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [tags, setTags] = useState<Array<{ id: string; name: string; content: string | null; _count?: { trades: number } }>>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dayKey = trade?.entryTime ? tradeDayKey(trade.entryTime) : null

  useCrumbs(trade ? [
    { label: 'Journals', to: '/trades' },
    { label: `${dayKey ? new Date(dayKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Trade'} Journal` },
    ...(trade.tradeAccount ? [{ label: trade.tradeAccount.name }] : []),
  ] : null)

  useEffect(() => {
    if (!id) return
    setTrade(null)
    setError(null)
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
    if (!moreOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [moreOpen])

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">{error}</p>
        <Button variant="ghost" onClick={() => navigate('/trades')} className="mt-4">
          Back to trades
        </Button>
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="p-6 lg:p-8 space-y-10">
        <div className="flex items-center gap-3 py-3">
          <SkeletonBlock className="w-36 h-8" />
          <div className="flex-1" />
          <SkeletonBlock className="w-20 h-8" />
          <SkeletonBlock className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-10 w-64" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
        </div>
        <SkeletonBlock className="h-36 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-64" />
        </div>
      </div>
    )
  }

  const t = trade
  const selectedTagIds = t.tags.map((tagRel) => tagRel.tag.id)
  const tagIdsFromChecklistData = t.checklistData ? Object.keys(t.checklistData) : []
  const allTagIds = selectedTagIds.length > 0 ? selectedTagIds : tagIdsFromChecklistData
  const tradePnl = calcTradePnl(t)

  const pnlPercent = t.entryPrice && t.exitPrice
    ? ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100
    : null

  const pnlColor = tradePnl === null ? 'text-text-muted' : tradePnl >= 0 ? 'text-success' : 'text-danger'
  const pnlText = tradePnl === null ? '--' : `${tradePnl >= 0 ? '+' : ''}${tradePnl.toFixed(2)}`

  const dayDate = t.entryTime ? new Date(t.entryTime) : null

  async function handleDeleteImage(imageId: string) {
    if (!window.confirm('Delete this image?')) return
    await api.delete(`/upload/image/${imageId}`)
    const updated = await tradeService.getTrade(t.id)
    setTrade(updated)
  }

  async function handleConfirmDelete() {
    await tradeService.deleteTrade(t.id)
    navigate(dayKey ? `/trades?day=${dayKey}` : '/trades')
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="-mx-6 lg:-mx-8 px-6 lg:px-8 border-b border-border/50">
          <div className="flex items-center gap-2 py-3">
            <div className="flex-1" />
            <div className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={cn('p-2 rounded-lg border transition-colors', moreOpen ? 'bg-hover text-text-primary border-border' : 'border-border text-text-muted hover:text-text-primary hover:bg-hover')}
                title="More actions"
                aria-label="More actions"
                aria-expanded={moreOpen}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 card p-1 min-w-[180px]">
                    <button
                      onClick={() => { setMoreOpen(false); navigate(`/trades/${t.id}/edit`) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-hover transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit trade
                    </button>
                    <button
                      onClick={() => { setMoreOpen(false); setShowDeleteDialog(true) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete trade
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pb-6">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t.instrument}</h1>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', t.direction === 'LONG' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>{t.direction}</span>
                  {t.setup && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-lg bg-primary/10 text-primary-light">
                      {t.setup}
                    </span>
                  )}
                  {t.tradeAccount && (
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', t.tradeAccount.type === 'PROP_FIRM' ? 'bg-primary/10 text-primary-light' : 'bg-info/10 text-info')}>{t.tradeAccount.name}</span>
                  )}
                </div>
                <p className="text-sm text-text-muted mt-1.5">
                  {dayDate ? `${dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${dayDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : `Created ${new Date(t.createdAt).toLocaleDateString()}`}
                  {t.account && <> · {t.account}</>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn('text-2xl font-bold tabular-nums tracking-tight', pnlColor)}>{pnlText}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  {t.result && <Badge variant={resultVariant(t.result)}>{t.result === 'BREAK_EVEN' ? 'BREAK EVEN' : t.result}</Badge>}
                  {t.status && <Badge>{t.status}</Badge>}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className={cn('rounded-2xl border px-6 py-8', tradePnl === null ? 'border-border/60 bg-background' : tradePnl >= 0 ? 'border-success/15 bg-success/[0.03]' : 'border-danger/15 bg-danger/[0.03]')}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Trade Result</p>
          <p className={cn('text-5xl font-bold tabular-nums tracking-tight mt-3', pnlColor)}>{pnlText}</p>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {pnlPercent !== null && (
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', tradePnl !== null && tradePnl >= 0 ? 'bg-success/10 text-success' : tradePnl !== null ? 'bg-danger/10 text-danger' : 'bg-hover text-text-secondary')}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </span>
            )}
            {t.riskReward != null && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-hover text-text-secondary">
                {t.riskReward.toFixed(2)}R
              </span>
            )}
            {t.result && <Badge variant={resultVariant(t.result)}>{t.result === 'BREAK_EVEN' ? 'BREAK EVEN' : t.result}</Badge>}
          </div>
        </section>

        <section className="space-y-6">
          <SectionLabel>Execution</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBlock label="Entry" value={t.entryPrice != null ? `$${t.entryPrice.toFixed(2)}` : '--'} />
            <StatBlock label="Exit" value={t.exitPrice != null ? `$${t.exitPrice.toFixed(2)}` : '--'} />
            <StatBlock label="Stop Loss" value={t.stopLoss != null ? `$${t.stopLoss.toFixed(2)}` : '--'} />
            <StatBlock label="Take Profit" value={t.takeProfit != null ? `$${t.takeProfit.toFixed(2)}` : '--'} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBlock label="Quantity" value={t.quantity?.toString() || '--'} />
            <StatBlock label="Fees" value={t.fees != null ? `$${t.fees.toFixed(2)}` : '--'} />
            <StatBlock label="Direction" value={t.direction} color={t.direction === 'LONG' ? 'text-success' : 'text-danger'} />
            <StatBlock label="Risk / Reward" value={t.riskReward != null ? `${t.riskReward.toFixed(2)}R` : '--'} />
          </div>

          {t.partialExits && t.partialExits.length > 0 && (
            <div className="rounded-xl border border-border p-4">
              <SectionLabel>Partial Closes</SectionLabel>
              <div className="space-y-2 mt-3">
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
                        <span className={cn('font-medium', legPnl >= 0 ? 'text-success' : 'text-danger')}>
                          {legPnl >= 0 ? '+' : ''}{legPnl.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {t.timeline && t.timeline.length > 0 && (
            <div className="rounded-xl border border-border p-4">
              <SectionLabel>Lifecycle</SectionLabel>
              <div className="relative mt-3">
                {[...t.timeline].sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()).map((entry, i, sorted) => (
                  <div key={entry.id} className="flex">
                    <div className="flex flex-col items-center w-5 shrink-0">
                      <div className={cn('w-2 h-2 rounded-full mt-2', timelineDot(entry.eventType, tradePnl))} />
                      {i < sorted.length - 1 && <div className="w-px flex-1 bg-border/60" />}
                    </div>
                    <div className="flex-1 pb-4 pl-2">
                      <div className="flex items-baseline gap-2">
                        <p className="text-xs font-medium text-text-muted tabular-nums">{timeLabel(entry.eventTime)}</p>
                        <p className="text-sm font-medium text-text-primary">{entry.title}</p>
                      </div>
                      {entry.description && <p className="text-sm text-text-secondary mt-0.5">{entry.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionLabel>Trade Context</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {t.account && <Badge>Account · {t.account}</Badge>}
            {t.tradeAccount?.name && <Badge variant="primary">Account · {t.tradeAccount.name}</Badge>}
            {t.broker && <Badge>Broker · {t.broker}</Badge>}
            {t.session && <Badge>Session · {t.session.replace('_', ' ')}</Badge>}
            {t.marketBias && <Badge variant="info">Bias · {t.marketBias}</Badge>}
            {t.status && <Badge>Status · {t.status}</Badge>}
            {t.result && <Badge variant={resultVariant(t.result)}>Result · {t.result}</Badge>}
            {t.direction && <Badge variant={t.direction === 'LONG' ? 'success' : 'danger'}>Direction · {t.direction}</Badge>}
            {dayDate && <Badge>Entry · {dayDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Badge>}
            {t.exitTime && <Badge>Exit · {new Date(t.exitTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Badge>}
          </div>
        </section>

        <section className="max-w-[65ch] space-y-4">
          <SectionLabel>Trade Story</SectionLabel>
          {(trade.reason || trade.notes || trade.mistakes || trade.lesson) ? (
            <div className="divide-y divide-border/50">
              {trade.reason && (
                <StoryBlock tone="primary" label="Why I Entered" text={t.reason} icon={<Target className="w-3.5 h-3.5" />} />
              )}
              {trade.notes && (
                <StoryBlock tone="neutral" label="Notes" text={t.notes} icon={<Activity className="w-3.5 h-3.5" />} />
              )}
              {trade.mistakes && (
                <StoryBlock tone="danger" label="What Went Wrong" text={t.mistakes} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
              )}
              {trade.lesson && (
                <StoryBlock tone="success" label="Lesson" text={t.lesson} icon={<GraduationCap className="w-3.5 h-3.5" />} />
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No story entries for this trade.</p>
          )}
        </section>

        <section className="space-y-4">
          <SectionLabel>Trade Charts</SectionLabel>
          <TradeGallery trade={t} onDeleteImage={handleDeleteImage} isEditing={false} />
        </section>

        {(t.emotion || t.confidence != null || t.executionRating != null || t.patienceRating != null || t.disciplineRating != null || allTagIds.length > 0) && (
          <section className="space-y-6">
            <SectionLabel>Reflection</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(t.emotion || t.confidence != null || t.executionRating != null || t.patienceRating != null || t.disciplineRating != null) && (
                <div className="card p-5 space-y-3">
                  <SectionLabel>Psychology</SectionLabel>
                  {t.emotion && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-muted">Emotion</span>
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
                        <span className="text-lg leading-none">{EMOTION_EMOJIS[t.emotion] || '😐'}</span>
                        {t.emotion.charAt(0) + t.emotion.slice(1).toLowerCase()}
                      </span>
                    </div>
                  )}
                  {t.confidence != null && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-muted">Confidence</span>
                        <span className="text-sm font-medium text-text-primary">{t.confidence}/10</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-hover overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${t.confidence * 10}%` }} />
                      </div>
                    </div>
                  )}
                  {[
                    { label: 'Execution', value: t.executionRating },
                    { label: 'Patience', value: t.patienceRating },
                    { label: 'Discipline', value: t.disciplineRating },
                  ].map(({ label, value }) => value != null && (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-text-muted">{label}</span>
                      <span className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn('w-3.5 h-3.5', n <= value ? 'fill-warning text-warning' : 'text-border')} />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {allTagIds.length > 0 && (
                <div className="card p-5 space-y-3">
                  <SectionLabel>Checklist</SectionLabel>
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
                                <span className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0', checkedItems.includes(item) ? 'bg-primary border-primary' : 'border-border')}>
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
          </section>
        )}

        <ConfirmDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Trade"
          message="Are you sure you want to delete this trade? This action cannot be undone."
        />
      </div>
    </div>
  )
}

function timelineDot(eventType: string, tradePnl: number | null): string {
  if (eventType === 'ENTRY' || eventType === 'PLAN') return 'bg-primary'
  if (eventType === 'PARTIAL_EXIT') return 'bg-warning'
  if (eventType === 'EXIT') return tradePnl != null && tradePnl >= 0 ? 'bg-success' : 'bg-danger'
  return 'bg-border'
}

function timeLabel(eventTime: string): string {
  return new Date(eventTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">{children}</p>
  )
}

function StatBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-hover/60 rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={cn('text-lg font-semibold tabular-nums mt-0.5', color || 'text-text-primary')}>{value}</p>
    </div>
  )
}

function StoryBlock({ tone, label, text, icon }: { tone: string; label: string; text: string | null; icon: React.ReactNode }) {
  const style = STORY_TONES[tone] || STORY_TONES.neutral
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <span className={style.icon}>{icon}</span>
        {label}
      </h3>
      <FormattedText text={text} className="mt-2 text-sm text-text-secondary leading-relaxed" />
    </div>
  )
}

function FormattedText({ text, className }: { text: string | null; className?: string }) {
  const lines = (text ?? '').split('\n')
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

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-hover', className)} />
}