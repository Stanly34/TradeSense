import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Star, Trash2, Building2, User, TrendingUp, Target, AlertTriangle, DollarSign, BarChart3, Globe, X, CheckCircle, Circle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SelectionBar } from '../components/ui/SelectionBar'
import { UpgradeDialog } from '../components/ui/UpgradeDialog'
import { usePlan } from '../hooks/usePlan'
import * as templateService from '../services/templates'
import * as tradeService from '../services/trades'
import type { Template, ChallengeProgress } from '../services/templates'
import type { Trade } from '../types/trade'

const FOREX_PLATFORMS = [
  'FTMO',
  'FundedNext',
  'The5ers',
  'FundingPips',
  'Alpha Capital Group',
  'Blue Guardian',
  'E8 Markets',
  'Funded Trading Plus',
  'Goat Funded Trader',
]

const FUTURES_PLATFORMS = [
  'Topstep',
  'Apex Trader Funding',
  'My Funded Futures (MFFU)',
  'Tradeify',
  'Goat Funded Futures',
  'Lucid Trading',
]

const FOREX_ACCOUNT_SIZE_PRESETS = [5000, 10000, 25000, 50000, 100000]
const FUTURES_ACCOUNT_SIZE_PRESETS = [25000, 50000, 100000, 150000, 200000]

