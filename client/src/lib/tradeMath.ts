import type { Trade } from '../types/trade'

export function calcTradePnl(trade: Trade): number | null {
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

export function tradeDayKey(entryTime: string | null): string | null {
  if (!entryTime) return null
  const d = new Date(entryTime)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}