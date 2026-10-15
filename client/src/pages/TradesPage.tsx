import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, TrendingUp, AlertCircle } from 'lucide-react'
import { tradeDayKey } from '../lib/tradeMath'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { UpgradeDialog } from '../components/ui/UpgradeDialog'
import toast from 'react-hot-toast'
import { TradeFilters } from '../components/trades/TradeFilters'
import { JournalDayCard } from '../components/trades/JournalDayCard'
import * as tradeService from '../services/trades'
import * as tagService from '../services/tags'
import { usePlan } from '../hooks/usePlan'
import { motion } from 'framer-motion'
import { PageHeader } from '../components/ui/PageHeader'
import { cn } from '../lib/utils'
import { ChecklistsManager } from '../components/checklists/ChecklistsManager'
import type { Trade, TradeListParams } from '../types/trade'
import { eventBus } from '../lib/eventBus'

function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mondayKey(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return fmtKey(d)
}

function isoWeek(dateKey: string): number {
  const d = new Date(dateKey + 'T00:00:00')
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function weekLabel(mondayDateKey: string): string {
  const monday = new Date(mondayDateKey + 'T00:00:00')
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export function TradesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isBasic, isAtTradeLimit, plan } = usePlan()
  const dailyTradeLimit: number | null = plan?.dailyTradeLimit ?? null
  const monthlyTradeLimit: number | null = plan?.monthlyTradeLimit ?? null
  const [trades, setTrades] = useState<Trade[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'trades' | 'checklists'>('trades')
  const [showChecklistDialog, setShowChecklistDialog] = useState(false)
  const [checklistName, setChecklistName] = useState('')
  const [checklistRefreshKey, setChecklistRefreshKey] = useState(0)
  const dateParam = searchParams.get('date')
  const dayParam = searchParams.get('day')
  const accountIdParam = searchParams.get('accountId')
  const [expandedDay, setExpandedDay] = useState<string | null>(() => dayParam ?? dateParam ?? null)
  const [params, setParams] = useState<TradeListParams>(() => ({
    page: 1,
    limit: 100,
    sortBy: 'entryTime',
    sortOrder: 'desc',
    ...(dateParam && !dayParam ? { date: dateParam } : {}),
    ...(accountIdParam ? { accountId: accountIdParam } : {}),
  }))
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const _now = new Date()
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  const tradesTodayCount = useMemo(() => trades.filter((t) => t.entryTime?.startsWith(todayStr)).length, [trades])
  const tradesThisMonthCount = useMemo(() => {
    const monthStr = todayStr.slice(0, 7)
    return trades.filter((t) => t.entryTime?.startsWith(monthStr)).length
  }, [trades, todayStr])

  const dayGroups = useMemo(() => {
    const map = new Map<string, Trade[]>()
    for (const t of trades) {
      const key = tradeDayKey(t.entryTime)
      if (!key) continue
      const list = map.get(key)
      if (list) list.push(t)
      else map.set(key, [t])
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.entryTime!).getTime() - new Date(b.entryTime!).getTime())
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [trades])

  const fetchParams = useMemo(() => ({ ...params, limit: 100 }), [params])

  const fetchTrades = useCallback(async () => {
    try {
      const result = await tradeService.listTrades(fetchParams)
      setTrades(result.trades)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch {
      setTrades([])
    }
  }, [fetchParams])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  useEffect(() => {
    const offTrades = eventBus.on('trades:changed', () => fetchTrades())
    const offAccounts = eventBus.on('accounts:changed', () => fetchTrades())
    return () => { offTrades(); offAccounts() }
  }, [fetchTrades])

  useEffect(() => {
    const target = dayParam ?? dateParam
    if (target) {
      setExpandedDay(target)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          dayRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      })
    }
  }, [dayParam, dateParam])

  function toggleDay(dateKey: string) {
    setExpandedDay((prev) => (prev === dateKey ? null : dateKey))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Journals"
        subtitle="Every trade logged, every lesson kept."
        actions={
          <>
            {/* Trades | Checklists tab strip */}
            <div className="flex items-center gap-1 bg-input rounded-xl p-1">
              <button
                onClick={() => setActiveTab('trades')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  activeTab === 'trades' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                Trades
              </button>
              <button
                onClick={() => setActiveTab('checklists')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  activeTab === 'checklists' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                Checklists
              </button>
            </div>
            {activeTab === 'trades' && (
              <Button onClick={() => {
                if (isAtTradeLimit && dailyTradeLimit !== null && tradesTodayCount >= dailyTradeLimit) {
                  setShowUpgradeDialog(true)
                  return
                }
                if (isAtTradeLimit && monthlyTradeLimit !== null && tradesThisMonthCount >= monthlyTradeLimit) {
                  setShowUpgradeDialog(true)
                  return
                }
                navigate('/trades/new')
              }} leftIcon={<Plus className="w-4 h-4" />}>
                New Journal
              </Button>
            )}
            {activeTab === 'checklists' && (
              <Button onClick={() => setShowChecklistDialog(true)} leftIcon={<Plus className="w-4 h-4" />}>
                New Checklist
              </Button>
            )}
          </>
        } />

      {activeTab === 'trades' ? (
      <>
      {isBasic && dailyTradeLimit !== null && tradesTodayCount >= dailyTradeLimit - 1 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3 text-sm text-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>You've used {tradesTodayCount}/{dailyTradeLimit} trades today. <Link to="/plans" className="underline font-medium">Upgrade to Pro</Link> for unlimited daily trades.</span>
        </div>
      )}

      {isBasic && monthlyTradeLimit !== null && tradesThisMonthCount >= monthlyTradeLimit - 2 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3 text-sm text-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>You've used {tradesThisMonthCount}/{monthlyTradeLimit} trades this month. <Link to="/plans" className="underline font-medium">Upgrade to Pro</Link> for unlimited trades.</span>
        </div>
      )}

      {dateParam && !dayParam && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl">
          <span className="text-sm text-text-primary">
            Showing trades for <strong>{new Date(dateParam + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </span>
          <button
            onClick={() => {
              navigate('/trades')
            }}
            className="ml-auto text-text-muted hover:text-text-primary transition-colors p-1"
          >
            Clear
          </button>
        </div>
      )}

      <TradeFilters params={params} onChange={setParams} />

      {dayGroups.length === 0 ? (
        <div className="card p-12 text-center text-text-muted">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No trades found for this period. Start by logging your first trade.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayGroups.map(([dateKey, dayTrades], i) => {
            const prevKey = i > 0 ? dayGroups[i - 1][0] : null
            const newWeek = !prevKey || mondayKey(prevKey) !== mondayKey(dateKey)
            return (
              <div key={dateKey}>
                {newWeek && (
                  <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 mb-4 bg-elevated/90 backdrop-blur border border-border/60 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary-light">
                      Week {isoWeek(dateKey)}
                    </span>
                    <span className="text-xs font-medium text-text-muted">
                      {weekLabel(mondayKey(dateKey))}
                    </span>
                  </div>
                )}
                <div ref={(el) => { dayRefs.current[dateKey] = el }}>
                  <JournalDayCard
                    dateKey={dateKey}
                    dayTrades={dayTrades}
                    isOpen={expandedDay === dateKey}
                    isToday={dateKey === todayStr}
                    onToggle={() => toggleDay(dateKey)}
                    onOpenTrade={(id) => navigate(`/trades/${id}`)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 card">
          <p className="text-xs text-text-muted">
            Page {params.page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setParams((p) => ({ ...p, page: Math.max(1, (p.page || 1) - 1) }))}
              disabled={params.page === 1}
              className="px-3 py-1 text-xs border border-border rounded-md text-text-secondary hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setParams((p) => ({ ...p, page: Math.min(totalPages, (p.page || 1) + 1) }))}
              disabled={params.page === totalPages}
              className="px-3 py-1 text-xs border border-border rounded-md text-text-secondary hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      </>
      ) : (
        <ChecklistsManager refreshKey={checklistRefreshKey} />
      )}

      <UpgradeDialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} />

      <Modal open={showChecklistDialog} onClose={() => { setShowChecklistDialog(false); setChecklistName('') }} size="sm" title="New Checklist">
        <div className="space-y-4 py-2">
          <Input
            autoFocus
            value={checklistName}
            onChange={(e) => setChecklistName(e.target.value)}
            placeholder="e.g. Pre-Trade Basics"
            onKeyDown={(e) => { if (e.key === 'Enter' && checklistName.trim()) setShowChecklistDialog(false) }}
          />
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="secondary" onClick={() => { setShowChecklistDialog(false); setChecklistName('') }}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!checklistName.trim()) return
              try {
                await tagService.createTag({ name: checklistName.trim() })
                setChecklistRefreshKey((k) => k + 1)
                toast.success('Checklist created')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to create checklist')
              }
              setShowChecklistDialog(false)
              setChecklistName('')
            }}
          >
            Create
          </Button>
        </div>
      </Modal>
    </motion.div>
  )
}
