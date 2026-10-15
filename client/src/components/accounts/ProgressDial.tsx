import { useMemo } from 'react'
import type { ChallengeProgress } from '../../services/accounts'
import { cn } from '../../lib/utils'

interface DialProps {
  progress: ChallengeProgress
  size?: number
}

export function ProgressDial({ progress, size = 128 }: DialProps) {
  const { phases, totalPnl, nextTarget, isFunded, phaseIndex, phaseStartBalance } = progress as ChallengeProgress & { phaseStartBalance: number }

  const target = nextTarget !== null && nextTarget >= 0 ? totalPnl + nextTarget : 0
  const baseAccountSize = (phaseStartBalance as number) || 0
  const fundedPct = baseAccountSize > 0 ? (totalPnl / baseAccountSize) * 100 : 0
  const pct = isFunded ? Math.min(100, Math.max(0, fundedPct)) : target > 0 ? Math.min(100, Math.max(0, (totalPnl / target) * 100)) : 0
  const displayPct = isFunded ? fundedPct : pct
  const stepCount = Math.max(1, phases.length)

  const r = size * 0.4
  const c = 2 * Math.PI * r
  const dash = (p: number) => (p / 100) * c

  const ticks = useMemo(() => {
    return Array.from({ length: stepCount }, (_, i) => {
      const angle = (i / stepCount) * 360 - 90
      return { angle, index: i }
    })
  }, [stepCount])

  function polar(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180
    return { x: size / 2 + radius * Math.cos(rad), y: size / 2 + radius * Math.sin(rad) }
  }

  const dotAngle = (pct / 100) * 360 - 90
  const dot = polar(dotAngle, r)

  const stepColor = (i: number) => {
    if (isFunded || phases[i]?.status === 'COMPLETED') return 'text-success'
    if (i <= phaseIndex) return 'bg-primary/40'
    return 'text-border'
  }

  const fundedGainColor = displayPct >= 0 ? 'text-violet-400' : 'text-danger'
  const fundedGainBg = displayPct >= 0 ? 'from-violet-500/20 via-transparent to-violet-500/10' : 'from-danger/20 via-transparent to-danger/10'

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
          {isFunded && displayPct >= 0 && (
            <linearGradient id="fundedGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#D946EF" />
            </linearGradient>
          )}
          {isFunded && displayPct < 0 && (
            <linearGradient id="fundedLossGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          )}
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={10}
          className="stroke-border"
          strokeDasharray={`${dash(100)} ${c}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          stroke={isFunded ? (displayPct >= 0 ? 'url(#fundedGrad)' : 'url(#fundedLossGrad)') : 'url(#dialGrad)'}
          strokeOpacity={isFunded ? 0.9 : 0.9}
          strokeDasharray={`${dash(Math.max(2, Math.min(100, pct)))} ${c}`}
        />
        {isFunded && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r - 2}
            fill="none"
            strokeWidth={4}
            stroke="url(#fundedGrad)"
            strokeOpacity={0.15}
            strokeDasharray={`${dash(100)} ${c}`}
          />
        )}
        <circle
          cx={dot.x}
          cy={dot.y}
          r={isFunded ? 6 : 5}
          className={isFunded ? (displayPct >= 0 ? 'fill-violet-400' : 'fill-danger') : pct >= 100 ? 'fill-success' : 'fill-primary-light'}
          style={{ filter: isFunded && displayPct >= 0 ? 'drop-shadow(0 0 8px #8B5CF6)' : 'drop-shadow(0 0 6px var(--color-primary-glow))' }}
        />
        {ticks.map(({ angle, index }) => {
          const inner = polar(angle, r - 11)
          const outer = polar(angle, r - 5)
          return (
            <line
              key={index}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              strokeWidth={2.5}
              strokeLinecap="round"
              className={cn('stroke-current', stepColor(index))}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="relative mb-1">
          {isFunded && (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div className={`w-[${size * 0.65}px] h-[${size * 0.65}px] rounded-full bg-gradient-to-br ${fundedGainBg} blur-xl opacity-60 animate-pulse`} />
            </div>
          )}
          <span
            className={cn(
              'font-mono font-bold leading-none tabular-nums relative z-10',
              isFunded ? fundedGainColor : pct >= 100 ? 'text-success' : 'text-text-primary'
            )}
            style={{ fontSize: size * 0.28 }}
          >
            {isFunded ? `${displayPct >= 0 ? '+' : ''}${displayPct.toFixed(2)}` : Math.round(pct)}
            <span className="text-[0.55em]">%</span>
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-widest text-text-muted mt-1.5">
          {isFunded ? 'gain' : 'to target'}
        </span>
      </div>
    </div>
  )
}