export function TemplatesPage() {
  const navigate = useNavigate()
  const { isPro, plan } = usePlan()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [templateType, setTemplateType] = useState<'PROP_FIRM' | 'PERSONAL_ACCOUNT'>('PROP_FIRM')
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('')
  const [marketType, setMarketType] = useState<'FOREX' | 'FUTURES'>('FOREX')
  const [accountSize, setAccountSize] = useState('')
  const [accountSizeCustom, setAccountSizeCustom] = useState('')
  const [currentAccountSize, setCurrentAccountSize] = useState('')
  const [phase, setPhase] = useState('EVALUATION_PHASE1')
  const [targetProfit, setTargetProfit] = useState('')

  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState('')
  const [noDailyDrawdown, setNoDailyDrawdown] = useState(false)
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState('')
  const [brokerName, setBrokerName] = useState('')
  const [accountLabel, setAccountLabel] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteWithTrades, setDeleteWithTrades] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteTarget, setBatchDeleteTarget] = useState(0)
  const [batchDeleteWithTrades, setBatchDeleteWithTrades] = useState(false)
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Template | null>(null)
  const [accountTrades, setAccountTrades] = useState<Trade[]>([])
  const [accountTradesLoading, setAccountTradesLoading] = useState(false)
  const [progressMap, setProgressMap] = useState<Record<string, ChallengeProgress>>({})
  const [statusEditId, setStatusEditId] = useState<string | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const longTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const longPressTriggeredRef = useRef(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-status-edit]')) setStatusEditId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    templateService.listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const propFirmTemplates = templates.filter((t) => t.type === 'PROP_FIRM')
    if (propFirmTemplates.length === 0) return
    propFirmTemplates.forEach(async (t) => {
      try {
        const progress = await templateService.getChallengeProgress(t.id)
        setProgressMap((prev) => ({ ...prev, [t.id]: progress }))
      } catch {}
    })
  }, [templates])

  useEffect(() => {
    if (!selectedAccount) { setAccountTrades([]); return }
    setAccountTradesLoading(true)
    tradeService.listTrades({ templateId: selectedAccount.id, limit: 50 })
      .then((res) => setAccountTrades(res.trades))
      .catch(() => setAccountTrades([]))
      .finally(() => setAccountTradesLoading(false))
  }, [selectedAccount])

  function resetForm() {
    setName('')
    setMarketType('FOREX')
    setPlatform('')
    setAccountSize('')
    setAccountSizeCustom('')
    setCurrentAccountSize('')
    setPhase('EVALUATION_PHASE1')
    setTargetProfit('')
    setMaxDailyDrawdown('')
    setNoDailyDrawdown(false)
    setMaxTotalDrawdown('')
    setBrokerName('')
    setAccountLabel('')
    setTemplateType('PROP_FIRM')
    setErrors({})
  }

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (templateType === 'PROP_FIRM') {
      if (!platform) errs.platform = 'Platform is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function parseChallengeInput(val: string, accountSize: number): number | undefined {
    const trimmed = val.trim()
    if (!trimmed) return undefined
    if (trimmed.endsWith('%')) {
      const pct = parseFloat(trimmed)
      return isNaN(pct) ? undefined : (pct / 100) * accountSize
    }
    const num = parseFloat(trimmed)
    if (isNaN(num)) return undefined
    if (num > accountSize) return Math.abs(num - accountSize)
    if (Math.abs(num - accountSize) / accountSize < 0.5) return Math.abs(num - accountSize)
    return num
  }

  async function handleCreate() {
    if (!validate()) return
    setIsCreating(true)
    try {
      let defaultValues: Record<string, unknown> | undefined
      if (templateType === 'PROP_FIRM') {
        const finalAccountSize = accountSize === 'custom' ? parseFloat(accountSizeCustom) : parseFloat(accountSize)
        defaultValues = {
          marketType,
          platform,
          accountSize: finalAccountSize || undefined,
          currentAccountSize: parseFloat(currentAccountSize) || undefined,
          phase,
          targetProfit: parseChallengeInput(targetProfit, finalAccountSize),
          maxDailyDrawdown: noDailyDrawdown ? undefined : parseChallengeInput(maxDailyDrawdown, finalAccountSize),
          maxTotalDrawdown: parseChallengeInput(maxTotalDrawdown, finalAccountSize),
        }
      } else if (templateType === 'PERSONAL_ACCOUNT') {
        defaultValues = { broker: brokerName, accountLabel }
      }
      const t = await templateService.createTemplate({ name: name.trim(), type: templateType, defaultValues })
      setTemplates((prev) => [t, ...prev])
      resetForm()
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleToggleFavorite(id: string) {
    const t = await templateService.toggleFavorite(id)
    setTemplates((prev) => {
      const updated = prev.map((p) => p.id === id ? t : p)
      updated.sort((a, b) => (a.isFavorite === b.isFavorite ? 0 : a.isFavorite ? -1 : 1))
      return updated
    })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    if (deleteWithTrades) {
      const trades = await tradeService.listTrades({ templateId: deleteTarget, limit: 1000 })
      for (const t of trades.trades) {
        await tradeService.deleteTrade(t.id)
      }
    }
    await templateService.deleteTemplate(deleteTarget)
    setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget))
    setDeleteTarget(null)
    setShowDeleteDialog(false)
  }

  function openDeleteDialog(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleteTarget(id)
    setDeleteWithTrades(false)
    setShowDeleteDialog(true)
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

  const typeIcon = (type: string) => {
    switch (type) {
      case 'PROP_FIRM': return <Building2 className="w-4 h-4" />
      case 'PERSONAL_ACCOUNT': return <User className="w-4 h-4" />
    }
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case 'PROP_FIRM': return 'Prop Firm'
      case 'PERSONAL_ACCOUNT': return 'Personal'
    }
  }

  const typeColor = (type: string) => {
    switch (type) {
      case 'PROP_FIRM': return 'bg-purple-500/10 text-purple-400'
      case 'PERSONAL_ACCOUNT': return 'bg-blue-500/10 text-blue-400'
    }
  }

  const sortedTemplates = useMemo(() => {
    const statusOrder: Record<string, number> = { ACTIVE: 0, PASSED: 1, FAILED: 2 }
    return [...templates].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      const sa = statusOrder[progressMap[a.id]?.status || 'ACTIVE'] ?? 0
      const sb = statusOrder[progressMap[b.id]?.status || 'ACTIVE'] ?? 0
      return sa - sb
    })
  }, [templates, progressMap])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Accounts</h1>
          <p className="text-text-secondary mt-1">Manage your prop firm challenges, personal accounts, and journal entries.</p>
        </div>
        <Button onClick={() => {
          if (!isPro && templates.length >= (plan?.accountLimit ?? 2)) {
            setShowUpgradeDialog(true)
            return
          }
          resetForm(); setShowForm(!showForm)
        }} leftIcon={<Plus className="w-4 h-4" />}>
          New Account
        </Button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <div className="flex gap-2">
            {(['PROP_FIRM', 'PERSONAL_ACCOUNT'] as const).map((type) => (
              <button key={type} onClick={() => { setTemplateType(type); setErrors({}) }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  templateType === type
                    ? type === 'PROP_FIRM' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-input border-border text-text-secondary hover:bg-hover'
                }`}>
                {type === 'PROP_FIRM' ? 'Prop Firm Challenge' : 'Personal Account'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="tpl-name" label="Name" placeholder={templateType === 'PROP_FIRM' ? 'e.g., FTMO $50k Eval' : 'e.g., TD Ameritrade'}
              value={name} onChange={(e) => { setName(e.target.value); clearError('name') }} required
              error={errors.name} />
          </div>

          {templateType === 'PROP_FIRM' && (
            <>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-secondary">Market Type</label>
                <div className="flex gap-2">
                  {(['FOREX', 'FUTURES'] as const).map((type) => (
                    <button key={type} type="button" onClick={() => { setMarketType(type); setPlatform('') }}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                        marketType === type
                          ? type === 'FOREX' ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                          : 'bg-input border-border text-text-secondary hover:bg-hover'
                      }`}>
                      {type === 'FOREX' ? <><Globe className="w-3.5 h-3.5 inline mr-1" /> Forex</> : <><BarChart3 className="w-3.5 h-3.5 inline mr-1" /> Futures</>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Platform" value={platform} onChange={(v) => { setPlatform(v); clearError('platform') }}
                  placeholder="Select platform"
                  error={errors.platform}
                  options={(marketType === 'FOREX' ? FOREX_PLATFORMS : FUTURES_PLATFORMS).map((p) => ({ value: p, label: p }))} />
                <div className="space-y-1.5">
                   <label className="block text-sm font-medium text-text-secondary">Account Size</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(marketType === 'FUTURES' ? FUTURES_ACCOUNT_SIZE_PRESETS : FOREX_ACCOUNT_SIZE_PRESETS).map((size) => (
                      <button key={size} type="button" onClick={() => { setAccountSize(size.toString()); setAccountSizeCustom('') }}
                        className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                          accountSize === size.toString()
                            ? 'bg-primary/10 border-primary/30 text-primary-light'
                            : 'bg-input border-border text-text-muted hover:bg-hover'
                        }`}>
                        ${(size / 1000).toFixed(0)}k
                      </button>
                    ))}
                    <button type="button" onClick={() => setAccountSize('custom')}
                      className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                        accountSize === 'custom'
                          ? 'bg-primary/10 border-primary/30 text-primary-light'
                          : 'bg-input border-border text-text-muted hover:bg-hover'
                      }`}>
                      Custom
                    </button>
                  </div>
                  {accountSize === 'custom' && (
                    <Input id="account-size-custom" type="number" placeholder="Enter custom size"
                      value={accountSizeCustom} onChange={(e) => setAccountSizeCustom(e.target.value)} />
                  )}
                  {accountSize && accountSize !== 'custom' && (
                    <p className="text-[10px] text-text-muted">${parseInt(accountSize).toLocaleString()}</p>
                  )}
                </div>
              </div>

              <Input id="current-account-size" label="Current Account Balance ($)" type="number" placeholder="e.g., 52000"
                value={currentAccountSize} onChange={(e) => setCurrentAccountSize(e.target.value)} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Phase" value={phase} onChange={(v) => { setPhase(v); if (v === 'FUNDED') setTargetProfit('') }}
                  placeholder="Select phase"
                  options={[
                    { value: 'EVALUATION_PHASE1', label: 'Evaluation Phase 1' },
                    ...(marketType !== 'FUTURES' ? [{ value: 'EVALUATION_PHASE2', label: 'Evaluation Phase 2' }] : []),
                    { value: 'FUNDED', label: 'Funded' },
                  ]} />
                {phase !== 'FUNDED' && (
                  <Input id="target-profit" label="Target Profit ($)" type="number" placeholder="e.g., 5000"
                    value={targetProfit} onChange={(e) => setTargetProfit(e.target.value)} />
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text-secondary">Max Daily Drawdown ($)</label>
                  <div className="flex items-center gap-3">
                    <Input id="daily-dd" type="number" placeholder="e.g., 1000"
                      value={noDailyDrawdown ? '' : maxDailyDrawdown}
                      onChange={(e) => setMaxDailyDrawdown(e.target.value)}
                      disabled={noDailyDrawdown}
                      className="flex-1" />
                    <label className="flex items-center gap-1.5 text-sm text-text-muted cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={noDailyDrawdown}
                        onChange={(e) => setNoDailyDrawdown(e.target.checked)}
                        className="accent-primary w-4 h-4 rounded border-border" />
                      No limit
                    </label>
                  </div>
                </div>
                <Input id="total-dd" label="Max Total Drawdown ($)" type="number" placeholder="e.g., 2500"
                  value={maxTotalDrawdown} onChange={(e) => setMaxTotalDrawdown(e.target.value)} />
              </div>
            </>
          )}

          {templateType === 'PERSONAL_ACCOUNT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="broker-name" label="Broker Name" placeholder="e.g., TD Ameritrade"
                value={brokerName} onChange={(e) => setBrokerName(e.target.value)} />
              <Input id="account-label" label="Account Label (optional)" placeholder="e.g., Margin #1234"
                value={accountLabel} onChange={(e) => setAccountLabel(e.target.value)} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={isCreating}>Create</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center text-text-muted">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No accounts yet. Create your first account to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortedTemplates.map((tpl) => {
            const dv = tpl.defaultValues || {}
            const progress = progressMap[tpl.id]
            const target = dv.targetProfit as number || 0
            const totalDrawdown = dv.maxTotalDrawdown as number || 0
            const progressPercent = target > 0 ? Math.min(100, Math.max(0, ((progress?.totalPnl || 0) / target) * 100)) : 0
            const drawdownPercent = totalDrawdown > 0 ? Math.min(100, Math.max(0, ((progress?.maxDrawdown || 0) / totalDrawdown) * 100)) : 0

            return (
              <div key={tpl.id}
                {...makeLongPress(tpl.id)}
                className={`card p-5 min-h-[220px] hover:border-primary/30 transition-all group cursor-pointer relative ${selectedIds.has(tpl.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                onClick={() => {
                  if (longPressTriggeredRef.current) { longPressTriggeredRef.current = false; return }
                  if (selecting) { toggleSelect(tpl.id); return }
                  setSelectedAccount(tpl)
                }}
                onContextMenu={(e) => { e.preventDefault(); setSelecting(true); setSelectedIds((prev) => { const next = new Set(prev); next.add(tpl.id); return next }) }}>
                {selecting && (
                  <div className="absolute top-3 left-3 z-10">
                    {selectedIds.has(tpl.id) ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-text-muted" />
                    )}
                  </div>
                )}
                <div className={`flex items-start justify-between mb-3 ${selecting ? 'ml-8' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeColor(tpl.type)}`}>
                      {typeIcon(tpl.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary text-base">{tpl.name}</h3>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${typeColor(tpl.type)}`}>
                        {typeLabel(tpl.type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(tpl.id) }} className="p-1 text-text-muted hover:text-warning transition-colors">
                      <Star className={`w-4 h-4 ${tpl.isFavorite ? 'fill-warning text-warning' : ''}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); openDeleteDialog(tpl.id, e) }} className="p-1 text-text-muted hover:text-danger transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                    {tpl.type === 'PROP_FIRM' && (
                      <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                          <span className={`font-medium px-1.5 py-0.5 rounded ${dv.marketType === 'FUTURES' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                            {dv.marketType === 'FUTURES' ? 'Futures' : 'Forex'}
                          </span>
                          {dv.accountSize && (
                            <span>Account: <span className="text-text-secondary">${(dv.accountSize as number).toLocaleString()}</span></span>
                          )}
                          {(() => {
                            const st = progress?.status || 'ACTIVE'
                            if (st === 'PASSED')
                              return <span className="font-medium px-1.5 py-0.5 rounded bg-success/15 text-success">Passed</span>
                            if (st === 'FAILED')
                              return <span className="font-medium px-1.5 py-0.5 rounded bg-danger/15 text-danger">Failed</span>
                            return <span className="font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary-light">Active</span>
                          })()}
                        </div>

                    {dv.currentAccountSize && (
                      <div className="flex items-center gap-1 text-sm text-text-muted">
                        <DollarSign className="w-3 h-3" />
                        Current Balance: <span className="text-text-primary font-medium">${(dv.currentAccountSize as number).toLocaleString()}</span>
                      </div>
                    )}

                    {target > 0 && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted flex items-center gap-1"><Target className="w-3 h-3" /> Target: ${target.toLocaleString()}</span>
                          <span className={progress && progress.totalPnl >= 0 ? 'text-success' : 'text-danger'}>
                            ${progress?.totalPnl.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div className="h-1.5 bg-glass rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${progress?.status === 'PASSED' ? 'bg-success' : progressPercent >= 100 ? 'bg-success' : 'bg-primary'}`}
                            style={{ width: `${progressPercent}%` }} />
                        </div>
                      </>
                    )}

                    {totalDrawdown > 0 && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Drawdown: ${totalDrawdown.toLocaleString()}</span>
                          <span className={progress && progress.maxDrawdown > 0 ? 'text-danger' : 'text-text-muted'}>
                            ${progress?.maxDrawdown.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div className="h-1.5 bg-glass rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${progress?.status === 'FAILED' ? 'bg-danger' : drawdownPercent > 70 ? 'bg-danger' : 'bg-warning'}`}
                            style={{ width: `${drawdownPercent}%` }} />
                        </div>
                      </>
                    )}

                    {progress?.dailyData && progress.dailyData.some(d => d.dailyDrawdownBreached) && (
                      <div className="flex items-center gap-1 text-xs text-danger">
                        <AlertTriangle className="w-3 h-3" />
                        Daily drawdown breached
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {progress?.tradesCount || 0} trades</span>
                      <span className="text-success">{progress?.winningTrades || 0}W</span>
                      <span className="text-danger">{progress?.losingTrades || 0}L</span>
                    </div>


                  </div>
                )}

                {tpl.type === 'PERSONAL_ACCOUNT' && (
                  <div className="text-sm text-text-muted mt-3 pt-3 border-t border-border/50 space-y-1">
                    {dv.broker && <p>Broker: <span className="text-text-secondary">{dv.broker as string}</span></p>}
                    {dv.accountLabel && <p>Account: <span className="text-text-secondary">{dv.accountLabel as string}</span></p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 2-Option Delete Dialog */}
      {showDeleteDialog && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowDeleteDialog(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative card p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Delete Account</h2>
              <button onClick={() => setShowDeleteDialog(false)} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-text-secondary mb-2">This account will be deleted. What about its trades?</div>
            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-hover cursor-pointer" onClick={() => setDeleteWithTrades(false)}>
                <input type="radio" checked={!deleteWithTrades} onChange={() => setDeleteWithTrades(false)} className="accent-primary w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Keep journaled trades</p>
                  <p className="text-xs text-text-muted">Trades remain in your journal without this account.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-hover cursor-pointer" onClick={() => setDeleteWithTrades(true)}>
                <input type="radio" checked={deleteWithTrades} onChange={() => setDeleteWithTrades(true)} className="accent-primary w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Delete trades too</p>
                  <p className="text-xs text-text-muted">All trades linked to this account will also be deleted.</p>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                <Trash2 className="w-4 h-4 mr-1" />
                {deleteWithTrades ? 'Delete account & trades' : 'Delete account only'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 overflow-y-auto"
          onClick={() => setSelectedAccount(null)}>
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-2xl my-auto shadow-[0_6px_25px_rgba(0,0,0,0.08)]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${typeColor(selectedAccount.type)}`}>
                  {typeIcon(selectedAccount.type)}
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-text-primary">{selectedAccount.name}</h2>
                  {selectedAccount.type === 'PROP_FIRM' && (
                    <div className="relative" data-status-edit>
                      <button onClick={() => setStatusEditId(statusEditId === selectedAccount.id ? null : selectedAccount.id)}
                        className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded transition-colors hover:opacity-80">
                        {(() => {
                          const p = progressMap[selectedAccount.id]
                          const st = p?.status || 'ACTIVE'
                          const stColor = st === 'PASSED' ? 'bg-success/15 text-success' : st === 'FAILED' ? 'bg-danger/15 text-danger' : 'bg-primary/15 text-primary-light'
                          return <span className={`font-medium px-1.5 py-0.5 rounded ${stColor}`}>{st === 'PASSED' ? 'Passed' : st === 'FAILED' ? 'Failed' : 'Active'}</span>
                        })()}
                      </button>
                      {statusEditId === selectedAccount.id && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border/50 rounded-xl shadow-2xl p-1.5 min-w-[140px]">
                          <button onClick={async () => { await templateService.overrideStatus(selectedAccount.id, null); setStatusEditId(null); try { const p = await templateService.getChallengeProgress(selectedAccount.id); setProgressMap((prev) => ({ ...prev, [selectedAccount.id]: p })) } catch {} }}
                            className={`w-full text-left text-xs font-medium px-3 py-2 rounded-lg transition-colors ${!progressMap[selectedAccount.id]?.manualOverride && progressMap[selectedAccount.id]?.status === 'ACTIVE' ? 'bg-primary/20 text-primary-light' : 'text-text-secondary hover:bg-hover'}`}>
                            Active
                          </button>
                          <button onClick={async () => { await templateService.overrideStatus(selectedAccount.id, 'PASSED'); setStatusEditId(null); try { const p = await templateService.getChallengeProgress(selectedAccount.id); setProgressMap((prev) => ({ ...prev, [selectedAccount.id]: p })) } catch {} }}
                            className={`w-full text-left text-xs font-medium px-3 py-2 rounded-lg transition-colors ${progressMap[selectedAccount.id]?.status === 'PASSED' ? 'bg-success/20 text-success' : 'text-text-secondary hover:bg-hover'}`}>
                            Passed
                          </button>
                          <button onClick={async () => { await templateService.overrideStatus(selectedAccount.id, 'FAILED'); setStatusEditId(null); try { const p = await templateService.getChallengeProgress(selectedAccount.id); setProgressMap((prev) => ({ ...prev, [selectedAccount.id]: p })) } catch {} }}
                            className={`w-full text-left text-xs font-medium px-3 py-2 rounded-lg transition-colors ${progressMap[selectedAccount.id]?.status === 'FAILED' ? 'bg-danger/20 text-danger' : 'text-text-secondary hover:bg-hover'}`}>
                            Failed
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {(() => {
                const dv = selectedAccount.defaultValues || {}
                const progress = progressMap[selectedAccount.id]
                const target = dv.targetProfit as number || 0
                const totalDrawdown = dv.maxTotalDrawdown as number || 0
                const progressPercent = target > 0 ? Math.min(100, Math.max(0, ((progress?.totalPnl || 0) / target) * 100)) : 0
                const drawdownPercent = totalDrawdown > 0 ? Math.min(100, Math.max(0, ((progress?.maxDrawdown || 0) / totalDrawdown) * 100)) : 0

                function tradePnL(t: Trade) {
                  if (!t.entryPrice || !t.exitPrice) return 0
                  const diff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
                  const pips = t.pipSize && t.pipSize !== 0 ? diff / t.pipSize : diff
                  return pips * (t.pipValue || 1) * (t.quantity || 1) - (t.fees || 0)
                }

                const totalPnL = accountTrades.reduce((s, t) => s + tradePnL(t), 0)
                const wins = accountTrades.filter((t) => t.result === 'WIN').length
                const losses = accountTrades.filter((t) => t.result === 'LOSS').length
                const winRate = accountTrades.length > 0 ? Math.round((wins / accountTrades.length) * 100) : 0
                const grossProfit = accountTrades.reduce((s, t) => s + (tradePnL(t) > 0 ? tradePnL(t) : 0), 0)
                const grossLoss = accountTrades.reduce((s, t) => s + (tradePnL(t) < 0 ? Math.abs(tradePnL(t)) : 0), 0)
                const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : null
                const avgTrade = accountTrades.length > 0 ? totalPnL / accountTrades.length : 0
                const biggestWin = accountTrades.length > 0 ? Math.max(...accountTrades.map(tradePnL)) : 0
                const biggestLoss = accountTrades.length > 0 ? Math.min(...accountTrades.map(tradePnL)) : 0

                return (
                  <>
                    {selectedAccount.type === 'PROP_FIRM' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {dv.platform && (
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Platform</p>
                            <p className="text-sm font-medium text-text-primary mt-0.5">{dv.platform as string}</p>
                          </div>
                        )}
                        {dv.marketType && (
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Market</p>
                            <p className="text-sm font-medium text-text-primary mt-0.5">{dv.marketType as string}</p>
                          </div>
                        )}
                        {dv.phase && (
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Phase</p>
                            <p className="text-sm font-medium text-text-primary mt-0.5">{(dv.phase as string).replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {dv.accountSize && (
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Account Size</p>
                            <p className="text-sm font-medium text-text-primary mt-0.5">${(dv.accountSize as number).toLocaleString()}</p>
                          </div>
                        )}
                        {dv.currentAccountSize && (
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Current Balance</p>
                            <p className="text-sm font-bold mt-0.5 text-text-primary">
                              ${(dv.currentAccountSize as number).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedAccount.type === 'PERSONAL_ACCOUNT' && (
                      <div className="grid grid-cols-2 gap-3">
                        {dv.broker && (
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Broker</p>
                            <p className="text-sm font-medium text-text-primary mt-0.5">{dv.broker as string}</p>
                          </div>
                        )}
                        {dv.accountLabel && (
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Account</p>
                            <p className="text-sm font-medium text-text-primary mt-0.5">{dv.accountLabel as string}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {accountTradesLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : accountTrades.length === 0 ? (
                      <p className="text-center text-text-muted py-8">No trades for this account yet.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="bg-hover rounded-xl p-3 text-center">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Total P&L</p>
                            <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
                            </p>
                          </div>
                          <div className="bg-hover rounded-xl p-3 text-center cursor-pointer hover:bg-card transition-colors"
                            onClick={() => { setSelectedAccount(null); navigate(`/trades?templateId=${selectedAccount.id}`) }}>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Trades</p>
                            <p className="text-lg font-bold text-text-primary">{accountTrades.length}</p>
                          </div>
                          <div className="bg-hover rounded-xl p-3 text-center">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Wins</p>
                            <p className="text-lg font-bold text-success">{wins}</p>
                          </div>
                          <div className="bg-hover rounded-xl p-3 text-center">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Losses</p>
                            <p className="text-lg font-bold text-danger">{losses}</p>
                          </div>
                          <div className="bg-hover rounded-xl p-3 text-center">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Win Rate</p>
                            <p className="text-lg font-bold text-text-primary">{winRate}%</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Avg Trade</p>
                            <p className={`text-sm font-bold mt-0.5 ${avgTrade >= 0 ? 'text-success' : 'text-danger'}`}>
                              {avgTrade >= 0 ? '+' : ''}${avgTrade.toFixed(0)}
                            </p>
                          </div>
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Profit Factor</p>
                            <p className="text-sm font-bold mt-0.5 text-text-primary">
                              {profitFactor !== null ? profitFactor.toFixed(2) : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Biggest Win</p>
                            <p className="text-sm font-bold mt-0.5 text-success">+${biggestWin.toFixed(0)}</p>
                          </div>
                          <div className="bg-hover rounded-xl p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Biggest Loss</p>
                            <p className="text-sm font-bold mt-0.5 text-danger">-${Math.abs(biggestLoss).toFixed(0)}</p>
                          </div>
                        </div>

                        {selectedAccount.type === 'PROP_FIRM' && target > 0 && (
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-text-muted">Target Progress</span>
                                <span className={progress && progress.totalPnl >= 0 ? 'text-success' : 'text-danger'}>
                                  ${progress?.totalPnl?.toLocaleString() || '0'} / ${target.toLocaleString()}
                                </span>
                              </div>
                              <div className="h-2 bg-glass rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${progress?.status === 'PASSED' ? 'bg-success' : progressPercent >= 100 ? 'bg-success' : 'bg-primary'}`}
                                  style={{ width: `${Math.min(100, progressPercent)}%` }} />
                              </div>
                            </div>
                            {totalDrawdown > 0 && (
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-text-muted">Drawdown</span>
                                  <span className={progress && progress.maxDrawdown > 0 ? 'text-danger' : 'text-text-muted'}>
                                    ${progress?.maxDrawdown?.toLocaleString() || '0'} / ${totalDrawdown.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-2 bg-glass rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${progress?.status === 'FAILED' ? 'bg-danger' : drawdownPercent > 70 ? 'bg-danger' : 'bg-warning'}`}
                                    style={{ width: `${Math.min(100, drawdownPercent)}%` }} />
                                </div>
                              </div>
                            )}
                            {progress?.dailyData && progress.dailyData.some(d => d.dailyDrawdownBreached) && (
                              <div className="flex items-center gap-1 text-xs text-danger">
                                <AlertTriangle className="w-3 h-3" />
                                Daily drawdown breached
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      <UpgradeDialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} />

      {batchDeleteTarget > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { if (!batchDeleteLoading) setBatchDeleteTarget(0) }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative card p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Delete Accounts</h2>
              <button onClick={() => { if (!batchDeleteLoading) setBatchDeleteTarget(0) }} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-text-secondary mb-2">{batchDeleteTarget} accounts will be deleted. What about their trades?</div>
            <div className="space-y-2 mb-6">
              <label className={`flex items-center gap-3 p-3 rounded-xl bg-hover cursor-pointer ${batchDeleteLoading ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => setBatchDeleteWithTrades(false)}>
                <input type="radio" checked={!batchDeleteWithTrades} onChange={() => setBatchDeleteWithTrades(false)} className="accent-primary w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Keep journaled trades</p>
                  <p className="text-xs text-text-muted">Trades remain in your journal without these accounts.</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl bg-hover cursor-pointer ${batchDeleteLoading ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => setBatchDeleteWithTrades(true)}>
                <input type="radio" checked={batchDeleteWithTrades} onChange={() => setBatchDeleteWithTrades(true)} className="accent-primary w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Delete trades too</p>
                  <p className="text-xs text-text-muted">All trades linked to these accounts will also be deleted.</p>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setBatchDeleteTarget(0)} disabled={batchDeleteLoading}>Cancel</Button>
              <Button variant="danger" onClick={async () => {
                setBatchDeleteLoading(true)
                const ids = Array.from(selectedIds)
                try {
                  if (batchDeleteWithTrades) {
                    for (const id of ids) {
                      const trades = await tradeService.listTrades({ templateId: id, limit: 1000 })
                      for (const t of trades.trades) {
                        await tradeService.deleteTrade(t.id)
                      }
                    }
                  }
                  await templateService.batchDeleteTemplates(ids)
                  cancelSelect()
                  setBatchDeleteTarget(0)
                  setTemplates((prev) => prev.filter((t) => !ids.includes(t.id)))
                  toast.success(`${ids.length} accounts deleted`)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to delete accounts')
                } finally {
                  setBatchDeleteLoading(false)
                }
              }} isLoading={batchDeleteLoading}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <SelectionBar
        count={selectedIds.size}
        onDelete={() => setBatchDeleteTarget(selectedIds.size)}
        onCancel={cancelSelect}
      />
    </div>
  )
}