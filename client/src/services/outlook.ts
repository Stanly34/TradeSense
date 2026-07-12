import { getAccessToken } from './api'

const BASE = '/api/v1/outlook'

export interface WeeklyOutlook {
  id: string
  weekStart: string
  instrument: string
  direction: string | null
  beforeImage: string | null
  afterImage: string | null
  notes: string | null
}

export async function listOutlooks(): Promise<WeeklyOutlook[]> {
  const token = getAccessToken()
  const res = await fetch(`${BASE}/list`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || json.message || 'Failed to list outlooks')
  return json.data
}

export async function getOutlook(weekStart: string, instrument: string): Promise<WeeklyOutlook> {
  const token = getAccessToken()
  const res = await fetch(`${BASE}?week=${weekStart}&instrument=${encodeURIComponent(instrument)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || json.message || 'Failed to get outlook')
  return json.data
}

export async function saveOutlook(weekStart: string, instrument: string, formData: FormData): Promise<void> {
  const token = getAccessToken()
  formData.append('week', weekStart)
  formData.append('instrument', instrument)
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || json.message || 'Failed to save outlook')
}

export async function deleteOutlook(id: string): Promise<void> {
  const token = getAccessToken()
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || json.message || 'Failed to delete outlook')
}

export async function batchDeleteOutlooks(ids: string[]): Promise<void> {
  const token = getAccessToken()
  const res = await fetch(`${BASE}/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ids }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || json.message || 'Failed to delete outlooks')
}
