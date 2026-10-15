import api from './api'
import { eventBus } from '../lib/eventBus'

export interface Account {
  id: string
  name: string
  description: string | null
  type: 'JOURNAL' | 'PROP_FIRM' | 'PERSONAL_ACCOUNT'
  phase: string
  status: string
  pausedUntil: string | null
  propFirmId: string | null
  defaultValues: Record<string, unknown> | null
  isFavorite: boolean
  createdAt: string
}

export interface DailyDrawdownData {
  date: string
  startBalance: number
  dailyPnL: number
  endBalance: number
  dailyDrawdownBreached: boolean
}

export interface ChallengePhase {
  name: string
  target: number
  status: 'COMPLETED' | 'CURRENT' | 'PENDING'
}

export interface AccountEventItem {
  type: string
  phase: string | null
  title: string
  message: string | null
  balance: number | null
  createdAt: string
}

export interface DaySnapshot {
  day: string
  phase: string
  startBalance: number
  endBalance: number
  pnl: number
  peakBalance: number
  floor: number
  breached: boolean
}

export interface ChallengeProgress {
  tradesCount: number
  totalPnl: number
  peakPnl: number
  maxDrawdown: number
  winningTrades: number
  losingTrades: number
  status: 'ACTIVE' | 'DAILY_PAUSED' | 'PASSED' | 'FAILED' | 'FUNDED'
  phase: string
  planSteps: number
  phaseTargets: number[]
  nextTarget: number | null
  isFunded: boolean
  totalPayouts: number
  dailyData: DailyDrawdownData[]
  manualOverride?: boolean
  drawdownType: 'STATIC' | 'TRAILING' | 'EOD_TRAILING'
  dllBreach: 'PAUSE' | 'FAIL'
  trailingLock: 'START' | 'START_PLUS_100' | 'NONE'
  dailyLossLimit: number
  maxTotalDrawdown: number
  phases: ChallengePhase[]
  phaseIndex: number
  phaseStartBalance: number
  balance: number
  floor: number
  lockAmount: number | null
  dayStartBalance: number
  dailyPnlToday: number
  pausedUntil: string | null
  events: AccountEventItem[]
  snapshots: DaySnapshot[]
}

export interface ChallengeInput {
  marketType?: 'FOREX' | 'FUTURES'
  startingPhase?: string
  phaseTargets?: number[]
  maxTotalDrawdown?: number
  maxDailyDrawdown?: number
  drawdownType?: 'STATIC' | 'TRAILING' | 'EOD_TRAILING'
  dllBreach?: 'PAUSE' | 'FAIL'
  trailingLock?: 'START' | 'START_PLUS_100' | 'NONE'
  fundedPath?: 'flex' | 'daily'
}
export { parseAccountSizeFromName, parsePropRules } from "./parseRules"

export interface FundedVariant {
  id: 'flex' | 'daily'
  label: string
  desc: string
  maxDailyDrawdown: number
}

export function isSelectPlan(planName?: string): boolean {
  return Boolean(planName && /select evaluation/i.test(planName))
}

export function getFundedVariants(accountSize: number): FundedVariant[] {
  const dailyDll = accountSize >= 150000 ? 1750 : accountSize >= 100000 ? 1250 : accountSize >= 50000 ? 1000 : 500
  return [
    { id: 'flex', label: 'Flex — 5-day payouts', desc: 'No daily loss limit at all', maxDailyDrawdown: 0 },
    { id: 'daily', label: 'Daily — payouts every day', desc: `$${dailyDll.toLocaleString()} soft-pause daily loss limit`, maxDailyDrawdown: dailyDll },
  ]
}

export function needsFundedPath(account: { status?: string | null; phase?: string | null; defaultValues?: unknown }, planName?: string): boolean {
  const dv = (account.defaultValues || {}) as Record<string, unknown>
  if (dv.fundedPath) return false
  const funded = (account.status || '').toUpperCase() === 'FUNDED' || (account.phase || '').toUpperCase() === 'FUNDED'
  return funded && isSelectPlan(planName)
}

export async function listAccounts(): Promise<Account[]> {
  const { data } = await api.get('/accounts')
  return data.data
}

export async function createAccount(input: {
  name: string
  description?: string
  type?: Account['type']
  propFirmId?: string
  planName?: string
  sizeName?: string
  startingBalance?: number
  currentBalance?: number
  defaultValues?: Record<string, unknown>
  challenge?: ChallengeInput
}): Promise<Account> {
  const { data } = await api.post('/accounts', input)
  eventBus.emit('accounts:changed', { accountId: data.data.id, action: 'create' })
  return data.data
}

export async function updateAccount(id: string, input: Partial<{
  name: string
  description: string
  startingBalance: number
  currentBalance: number
  propFirmId: string
  planName: string
  sizeName: string
  defaultValues: Record<string, unknown>
  challenge: ChallengeInput
}>): Promise<Account> {
  const { data } = await api.patch(`/accounts/${id}`, input)
  eventBus.emit('accounts:changed', { accountId: id, action: 'update' })
  return data.data
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/accounts/${id}`)
  eventBus.emit('accounts:changed', { accountId: id, action: 'delete' })
}

export async function batchDeleteAccounts(accountIds: string[]): Promise<void> {
  await api.post('/accounts/batch-delete', { accountIds })
  eventBus.emit('accounts:changed', { action: 'delete' })
}

export async function toggleFavorite(id: string): Promise<Account> {
  const { data } = await api.patch(`/accounts/${id}/favorite`)
  eventBus.emit('accounts:changed', { accountId: id, action: 'update' })
  return data.data
}

export async function getAllProgressStatuses(): Promise<Record<string, string>> {
  const { data } = await api.get('/accounts/progress/statuses')
  return data.data
}

export async function getChallengeProgress(id: string): Promise<ChallengeProgress> {
  const { data } = await api.get(`/accounts/${id}/progress`)
  return data.data
}

export async function overrideStatus(id: string, status: 'PASSED' | 'FAILED' | 'FUNDED' | null): Promise<Account> {
  const { data } = await api.patch(`/accounts/${id}/status`, { status })
  eventBus.emit('accounts:changed', { accountId: id, action: 'override' })
  return data.data
}

export async function resetAccount(id: string): Promise<Account> {
  const { data } = await api.post(`/accounts/${id}/reset`)
  eventBus.emit('accounts:changed', { accountId: id, action: 'reset' })
  return data.data
}

export async function addPayout(id: string, input: { amount: number; date?: string }): Promise<Account> {
  const { data } = await api.post(`/accounts/${id}/payouts`, input)
  eventBus.emit('payouts:changed', { accountId: id })
  eventBus.emit('accounts:changed', { accountId: id, action: 'update' })
  eventBus.emit('trades:changed', { accountId: id, action: 'update' })
  return data.data
}

export async function removePayout(id: string, index: number): Promise<Account> {
  const { data } = await api.delete(`/accounts/${id}/payouts/${index}`)
  eventBus.emit('payouts:changed', { accountId: id })
  eventBus.emit('accounts:changed', { accountId: id, action: 'update' })
  eventBus.emit('trades:changed', { accountId: id, action: 'update' })
  return data.data
}
