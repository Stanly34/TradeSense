import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, TrendingUp, ArrowUpDown, Trash2, ExternalLink, LayoutGrid, List, AlertCircle, X, CheckCircle, Circle } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SelectionBar } from '../components/ui/SelectionBar'
import { UpgradeDialog } from '../components/ui/UpgradeDialog'
import { TradeFilters } from '../components/trades/TradeFilters'
import { TradeForm, type TradeFormHandle } from '../components/trades/TradeForm'
import * as tradeService from '../services/trades'
import { usePlan } from '../hooks/usePlan'
import type { Trade, TradeListParams, TradeFormData } from '../types/trade'
import { getAccessToken } from '../services/api'
import toast from 'react-hot-toast'

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-hover text-text-muted',
  COMPLETED: 'bg-success/10 text-success',
  ARCHIVED: 'bg-hover text-text-muted',
}

const resultStyles: Record<string, string> = {
  WIN: 'bg-success/10 text-success',
  LOSS: 'bg-danger/10 text-danger',
  BREAK_EVEN: 'bg-hover text-text-secondary',
}

export function TradesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isBasic, isAtTradeLimit, plan } = usePlan()
  const [trades, setTrades] = useState<Trade[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [formTabs, setFormTabs] = useState<number[]>([0])
  const [activeFormTab, setActiveFormTab] = useState(0)
  const formRefs = useRef<Record<number, TradeFormHandle | null>>({})
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const dateParam = searchParams.get('date')
  const templateIdParam = searchParams.get('templateId')
  const [params, setParams] = useState<TradeListParams>(() => ({
    page: 1,
    limit: 20,
    sortBy: 'entryTime',
    sortOrder: 'desc',
    ...(dateParam ? { date: dateParam } : {}),
    ...(templateIdParam ? { templateId: templateIdParam } : {}),
  }))
  const [sortField, setSortField] = useState('entryTime')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<number>(0)
  const longTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const longPressTriggeredRef = useRef(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)
  const tradesTodayCount = useMemo(() => trades.filter((t) => t.entryTime?.startsWith(todayStr)).length, [trades])
  const tradesThisMonthCount = useMemo(() => {
    const monthStr = todayStr.slice(0, 7)
    return trades.filter((t) => t.entryTime?.startsWith(monthStr)).length
  }, [trades, todayStr])

  const fetchTrades = useCallback(async () => {
    try {
      const result = await tradeService.listTrades(params)
      setTrades(result.trades)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch {
      setTrades([])
    }
  }, [params])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  function handleSort(field: string) {
    if (sortField === field) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc'
      setSortDir(newDir)
      setParams((p) => ({ ...p, sortBy: field, sortOrder: newDir }))
    } else {
      setSortField(field)
      setSortDir('desc')
      setParams((p) => ({ ...p, sortBy: field, sortOrder: 'desc' }))
    }
  }

  async function handleCreate(data: TradeFormData) {
    try {
      const { _pendingImages, ...tradeData } = data
      const trade = await tradeService.createTrade(tradeData)
      if (_pendingImages && _pendingImages.length > 0) {
        for (const file of _pendingImages) {
          const formData = new FormData()
          formData.append('image', file)
          formData.append('tradeId', trade.id)
          formData.append('category', 'ANALYSIS')
          await fetch('/api/v1/upload/image', {
            method: 'POST',
            headers: { Authorization: `Bearer ${getAccessToken()}` },
            body: formData,
          })
        }
      }
      setTrades((prev) => [trade, ...prev])
      setShowForm(false)
      setFormTabs([0])
      setActiveFormTab(0)
      toast.success('Journal created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create trade')
      throw err
    }
  }

  async function handleSaveAll() {
    const entries: TradeFormData[] = []
    for (let i = 0; i < formTabs.length; i++) {
      const f = formRefs.current[i]
      if (!f) continue
      if (!f.validate()) {
        setActiveFormTab(i)
        return
      }
      entries.push(f.getData())
    }
    try {
      let count = 0
      for (const data of entries) {
        const { _pendingImages, ...tradeData } = data
        const trade = await tradeService.createTrade(tradeData)
        if (_pendingImages && _pendingImages.length > 0) {
          for (const file of _pendingImages) {
            const fd = new FormData()
            fd.append('image', file)
            fd.append('tradeId', trade.id)
            fd.append('category', 'ANALYSIS')
            await fetch('/api/v1/upload/image', {
              method: 'POST',
              headers: { Authorization: `Bearer ${getAccessToken()}` },
              body: fd,
            })
          }
        }
        setTrades((prev) => [trade, ...prev])
        count++
      }
      setShowForm(false)
      setFormTabs([0])
      setActiveFormTab(0)
      toast.success(`${count} journals created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create trades')
    }
  }

  function removeTab(index: number) {
    if (formTabs.length <= 1) {
      setShowForm(false)
      setFormTabs([0])
      setActiveFormTab(0)
      return
    }
    setFormTabs((prev) => prev.filter((_, i) => i !== index))
    if (activeFormTab >= index) {
      setActiveFormTab(Math.max(0, activeFormTab - 1))
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    await tradeService.deleteTrade(deleteTarget)
    setTrades((prev) => prev.filter((t) => t.id !== deleteTarget))
    setDeleteTarget(null)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) setSelecting(false)
      return next
    })
  }

  function cancelSelect() {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  function makeLongPress(id: string) {
    return {
      onMouseDown: () => {
        longPressTriggeredRef.current = false
        longTimerRef.current = setTimeout(() => {
          longPressTriggeredRef.current = true
          setSelecting(true)
          setSelectedIds((prev) => { const next = new Set(prev); next.add(id); return next })
        }, 600)
      },
      onMouseUp: () => clearTimeout(longTimerRef.current),
      onMouseLeave: () => clearTimeout(longTimerRef.current),
      onTouchStart: () => {
        longPressTriggeredRef.current = false
        longTimerRef.current = setTimeout(() => {
          longPressTriggeredRef.current = true
          setSelecting(true)
          setSelectedIds((prev) => { const next = new Set(prev); next.add(id); return next })
        }, 600)
      },
      onTouchEnd: (e: React.TouchEvent) => {
        clearTimeout(longTimerRef.current)
        if (longPressTriggeredRef.current) e.preventDefault()
      },
      onTouchMove: () => clearTimeout(longTimerRef.current),
    }
  }

  const pnl = (trade: Trade) => {
    if (!trade.entryPrice || !trade.exitPrice) return null
    const dir = trade.direction === 'LONG' ? 1 : -1
    const pipScale = trade.pipSize && trade.pipSize !== 0 ? 1 / trade.pipSize : 1
    const pipVal = trade.pipValue || 1

    const calcPnl = (price: number, qty: number) =>
      (price - trade.entryPrice!) * dir * pipScale * pipVal * qty

    const partialQty = (trade.partialExits || []).reduce((s, pe) => s + pe.quantity, 0)
    const mainQty = (trade.quantity || 1) - partialQty

    let total = calcPnl(trade.exitPrice, mainQty)
    for (const pe of trade.partialExits || []) {
      total += calcPnl(pe.exitPrice, pe.quantity)
    }
    return total - (trade.fees || 0)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Journals</h1>
          <p className="text-text-secondary mt-1">Log and manage your trading activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-card border border-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-primary text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => {
            if (isAtTradeLimit && plan?.dailyTradeLimit !== null && tradesTodayCount >= plan?.dailyTradeLimit) {
              setShowUpgradeDialog(true)
              return
            }
            if (isAtTradeLimit && plan?.monthlyTradeLimit !== null && tradesThisMonthCount >= plan?.monthlyTradeLimit) {
              setShowUpgradeDialog(true)
              return
            }
            setShowForm(true)
          }} leftIcon={<Plus className="w-4 h-4" />}>
            New Journal
          </Button>
        </div>
      </div>

      {isBasic && plan?.dailyTradeLimit !== null && tradesTodayCount >= plan?.dailyTradeLimit - 1 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3 text-sm text-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>You've used {tradesTodayCount}/{plan?.dailyTradeLimit} trades today. <Link to="/plans" className="underline font-medium">Upgrade to Pro</Link> for unlimited daily trades.</span>
        </div>
      )}

      {isBasic && plan?.monthlyTradeLimit !== null && tradesThisMonthCount >= plan?.monthlyTradeLimit - 2 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3 text-sm text-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>You've used {tradesThisMonthCount}/{plan?.monthlyTradeLimit} trades this month. <Link to="/plans" className="underline font-medium">Upgrade to Pro</Link> for unlimited trades.</span>
        </div>
      )}

      {dateParam && (
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

      {viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-sidebar/50">
                  <Th onClick={() => handleSort('instrument')} active={sortField === 'instrument'}>
                    Instrument
                  </Th>
                  <Th onClick={() => handleSort('direction')} active={sortField === 'direction'}>
                    Direction
                  </Th>
                  <Th>P&L</Th>
                  <Th>Account</Th>
                  <Th onClick={() => handleSort('result')} active={sortField === 'result'}>
                    Result
                  </Th>
                  <Th onClick={() => handleSort('status')} active={sortField === 'status'}>
                    Status
                  </Th>
                  <Th>Day</Th>
                  <Th onClick={() => handleSort('entryTime')} active={sortField === 'entryTime'}>
                    Date
                  </Th>
                  <Th className="w-16">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-text-muted">
                      <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No trades found. Start by logging your first trade.</p>
                    </td>
                  </tr>
                ) : (
                  trades.map((trade) => {
                    const handlers = makeLongPress(trade.id)
                    const isSelected = selectedIds.has(trade.id)
                    return (
                      <tr key={trade.id}
                        {...handlers}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-hover'}`}
                        onClick={(e) => {
                          if (longPressTriggeredRef.current) { longPressTriggeredRef.current = false; return }
                          if (selecting) { toggleSelect(trade.id); return }
                          navigate(`/trades/${trade.id}`)
                        }}>
                        {selecting && (
                          <td className="px-2 py-3 w-10">
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5 text-primary" />
                            ) : (
                              <Circle className="w-5 h-5 text-text-muted" />
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 font-medium text-text-primary">{trade.instrument}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            trade.direction === 'LONG' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                          }`}>
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {pnl(trade) !== null ? (
                            <span className={pnl(trade)! >= 0 ? 'text-success font-medium' : 'text-danger font-medium'}>
                              {pnl(trade)! >= 0 ? '+' : ''}{pnl(trade)!.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-text-muted">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {trade.template ? (
                            <span className={`font-medium ${trade.template.type === 'PROP_FIRM' ? 'text-primary-light' : 'text-info'}`}>
                              {trade.template.name}
                            </span>
                          ) : (
                            <span className="text-text-muted">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {trade.result ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${resultStyles[trade.result] || ''}`}>
                              {trade.result === 'BREAK_EVEN' ? 'BE' : trade.result}
                            </span>
                          ) : (
                            <span className="text-text-muted">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyles[trade.status] || ''}`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs font-medium">
                          {new Date(trade.entryTime).toLocaleDateString('en-US', { weekday: 'long' })}
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">
                          {new Date(trade.entryTime).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/trades/${trade.id}`) }}
                              className="p-1.5 text-text-muted hover:text-text-primary rounded"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(trade.id) }}
                              className="p-1.5 text-text-muted hover:text-danger rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-sidebar/30">
              <p className="text-xs text-text-muted">
                Showing {(params.page! - 1) * params.limit! + 1}-
                {Math.min(params.page! * params.limit!, total)} of {total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setParams((p) => ({ ...p, page: Math.max(1, p.page! - 1) }))}
                  disabled={params.page === 1}
                  className="px-3 py-1 text-xs border border-border rounded-md text-text-secondary hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setParams((p) => ({ ...p, page: Math.min(totalPages, p.page! + 1) }))}
                  disabled={params.page === totalPages}
                  className="px-3 py-1 text-xs border border-border rounded-md text-text-secondary hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {trades.length === 0 ? (
            <div className="card p-12 text-center text-text-muted">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No trades found. Start by logging your first trade.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {trades.map((trade) => {
                const tradePnl = pnl(trade)
                const handlers = makeLongPress(trade.id)
                const isSelected = selectedIds.has(trade.id)
                return (
                  <div key={trade.id}
                    {...handlers}
                    onClick={() => {
                      if (longPressTriggeredRef.current) { longPressTriggeredRef.current = false; return }
                      if (selecting) { toggleSelect(trade.id); return }
                      navigate(`/trades/${trade.id}`)
                    }}
                    className={`card card-hover p-5 cursor-pointer group relative ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                  >
                    {selecting && (
                      <div className="absolute top-3 left-3 z-10">
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        ) : (
                          <Circle className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary text-sm">{trade.instrument}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          trade.direction === 'LONG' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        }`}>{trade.direction}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-primary-light transition-colors" />
                    </div>

                    {trade.entryPrice && trade.exitPrice ? (
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className={`text-lg font-bold ${tradePnl! >= 0 ? 'text-success' : 'text-danger'}`}>
                          {tradePnl! >= 0 ? '+' : ''}{tradePnl!.toFixed(2)}
                        </span>
                        <span className="text-xs text-text-muted">P&L</span>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-text-muted mb-3">--</div>
                    )}

                    {trade.template && (
                      <div className={`text-[10px] font-medium mb-2 ${trade.template.type === 'PROP_FIRM' ? 'text-primary-light' : 'text-info'}`}>
                        {trade.template.name}
                      </div>
                    )}

                    {trade.reason && (
                      <p className="text-[11px] text-text-secondary leading-relaxed mb-3 line-clamp-2">{trade.reason}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex gap-1.5">
                        {trade.result && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${resultStyles[trade.result] || ''}`}>
                            {trade.result === 'BREAK_EVEN' ? 'BE' : trade.result}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${statusStyles[trade.status] || ''}`}>
                          {trade.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted">{new Date(trade.entryTime).toLocaleDateString('en-US', { weekday: 'short' })}, {new Date(trade.entryTime).toLocaleDateString()}</span>
                    </div>

                    {trade.tags && trade.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {trade.tags.slice(0, 3).map((t) => (
                          <span key={t.tag.id} className="text-[10px] text-text-muted bg-hover px-1.5 py-0.5 rounded">
                            {t.tag.name}
                          </span>
                        ))}
                        {trade.tags.length > 3 && (
                          <span className="text-[10px] text-text-muted">+{trade.tags.length - 3}</span>
                        )}
                      </div>
                    )}
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
                  onClick={() => setParams((p) => ({ ...p, page: Math.max(1, p.page! - 1) }))}
                  disabled={params.page === 1}
                  className="px-3 py-1 text-xs border border-border rounded-md text-text-secondary hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setParams((p) => ({ ...p, page: Math.min(totalPages, p.page! + 1) }))}
                  disabled={params.page === totalPages}
                  className="px-3 py-1 text-xs border border-border rounded-md text-text-secondary hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12 overflow-y-auto">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-2xl my-auto shadow-[0_6px_25px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-6 pt-4 pb-0">
              <div className="flex items-center gap-1 overflow-x-auto">
                {formTabs.map((_, i) => (
                  <div key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap group"
                    style={{ background: activeFormTab === i ? 'rgba(139, 92, 246, 0.2)' : undefined }}
                    onClick={() => setActiveFormTab(i)}>
                    <span className={`text-sm font-medium ${activeFormTab === i ? 'text-primary-light' : 'text-text-muted hover:text-text-secondary'}`}>
                      Trade {i + 1}
                    </span>
                    {i > 0 && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeTab(i) }}
                        className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-hover transition-colors opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => {
                  if (isBasic && formTabs.length >= 1) {
                    setShowUpgradeDialog(true)
                  } else {
                    setFormTabs((prev) => [...prev, prev.length])
                  }
                }}
                  className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowForm(false); setFormTabs([0]); setActiveFormTab(0) }} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {formTabs.map((_, i) => (
              <div key={i} style={{ display: activeFormTab === i ? '' : 'none' }}>
                <TradeForm
                  ref={(el) => { formRefs.current[i] = el }}
                  noFrame
                  saveAllMode={formTabs.length > 1}
                  onSubmit={handleCreate}
                  onClose={() => { setShowForm(false); setFormTabs([0]); setActiveFormTab(0) }}
                />
              </div>
            ))}
            {formTabs.length > 1 && (
              <div className="px-6 pb-4 pt-2 border-t border-border">
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setFormTabs([0]); setActiveFormTab(0) }}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveAll}>
                    Save All ({formTabs.length})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <UpgradeDialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This action cannot be undone."
      />

      <ConfirmDialog
        open={batchDeleteTarget > 0}
        onClose={() => setBatchDeleteTarget(0)}
        onConfirm={async () => {
          const ids = Array.from(selectedIds)
          await tradeService.batchDeleteTrades(ids)
          cancelSelect()
          setBatchDeleteTarget(0)
          fetchTrades()
          toast.success(`${ids.length} trades deleted`)
        }}
        title="Delete Trades"
        message={`Are you sure you want to delete ${batchDeleteTarget} trades? This action cannot be undone.`}
      />

      <SelectionBar
        count={selectedIds.size}
        onDelete={() => setBatchDeleteTarget(selectedIds.size)}
        onCancel={cancelSelect}
      />
    </div>
  )
}

function Th({ children, onClick, active, className }: { children: React.ReactNode; onClick?: () => void; active?: boolean; className?: string }) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider ${onClick ? 'cursor-pointer hover:text-text-secondary' : ''} ${className || ''}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {onClick && <ArrowUpDown className={`w-3 h-3 ${active ? 'text-primary-light' : 'text-text-muted'}`} />}
      </div>
    </th>
  )
}