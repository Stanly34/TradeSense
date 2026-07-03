import api from './api'

export interface JournalEntry {
  id: string
  tradeId: string
  content: string
  createdAt: string
  updatedAt: string
  trade?: {
    instrument: string
    direction: string
    result: string | null
    createdAt: string
  }
}

export async function listJournals(): Promise<JournalEntry[]> {
  const { data } = await api.get('/journals')
  return data.data
}

export async function getJournal(tradeId: string): Promise<JournalEntry> {
  const { data } = await api.get(`/journals/${tradeId}`)
  return data.data
}

export async function upsertJournal(tradeId: string, content: string): Promise<JournalEntry> {
  const { data } = await api.put(`/journals/${tradeId}`, { content })
  return data.data
}

export async function deleteJournal(tradeId: string): Promise<void> {
  await api.delete(`/journals/${tradeId}`)
}
