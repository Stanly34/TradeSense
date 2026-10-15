import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Circle, Pencil, Star, Trash2, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useCountUp } from '../../hooks/useCountUp'
import { ProgressDial } from './ProgressDial'
import type { Account, ChallengeProgress } from '../../services/accounts'
import type { PropFirm } from '../../services/propFirms'

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  DAILY_PAUSED: 'bg-warning/10 text-warning',
  PASSED: 'bg-sky-500/10 text-sky-400',
  FAILED: 'bg-danger/10 text-danger',
  FUNDED: 'bg-violet-500/10 text-violet-400',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'ACTIVE',
  DAILY_PAUSED: 'PAUSED',
  PASSED: 'PASSED',
  FAILED: 'BLOWN',
  FUNDED: 'FUNDED',
}

function fmtMoney(n: number, _cents = true) {
  return (
    '$' +
    Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function EquitySparkline({ progress }: { progress: ChallengeProgress }) {
  const { path, areaPath, lastPct } = useMemo(() => {
    const pts = progress.snapshots.map((s) => s.endBalance)
    if (pts.length === 0) pts.push(progress.balance)
    pts.push(progress.balance)
    const min = Math.min(...pts)
    const max = Math.max(...pts)
    const span = max - min || 1
    const w = 100
    const h = 32
    const step = w / (pts.length - 1)
    const norm = pts.map((v, i) => ({
      x: i * step,
      y: h - ((v - min) / span) * (h - 4) - 2,
    }))
    const line = norm.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    const area = `${line} L${w},${h} L0,${h} Z`
    const lastY = norm[norm.length - 1].y
    return { path: line, areaPath: area, lastPct: (lastY / h) * 100 }
  }, [progress])

  const positive = progress.balance >= (progress.snapshots[progress.snapshots.length - 1]?.endBalance ?? progress.balance)
  const color = positive ? '#22C55E' : '#EF4444'

  return (
    <div className="relative h-12">
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={`band-${positive}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#band-${positive})`} />
        <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
      <span
        className={cn('absolute right-0.5 w-2 h-2 rounded-full animate-pulse', positive ? 'bg-success' : 'bg-danger')}
        style={{ bottom: `calc(${lastPct}% - 7px)` }}
      />
    </div>
  )
}

function FloorTrack({ progress }: { progress: ChallengeProgress }) {
  const { floor, balance, phaseStartBalance, nextTarget, isFunded, drawdownType, maxTotalDrawdown } = progress
  const target = isFunded ? balance : nextTarget !== null ? phaseStartBalance + nextTarget : phaseStartBalance
  const right = Math.max(target, balance, phaseStartBalance, floor + 1)
  const left = Math.min(floor, balance, phaseStartBalance)
  const span = right - left || 1
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - left) / span) * 100))
  const floorPct = pct(floor)
  const startPct = pct(phaseStartBalance)
  const balancePct = pct(balance)
  const targetPct = pct(target)
  const inDanger = !isFunded && balance <= floor + Math.abs(maxTotalDrawdown) * 0.25
  const pnlToGoal = target - balance

  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-glass">
        <div
          className={cn('absolute inset-y-0 rounded-full transition-colors', inDanger ? 'bg-danger/70 animate-pulse' : 'bg-danger/30')}
          style={{ left: `${floorPct}%`, width: `${Math.max(0, startPct - floorPct)}%` }}
        />
        <div className="absolute inset-y-0 rounded-full bg-success/60" style={{ left: `${startPct}%`, width: `${Math.max(0, targetPct - startPct)}%` }} />
        <div
          className={cn('absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 -translate-y-1/2', inDanger ? 'border-danger bg-danger' : 'border-emerald-300 bg-emerald-400')}
          style={{ left: `${balancePct}%`, transform: `translate(-50%, -50%)`, boxShadow: '0 0 8px rgba(34,197,94,0.5)' }}
        />
        {!isFunded && (
          <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-text-muted" style={{ left: `${startPct}%` }} />
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5 font-mono text-[10px]">
        <span className={cn('flex items-center gap-1', inDanger ? 'text-danger' : 'text-text-muted')}>
          <TrendingDown className="w-3 h-3" /> {fmtMoney(floor, false)}
        </span>
        {!isFunded && nextTarget !== null ? (
          <span className={cn(pnlToGoal > 0 ? 'text-success' : 'text-text-muted')}>
            {pnlToGoal > 0 ? `+${fmtMoney(pnlToGoal, false)} TO GOAL` : `GOAL ${fmtMoney(target, false)}`}
          </span>
        ) : (
          <span className="text-text-muted uppercase">{drawdownType.replace('_', '·')}</span>
        )}
        <span className="text-text-primary font-semibold">{fmtMoney(balance, false)}</span>
      </div>
    </div>
  )
}

