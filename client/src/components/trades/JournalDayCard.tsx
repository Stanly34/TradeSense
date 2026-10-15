import { ChevronDown } from 'lucide-react'
import { calcTradePnl } from '../../lib/tradeMath'
import type { Trade } from '../../types/trade'

const resultStyles: Record<string, string> = {
  WIN: 'bg-success/10 text-success',
  LOSS: 'bg-danger/10 text-danger',
  BREAK_EVEN: 'bg-info/10 text-info border border-info/30',
}

interface JournalDayCardProps {
  dateKey: string
  dayTrades: Trade[]
  isOpen: boolean
  isToday: boolean
  onToggle: () => void
  onOpenTrade: (id: string) => void
}

export function JournalDayCard({ dateKey, dayTrades, isOpen, isToday, onToggle, onOpenTrade }: JournalDayCardProps) {
  const pnls = dayTrades.map(calcTradePnl)
  const dayPnl = pnls.reduce<number>((s, p) => s + (p ?? 0), 0)
  const wins = dayTrades.filter((t) => t.result === 'WIN').length
  const losses = dayTrades.filter((t) => t.result === 'LOSS').length
  const breaks = dayTrades.filter((t) => t.result === 'BREAK_EVEN').length
  const traded = dayTrades.filter((t) => t.result).length
  const winRate = traded > 0 ? Math.round((wins / traded) * 100) : 0
  const valid = pnls.filter((p): p is number => p !== null)
  const best = valid.length > 0 ? Math.max(...valid) : null
  const worst = valid.length > 0 ? Math.min(...valid) : null
  const dayDate = new Date(dateKey + 'T00:00:00')

  return (
    <div className={`card overflow-hidden group ${dayPnl >= 0 ? 'border-success/20 bg-success/[0.02]' : 'border-danger/20 bg-danger/[0.02]'}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
      >
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${dayPnl >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          <span className="text-base font-bold leading-none">{dayDate.getDate()}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide">{dayDate.toLocaleDateString('en-US', { month: 'short' })}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-text-primary">{dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            {isToday && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary-light">TODAY</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
            <span>{dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />{wins}
              <span className="w-1.5 h-1.5 rounded-full bg-danger ml-1.5" />{losses}
              {breaks > 0 && <><span className="w-1.5 h-1.5 rounded-full bg-border ml-1.5" />{breaks}</>}
            </span>
            {traded > 0 && <span>Win rate {winRate}%</span>}
            {best !== null && <span className="hidden sm:inline">Best {best >= 0 ? '+' : ''}{best.toFixed(2)}</span>}
            {worst !== null && <span className="hidden sm:inline">Worst {worst >= 0 ? '+' : ''}{worst.toFixed(2)}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xl font-bold ${dayPnl >= 0 ? 'text-success' : 'text-danger'}`}>{dayPnl >= 0 ? '+' : ''}{dayPnl.toFixed(2)}</p>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors mt-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            {isOpen ? 'Hide Day' : 'View Day'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="px-5 pb-4">
          <div className="relative">
            {dayTrades.map((trade, i) => {
              const tradePnl = calcTradePnl(trade)
              return (
                <div key={trade.id} className="flex">
                  <div className="flex flex-col items-center w-8 shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${tradePnl != null ? (tradePnl >= 0 ? 'bg-success' : 'bg-danger') : 'bg-border'}`} />
                    {i < dayTrades.length - 1 && <div className="w-px flex-1 bg-border/60" />}
                  </div>
                  <button
                    onClick={() => onOpenTrade(trade.id)}
                    className={`flex-1 flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-hover transition-colors text-left group mb-1 border-l-2 ${tradePnl != null && tradePnl >= 0 ? 'border-success/40' : 'border-danger/40'}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary tabular-nums w-12 shrink-0">
                          {trade.entryTime ? openDayTime(trade.entryTime) : '--'}
                        </span>
                        <span className="text-sm font-medium text-text-primary">{trade.instrument}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${trade.direction === 'LONG' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{trade.direction}</span>
                        {trade.tradeAccount && (
                          <span className={`hidden sm:inline text-[10px] font-medium ${trade.tradeAccount.type === 'PROP_FIRM' ? 'text-primary-light' : 'text-info'}`}>{trade.tradeAccount.name}</span>
                        )}
                        {trade.setup && <span className="hidden md:inline text-[10px] font-medium text-text-secondary bg-hover px-1.5 py-0.5 rounded">{trade.setup}</span>}
                        {trade.session && <span className="hidden lg:inline text-[10px] font-medium text-text-secondary">{trade.session.replace('_', ' ')}</span>}
                      </div>
                      {trade.reason && (
                        <p className="text-[11px] text-text-secondary leading-relaxed mt-1 line-clamp-2 max-w-md">{trade.reason}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {trade.status && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${trade.status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-hover text-text-muted'}`}>{trade.status}</span>
                        )}
                      </div>
                    </div>
                    {trade.images.length > 0 && (
                      <img
                        src={trade.images[0].imageUrl}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover border border-border shrink-0 mt-1"
                      />
                    )}
                    <span className="ml-auto flex items-center gap-3 shrink-0">
                      {trade.result && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${resultStyles[trade.result] || ''}`}>{trade.result === 'BREAK_EVEN' ? 'BE' : trade.result}</span>
                      )}
                      <span className={`text-sm font-semibold tabular-nums ${tradePnl != null ? (tradePnl >= 0 ? 'text-success' : 'text-danger') : 'text-text-muted'}`}>
                        {tradePnl != null ? (tradePnl >= 0 ? '+' : '') + tradePnl.toFixed(2) : '--'}
                      </span>
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
            <span className="text-xs text-text-muted uppercase tracking-widest">Daily result</span>
            <span className={`text-sm font-bold ${dayPnl >= 0 ? 'text-success' : 'text-danger'}`}>{dayPnl >= 0 ? '+' : ''}{dayPnl.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function openDayTime(entryTime: string): string {
  return new Date(entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}