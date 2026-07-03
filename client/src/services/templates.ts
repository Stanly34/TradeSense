import api from './api'

export interface Template {
  id: string
  name: string
  description: string | null
  type: 'JOURNAL' | 'PROP_FIRM' | 'PERSONAL_ACCOUNT'
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

export interface ChallengeProgress {
  tradesCount: number
  totalPnl: number
  peakPnl: number
  maxDrawdown: number
  winningTrades: number
  losingTrades: number
  status: 'ACTIVE' | 'PASSED' | 'FAILED'
  dailyData: DailyDrawdownData[]
  manualOverride?: boolean
}

export async function listTemplates(): Promise<Template[]> {
  const { data } = await api.get('/templates')
  return data.data
}

export async function createTemplate(input: { name: string; description?: string; defaultValues?: Record<string, unknown> }): Promise<Template> {
  const { data } = await api.post('/templates', input)
  return data.data
}

export async function updateTemplate(id: string, input: Partial<{ name: string; description: string; isFavorite: boolean }>): Promise<Template> {
  const { data } = await api.patch(`/templates/${id}`, input)
  return data.data
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`)
}

export async function batchDeleteTemplates(templateIds: string[]): Promise<void> {
  await api.post('/templates/batch-delete', { templateIds })
}

export async function toggleFavorite(id: string): Promise<Template> {
  const { data } = await api.patch(`/templates/${id}/favorite`)
  return data.data
}

export async function getAllProgressStatuses(): Promise<Record<string, 'ACTIVE' | 'PASSED' | 'FAILED'>> {
  const { data } = await api.get('/templates/progress/statuses')
  return data.data
}

export async function getChallengeProgress(id: string): Promise<ChallengeProgress> {
  const { data } = await api.get(`/templates/${id}/progress`)
  return data.data
}

export async function overrideStatus(id: string, status: 'PASSED' | 'FAILED' | null): Promise<Template> {
  const { data } = await api.patch(`/templates/${id}/status`, { status })
  return data.data
}
