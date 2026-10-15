import { useMemo, useState } from 'react'
import {
  ArrowRight, CalendarClock, Check, DollarSign, PauseCircle, Plus, RotateCcw,
  Pencil, Trophy, X, Zap, Clock, ChevronDown, Flag, Wallet, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { cn } from '../../lib/utils'
import * as accountService from '../../services/accounts'
import { isSelectPlan, getFundedVariants } from '../../services/accounts'
import type { Account, ChallengeProgress } from '../../services/accounts'
import type { PropFirm } from '../../services/propFirms'

const STATUS_PILLS: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  DAILY_PAUSED: 'bg-warning/10 text-warning',
  PASSED: 'bg-sky-500/10 text-sky-400',
  FAILED: 'bg-danger/10 text-danger',
  FUNDED: 'bg-violet-500/10 text-violet-400',
}
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  DAILY_PAUSED: 'Paused',
  PASSED: 'Passed',
  FAILED: 'Failed',
  FUNDED: 'Funded',
}

function fmtMoney(n: number) {
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtSigned(n: number) {
  const sign = n >= 0 ? '+' : '-'
  return sign + '$' + Math.abs(Number(n)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(d: string) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const EVENT_ICONS: Record<string, typeof Trophy> = {
  PHASE_ADVANCE: Trophy,
  PHASE_FAILED: X,
  BREACH: Zap,
  DAILY_BREACH: PauseCircle,
  PAUSE: PauseCircle,
  RESUME: Clock,
  PAYOUT: DollarSign,
  RESET: RotateCcw,
  CREATE: Plus,
}

interface Props {
  account: Account
  progress: ChallengeProgress | null
  firm: PropFirm | null
  onClose: () => void
  onEdit: () => void
  onChanged: (account: Account) => void
  onProgress: (progress: ChallengeProgress) => void
}

export function AccountDetailModal({ account, progress, firm, onClose, onEdit, onChanged, onProgress }: Props) {
  const [resetConfirm, setResetConfirm] = useState(false)
  const [statusDrop, setStatusDrop] = useState(false)
  const [statusConfirm, setStatusConfirm] = useState<'PASSED' | 'FAILED' | 'FUNDED' | null>(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutDate, setPayoutDate] = useState('')
  const [busy, setBusy] = useState(false)

  const dv = (account.defaultValues || {}) as Record<string, unknown>
  const currentBalance = progress?.balance ?? (Number(dv.currentAccountSize) || 0)
  const status = (progress?.status ?? account.status ?? 'ACTIVE') as string
  const payouts = useMemo(() => {
    const raw = dv.payouts
    if (!Array.isArray(raw)) return []
    return raw as Array<{ amount: number; date?: string }>
  }, [dv.payouts])

  const resetTimer = useMemo(() => {
    if (status !== 'DAILY_PAUSED' || !progress?.pausedUntil) return null
    return new Date(progress.pausedUntil)
  }, [status, progress?.pausedUntil])

  const planName = String(dv.planName || '')
  const accountSize = Number(dv.currentAccountSize) || Number(dv.startingBalance) || Number(dv.accountSize) || 0
  const needsPath = status === 'FUNDED' && isSelectPlan(planName) && !dv.fundedPath

  async function chooseFundedPath(id: 'flex' | 'daily') {
    setBusy(true)
    try {
      const variants = getFundedVariants(accountSize)
      const variant = variants.find((v) => v.id === id)
      const updated = await accountService.updateAccount(account.id, {
        challenge: { maxDailyDrawdown: variant?.maxDailyDrawdown ?? 0, dllBreach: 'PAUSE', fundedPath: id },
      })
      onChanged(updated)
      toast.success(`Funded path set: ${variant?.label}`)
      await refreshProgress()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set funded path')
    } finally {
      setBusy(false)
    }
  }

  async function refreshProgress() {
    try {
      const p = await accountService.getChallengeProgress(account.id)
      onProgress(p)
    } catch {}
  }

  async function handleOverride(status: 'PASSED' | 'FAILED' | 'FUNDED' | null) {
    setStatusDrop(false)
    setBusy(true)
    try {
      const updated = await accountService.overrideStatus(account.id, status)
      toast.success(
        status === 'PASSED' ? 'Phase passed — moved to next phase with fresh balance'
          : status === 'FUNDED' ? 'Account funded — fresh balance'
            : status === 'FAILED' ? 'Account marked as failed'
              : 'Override cleared — back to automatic tracking',
      )
      onChanged(updated)
      await refreshProgress()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    setResetConfirm(false)
    setBusy(true)
    try {
      const updated = await accountService.resetAccount(account.id)
      toast.success('Challenge reset to Phase 1')
      onChanged(updated)
      await refreshProgress()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset account')
    } finally {
      setBusy(false)
    }
  }

  async function handleAddPayout() {
    const amount = Number(payoutAmount.replace(/,/g, ''))
    if (!(amount > 0)) {
      toast.error('Enter a valid payout amount')
      return
    }
    setBusy(true)
    try {
      const updated = await accountService.addPayout(account.id, { amount, date: payoutDate || undefined })
      toast.success('Payout added — balance adjusted')
      onChanged(updated)
      setPayoutAmount('')
      setPayoutDate('')
      await refreshProgress()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add payout')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemovePayout(idx: number) {
    setBusy(true)
    try {
      const updated = await accountService.removePayout(account.id, idx)
      toast.success('Payout removed — balance adjusted')
      onChanged(updated)
      await refreshProgress()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove payout')
    } finally {
      setBusy(false)
    }
  }

  const events = progress?.events || []
  const nextTarget = progress?.nextTarget ?? null
  const pnlToTarget = nextTarget !== null ? nextTarget - progress!.totalPnl : null
  const drawdownUsed = progress ? Math.min(100, (Math.abs(progress.totalPnl < 0 ? progress.totalPnl : 0) / (progress.maxTotalDrawdown || 1)) * 100) : 0
  const phaseLabel = progress?.isFunded
    ? 'FUNDED'
    : progress
      ? `PHASE ${Math.min(progress.phaseIndex + 1, progress.planSteps)}/${progress.planSteps}`
      : null

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
       title={
         <div className="flex items-center gap-2">
           <span className="truncate">{account.name}</span>
         </div>
       }
       subtitle={
         <span className="flex items-center gap-1.5 flex-wrap">
           <span className="inline-block h-2 w-2 rounded-full" style={{ background: firm?.logoColor || '#6366f1' }} />
           {firm ? firm.name : (dv.firmName as string) || 'Prop Firm'}
           {(dv.planName as string) && <> · {(dv.planName as string)}</>}
           {(dv.sizeName as string) && <> · {(dv.sizeName as string)}</>}
           {firm && <span className="text-xs">· {firm.profitSplit}% split · {firm.payoutSpeed}</span>}
         </span>
       }
       header={
         <div className="flex flex-wrap items-center gap-2">
           <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full border', progress?.isFunded ? 'text-violet-400 border-violet-400/30 bg-violet-500/10' : 'text-primary-light border-primary/30 bg-primary/10')}>
             {phaseLabel}
           </span>
           <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', STATUS_PILLS[status] || 'bg-glass text-text-muted')}>
             {STATUS_LABELS[status] || status}
           </span>
           {progress?.manualOverride && (
             <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary-light">manual override</span>
           )}
         </div>
       }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setResetConfirm(true)} disabled={busy || status === 'FAILED'}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset challenge
            </Button>
            <div className="relative">
              <Button variant="secondary" onClick={() => setStatusDrop((v) => !v)} disabled={busy}>
                <Flag className="w-3.5 h-3.5" /> Set status <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              {statusDrop && (
                <div className="absolute z-20 bottom-full mb-1 left-0 w-56 bg-elevated border border-border rounded-xl shadow-2xl py-1">
                  <button type="button" onClick={() => setStatusConfirm('PASSED')} className="w-full text-left px-3.5 py-2.5 text-sm text-text-primary hover:bg-hover transition-colors">
                    ✓ Mark phase passed <span className="block text-[11px] text-text-muted">advance phase · fresh balance</span>
                  </button>
                  <button type="button" onClick={() => setStatusConfirm('FUNDED')} className="w-full text-left px-3.5 py-2.5 text-sm text-text-primary hover:bg-hover transition-colors">
                    🏆 Mark funded <span className="block text-[11px] text-text-muted">jump to funded · fresh balance</span>
                  </button>
                  <button type="button" onClick={() => setStatusConfirm('FAILED')} className="w-full text-left px-3.5 py-2.5 text-sm text-danger hover:bg-hover transition-colors">
                    ✕ Mark failed <span className="block text-[11px] text-text-muted">drawdown reached</span>
                  </button>
                  {progress?.manualOverride && (
                    <button type="button" onClick={() => handleOverride(null)} className="w-full text-left px-3.5 py-2.5 text-sm text-text-secondary hover:bg-hover transition-colors border-t border-border">
                      Clear override — back to auto
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" /> Edit Account
          </Button>
        </div>
      }
    >
      <div className="space-y-5 max-h-[62vh] overflow-y-auto pr-1">
        {needsPath && (
          <div className="rounded-xl border border-warning/40 bg-warning/[0.06] p-4">
            <p className="text-sm font-bold text-warning">Choose your funded path</p>
            <p className="text-xs text-text-secondary mt-1">
              Tradeify Select continues with one of two payout styles. Pick yours — journaling stays locked until you choose.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {getFundedVariants(accountSize).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={busy}
                  onClick={() => chooseFundedPath(v.id)}
                  className="text-left rounded-xl border border-border bg-input p-4 hover:border-primary/50 hover:bg-hover transition-colors disabled:opacity-60"
                >
                  <p className="text-sm font-bold text-text-primary">{v.label}</p>
                  <p className="text-xs text-text-muted mt-1">{v.desc}</p>
                  <p className="text-[11px] text-primary-light mt-2 font-mono uppercase tracking-wider">Select this path →</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {resetTimer && (
          <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Daily loss limit hit — trading paused until next NY session {resetTimer.toLocaleString()}.
          </div>
        )}

        {progress && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Phase pipeline</p>
                {phaseLabel && (
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border',
                      progress.isFunded ? 'text-violet-400 border-violet-400/30 bg-violet-500/10' : 'text-primary-light border-primary/30 bg-primary/10'
                    )}
                  >
                    {phaseLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {progress.phases.map((ph, i) => {
                  const failed = status === 'FAILED' && ph.status === 'CURRENT'
                  return (
                    <div key={ph.name} className="flex items-center gap-1.5">
                      {i > 0 && <ArrowRight className="w-3 h-3 text-text-muted" />}
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5',
                          ph.status === 'COMPLETED' ? 'bg-success/10 border-success/30 text-success'
                            : failed ? 'bg-danger/10 border-danger/40 text-danger'
                              : ph.status === 'CURRENT' ? 'bg-primary/10 border-primary/30 text-primary-light'
                                : 'bg-glass border-border text-text-muted'
                        )}
                      >
                        {ph.status === 'COMPLETED' && <Check className="w-3 h-3 shrink-0" />}
                        {failed && <X className="w-3 h-3 shrink-0" />}
                        {ph.status === 'CURRENT' && !failed && (
                          <span className="relative flex w-2 h-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-light opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-light" />
                          </span>
                        )}
                        {ph.status !== 'COMPLETED' && ph.status !== 'CURRENT' && !failed && (
                          <span className="inline-flex w-2 h-2 rounded-full border border-current opacity-50 shrink-0" />
                        )}
                        {ph.name.replace('PHASE', 'Phase ')}
                        <span className="opacity-70 font-mono">{fmtMoney(ph.target)}</span>
                      </span>
                    </div>
                  )
                })}
                {progress.isFunded && (
                  <div className="flex items-center gap-1.5">
                    {progress.phases.length > 0 && <ArrowRight className="w-3 h-3 text-text-muted" />}
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-success/10 border-success/40 text-success inline-flex items-center gap-1.5">
                      <Check className="w-3 h-3" /> Funded
                    </span>
                  </div>
                )}
              </div>
            </div>

<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
               <div className="rounded-xl bg-input border border-border p-3">
                 <p className="text-[10px] text-text-muted uppercase tracking-wider">Balance</p>
                 <p className="text-lg font-bold mt-0.5 text-text-primary">{fmtMoney(currentBalance)}</p>
               </div>
               <div className="rounded-xl bg-input border border-border p-3">
                 <p className="text-[10px] text-text-muted uppercase tracking-wider">Total P&L</p>
                 <p className={cn('text-lg font-bold mt-0.5', progress.totalPnl >= 0 ? 'text-success' : 'text-danger')}>{fmtSigned(progress.totalPnl)}</p>
               </div>
               <div className="rounded-xl bg-input border border-border p-3">
                 <p className="text-[10px] text-text-muted uppercase tracking-wider">Wins · Losses</p>
                 <p className="text-lg font-bold mt-0.5 text-text-primary">{progress.winningTrades} · {progress.losingTrades}</p>
                 <p className="text-[10px] text-text-muted">{progress.tradesCount} trades</p>
               </div>
               <div className="rounded-xl bg-input border border-border p-3">
                 <p className="text-[10px] text-text-muted uppercase tracking-wider">Max drawdown</p>
                 <p className="text-lg font-bold mt-0.5 text-danger">{fmtMoney(progress.maxDrawdown)}</p>
                 <p className="text-[10px] text-text-muted">peak {fmtMoney(progress.peakPnl)}</p>
               </div>
             </div>

             {progress.isFunded && (
               <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-transparent to-violet-500/5 p-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-[10px] text-violet-400/80 uppercase tracking-wider font-medium">Funded Gain</p>
                     <p className="text-2xl font-bold text-violet-300 mt-1">{fmtSigned(progress.totalPnl)}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-violet-400/80 uppercase tracking-wider">Return on Capital</p>
                     <p className="text-2xl font-bold text-violet-300 mt-1">+{(Number(progress.totalPnl) / (Number(progress.phaseStartBalance) || 1) * 100).toFixed(2)}%</p>
                   </div>
                 </div>
                 <div className="mt-4 h-2 bg-violet-500/20 rounded-full overflow-hidden">
                   <div
                     className="h-full bg-gradient-to-r from-violet-500 via-violet-400 to-fuchsia-400 rounded-full transition-all"
                     style={{ width: `${Math.min(100, Math.max(0, (Number(progress.totalPnl) / (Number(progress.phaseStartBalance) || 1) * 100)))}%` }}
                   />
                 </div>
                 <p className="text-[10px] text-violet-400/60 mt-2 text-center">Your funded account has grown by {((Number(progress.totalPnl) / (Number(progress.phaseStartBalance) || 1) * 100)).toFixed(2)}% since funding</p>
               </div>
             )}

             {!progress.isFunded && pnlToTarget !== null && (
              <div className="rounded-xl bg-input border border-border p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text-secondary">Progress toward phase {progress.phase.replace('PHASE', '')} target</span>
                  <span className={cn('font-medium', pnlToTarget > 0 ? 'text-success' : 'text-text-primary')}>
                    {fmtSigned(progress.totalPnl)} of {fmtSigned(nextTarget!)} {pnlToTarget > 0 && `(${fmtMoney(pnlToTarget)} left)`}
                  </span>
                </div>
                <div className="h-1.5 bg-glass rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, (progress.totalPnl / (nextTarget || 1)) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-text-muted">Max loss: {fmtMoney(progress.maxTotalDrawdown)} ({progress.drawdownType.replace('_', ' ').toLowerCase()})</span>
                  <span className={drawdownUsed >= 80 ? 'text-danger' : 'text-text-muted'}>
                    {Math.round(Math.max(0, progress.totalPnl < 0 ? (Math.abs(progress.totalPnl) / (progress.maxTotalDrawdown || 1)) * 100 : 0))}% used
                  </span>
                </div>
                <div className="h-1.5 bg-glass rounded-full overflow-hidden mt-1.5">
                  <div
                    className={cn('h-full rounded-full transition-all', drawdownUsed >= 80 ? 'bg-danger' : 'bg-warning')}
                    style={{ width: `${drawdownUsed}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Rules</p>
              <div className="rounded-xl border border-border divide-y divide-border">
                {[
                  ['Drawdown type', progress.drawdownType.replace('_', ' ').toLowerCase()],
                  ['Max total loss', progress.maxTotalDrawdown > 0 ? fmtMoney(progress.maxTotalDrawdown) : '—'],
                  ['Daily loss limit', progress.dailyLossLimit > 0 ? fmtMoney(progress.dailyLossLimit) : '—'],
                  ['Daily breach', progress.dllBreach === 'PAUSE' ? 'Pause trading (soft)' : 'Fail challenge (hard)'],
                  ['Trailing lock', progress.trailingLock === 'START' ? 'Start balance' : progress.trailingLock === 'START_PLUS_100' ? 'Start + $100' : 'None'],
                  ['Day start balance', fmtMoney(progress.dayStartBalance)],
                  ['P&L today', fmtSigned(progress.dailyPnlToday)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-text-muted">{label}</span>
                    <span className="font-medium text-text-secondary">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {events.length > 0 && (
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Timeline</p>
                <div className="rounded-xl border border-border divide-y divide-border">
                  {events.map((ev, i) => {
                    const Icon = EVENT_ICONS[ev.type] || CalendarClock
                    return (
                      <div key={i} className="flex items-start gap-3 px-3 py-2">
                        <Icon className="w-3.5 h-3.5 mt-0.5 text-primary-light shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-text-primary truncate">{ev.title}</p>
                            <span className="text-[10px] text-text-muted whitespace-nowrap">{fmtDateTime(ev.createdAt)}</span>
                          </div>
                          {ev.message && <p className="text-xs text-text-muted mt-0.5">{ev.message}</p>}
                          {ev.balance != null && <p className="text-[10px] text-text-secondary mt-0.5">{fmtMoney(ev.balance)}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {progress.isFunded && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-br from-violet-500/10 via-transparent to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
                      <Wallet className="w-4.5 h-4.5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Payouts</p>
                      <p className="text-[11px] text-text-muted">Withdrawals from funded equity</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">PAID {fmtMoney(progress.totalPayouts)}</span>
                    <span className="px-2.5 py-1 rounded-full bg-input border border-border text-text-secondary">Equity {fmtMoney(currentBalance)}</span>
                  </div>
                </div>

                {payouts.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-hover border border-dashed border-border flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-6 h-6 text-text-muted/50" />
                    </div>
                    <p className="text-sm font-medium text-text-secondary">No payouts yet</p>
                    <p className="text-xs text-text-muted mt-1">Add a withdrawal to deduct it from equity</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {payouts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-hover/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
                            <DollarSign className="w-3.5 h-3.5 text-success" />
                          </span>
                          <span className="text-sm font-semibold text-success">-{fmtMoney(p.amount)}</span>
                          <span className="text-xs text-text-muted font-mono">{p.date ? fmtDate(p.date) : '—'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePayout(i)}
                          disabled={busy}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-60 group-hover:opacity-100"
                          aria-label="Remove payout"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 bg-glass border-t border-border">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                        <Input className="pl-7" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="100.00" />
                      </div>
                    </div>
                    <div className="w-40">
                      <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Date</label>
                      <Input type="date" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} />
                    </div>
                    <Button onClick={handleAddPayout} disabled={busy} className="shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Add payout
                    </Button>
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-text-muted mt-2.5">
                    <Info className="w-3 h-3" /> Deducted from current balance immediately — e.g. $52,300 - $100 → $52,200.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {!progress && (
          <div className="rounded-xl border border-border p-4 text-center text-sm text-text-muted">
            No challenge data for this account yet.
            <div className="mt-3 flex justify-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-glass">Balance {fmtMoney(currentBalance)}</span>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={handleReset}
        isLoading={busy}
        title="Reset challenge?"
        message="This restarts the account fresh at Phase 1 - phase, floor, and progress are recomputed from your journaled trades. This cannot be undone."
        confirmLabel="Reset challenge"
      />
      <ConfirmDialog
        open={statusConfirm !== null}
        onClose={() => setStatusConfirm(null)}
        onConfirm={() => { const s = statusConfirm; setStatusConfirm(null); if (s) handleOverride(s) }}
        isLoading={busy}
        title={statusConfirm === 'PASSED' ? 'Mark phase passed?' : statusConfirm === 'FUNDED' ? 'Mark account funded?' : 'Mark account failed?'}
        message={
          statusConfirm === 'PASSED'
            ? `Advances to the next phase with a fresh ${accountSize.toLocaleString()} balance. This cannot be undone.`
            : statusConfirm === 'FUNDED'
              ? `Moves the account to funded status with a fresh ${accountSize.toLocaleString()} balance. This cannot be undone.`
              : 'Marks the account as failed (drawdown reached). This cannot be undone.'
        }
        confirmLabel={statusConfirm === 'FAILED' ? 'Mark failed' : 'Confirm'}
      />
    </Modal>
  )
}