interface CardProps {
  account: Account
  progress: ChallengeProgress | null
  firm: PropFirm | null
  selected: boolean
  selectionMode: boolean
  onToggleSelect: () => void
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onFavorite: () => void
  onLongPress: () => void
}

export function AccountCard({ account, progress, firm, selected, selectionMode, onToggleSelect, onOpen, onEdit, onDelete, onFavorite, onLongPress }: CardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longFiredRef = useRef(false)
  const [hovered, setHovered] = useState(false)

  const dv = (account.defaultValues || {}) as Record<string, unknown>
  const balance = account.type === 'PROP_FIRM'
    ? progress?.balance ?? (Number(dv.currentAccountSize) || 0)
    : Number(dv.currentAccountSize) || 0
  const status = (progress?.status ?? account.status ?? 'ACTIVE') as string
  const firmColor = firm?.logoColor || (account.type === 'PERSONAL_ACCOUNT' ? '#64748b' : '#6366F1')
  const animatedBalance = useCountUp(balance)
  const displayBalance = progress ? animatedBalance : balance

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    longFiredRef.current = false
    timerRef.current = setTimeout(() => {
      longFiredRef.current = true
      onLongPress()
    }, 550)
  }

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = undefined
  }

  function handleClick() {
    clearTimer()
    if (longFiredRef.current) return
    if (selectionMode) onToggleSelect()
    else onOpen()
  }

  const wins = progress?.winningTrades ?? 0
  const losses = progress?.losingTrades ?? 0
  const pausedAt = progress?.pausedUntil ? new Date(progress.pausedUntil) : null
  const paidTotal = progress?.isFunded
    ? (progress.totalPayouts || 0)
    : Array.isArray(dv.payouts)
      ? (dv.payouts as Array<{ amount: number }>).reduce((s, p) => s + (p.amount || 0), 0)
      : 0

  const dailyLeft = progress ? progress.dailyLossLimit + progress.dailyPnlToday : null

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={clearTimer}
      onPointerLeave={() => { clearTimer(); setHovered(false) }}
      onPointerEnter={() => setHovered(true)}
      onClick={handleClick}
      className={cn(
        'group relative rounded-2xl border bg-input/70 backdrop-blur cursor-pointer select-none overflow-hidden transition-all duration-300',
        selected ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border hover:border-border-hover'
      )}
      style={hovered && !selectionMode ? { boxShadow: `0 0 40px -8px ${firmColor}55, 0 8px 32px rgba(0,0,0,0.25)` } : undefined}
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${firmColor}, ${firmColor}00)` }} />

      {selectionMode && (
        <div className="absolute top-4 right-4 z-10">
          {selected ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-text-muted" />}
        </div>
      )}

      {status === 'FAILED' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rotate-[16deg]">
          <span className="text-4xl font-black tracking-[0.35em] text-danger/10 border-2 border-danger/10 rounded-xl px-5 py-1">
            BLOWN
          </span>
        </div>
      )}

      {status === 'FUNDED' && /select evaluation/i.test(String((account.defaultValues || {}).planName || '')) && !(account.defaultValues || {}).fundedPath && (
        <div className="px-5 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-warning/15 text-warning border border-warning/30 animate-pulse">
            Choose funded path
          </span>
        </div>
      )}

      <div className="px-5 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: firmColor }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: status === 'ACTIVE' ? '#22C55E' : status === 'DAILY_PAUSED' ? '#F59E0B' : status === 'FAILED' ? '#EF4444' : '#6366F1' }} />
            <span className={cn('w-1.5 h-1.5 rounded-full', progress?.manualOverride ? 'bg-primary' : 'bg-border')} />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-muted">T{account.name.length.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2">
            {progress?.isFunded && paidTotal > 0 && (
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                PAID {fmtMoney(paidTotal, false)}
              </span>
            )}
            <span className={cn('font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border', STATUS_STYLES[status] || 'bg-glass text-text-muted', 'border-current/20')}>
              {STATUS_LABELS[status] || status}
            </span>
            {!selectionMode && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onFavorite() }}
                  className={cn('p-1 rounded-lg transition-colors', account.isFavorite ? 'text-warning' : 'text-text-muted hover:text-warning hover:bg-hover')}
                  aria-label="Toggle favorite"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
                {account.type === 'PROP_FIRM' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit() }}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="p-1 rounded-lg text-text-muted hover:text-danger hover:bg-hover transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={cn('font-semibold text-text-primary truncate', status === 'FAILED' && 'opacity-50')}>{account.name}</h3>
            {account.isFavorite && <Star className="w-3.5 h-3.5 text-warning fill-warning shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-text-muted truncate font-mono">
              {firm?.name || (dv.firmName as string) || 'PROP FIRM'}
              {(dv.planName as string) && <> / {(dv.planName as string)}</>}
              {(dv.sizeName as string) && <> / {(dv.sizeName as string)}</>}
              {account.type === 'PERSONAL_ACCOUNT' && <> / {(dv.broker as string) || 'PERSONAL'}</>}
            </p>
            {account.type === 'PROP_FIRM' && progress && (
              <>
                {progress.isFunded ? (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-bold tracking-widest shrink-0">
                    FUNDED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary-light border border-primary/20 text-[10px] font-bold tracking-widest shrink-0">
                    PHASE {Math.min(progress.phaseIndex + 1, progress.planSteps)}/{progress.planSteps}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {status === 'DAILY_PAUSED' && pausedAt && (
          <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            SESSION PAUSED — RESUMES {pausedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {account.type === 'PROP_FIRM' && progress ? (
          <>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-muted">EQUITY</p>
                <p
                  className={cn(
                    'font-mono font-bold tabular-nums leading-none mt-1 text-3xl sm:text-4xl',
                    status === 'FAILED' ? 'text-danger/70'
                      : progress.isFunded ? 'text-violet-400'
                        : progress.totalPnl >= 0 ? 'text-success'
                          : 'text-danger'
                  )}
                >
                  {fmtMoney(displayBalance)}
                </p>
                <p className={cn('font-mono text-[11px] mt-1.5', progress.totalPnl >= 0 ? 'text-success/80' : 'text-danger/80')}>
                  {progress.totalPnl >= 0 ? '+' : ''}{fmtMoney(progress.totalPnl)} TOTAL P&L
                </p>
              </div>
              <ProgressDial progress={progress} size={124} />
            </div>
            <div className="mt-3">
              <EquitySparkline progress={progress} />
            </div>
            <div className="mt-3">
              <FloorTrack progress={progress} />
            </div>
          </>
        ) : account.type === 'PROP_FIRM' ? (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-muted">EQUITY</p>
            <p className="font-mono font-bold tabular-nums text-3xl text-text-primary mt-1">{fmtMoney(displayBalance)}</p>
            <p className="font-mono text-[11px] text-warning mt-2 animate-pulse">▌ SYNCING CHALLENGE…</p>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-muted">BALANCE</p>
              <p className="font-mono font-bold tabular-nums text-3xl text-text-primary mt-1">{fmtMoney(displayBalance)}</p>
              {(dv.accountLabel as string) && <p className="font-mono text-[11px] text-text-muted mt-1.5">{dv.accountLabel as string}</p>}
            </div>
            <div className="text-right font-mono text-[11px] text-text-muted">
              <p className="uppercase tracking-widest text-[10px]">LIVE</p>
              <p className="mt-1 text-success">● ONLINE</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border bg-glass/50 px-5 py-2.5 font-mono text-[10px] text-text-muted flex items-center gap-5 overflow-x-auto">
        <span className="shrink-0"><span className="text-text-muted">BAL </span><span className="text-text-primary">{fmtMoney(balance, false)}</span></span>
        {account.type === 'PROP_FIRM' && progress && (
          <>
            <span className="shrink-0"><span className="text-text-muted">TGT </span>
              <span className={progress.isFunded ? 'text-violet-400' : progress.nextTarget !== null ? 'text-text-primary' : 'text-text-muted'}>
                {progress.isFunded ? 'PAID' : progress.nextTarget !== null ? `+${fmtMoney(progress.nextTarget, false)}` : '—'}
              </span>
            </span>
            <span className="shrink-0"><span className="text-text-muted">DLL </span>
              <span className={dailyLeft !== null && dailyLeft <= 0 ? 'text-danger' : 'text-text-primary'}>
                {progress.dailyLossLimit > 0 ? `${fmtMoney(dailyLeft ?? 0, false)} LEFT` : '—'}
              </span>
            </span>
            <span className="shrink-0"><span className="text-text-muted">W·L </span><span className="text-text-primary">{wins}–{losses}</span></span>
            <span className="shrink-0"><span className="text-text-muted">TR </span><span className="text-text-primary">{progress.tradesCount}</span></span>
          </>
        )}
        {account.type === 'PERSONAL_ACCOUNT' && (
          <span className="shrink-0"><span className="text-text-muted">ACCT </span><span className="text-text-primary">{(dv.accountLabel as string) || '—'}</span></span>
        )}
      </div>
    </div>
  )
}
