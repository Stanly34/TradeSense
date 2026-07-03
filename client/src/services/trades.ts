import api from './api'
import type { Trade, TradeFormData, TradeListParams, PaginatedResult } from '../types/trade'

export async function listTrades(params?: TradeListParams): Promise<PaginatedResult<Trade>> {
  const { data } = await api.get('/trades', { params })
  return data.data
}

export async function getTrade(id: string): Promise<Trade> {
  const { data } = await api.get(`/trades/${id}`)
  return data.data
}

export async function createTrade(input: TradeFormData): Promise<Trade> {
  const { data } = await api.post('/trades', input)
  return data.data
}

export async function updateTrade(id: string, input: Partial<TradeFormData>): Promise<Trade> {
  const { data } = await api.patch(`/trades/${id}`, input)
  return data.data
}

export async function deleteTrade(id: string): Promise<void> {
  await api.delete(`/trades/${id}`)
}

export async function batchDeleteTrades(tradeIds: string[]): Promise<void> {
  await api.post('/trades/batch-delete', { tradeIds })
}

export async function addTagsToTrade(tradeId: string, tagIds: string[]): Promise<Trade> {
  const { data } = await api.post(`/trades/${tradeId}/tags`, { tagIds })
  return data.data
}

export async function removeTagFromTrade(tradeId: string, tagId: string): Promise<Trade> {
  const { data } = await api.delete(`/trades/${tradeId}/tags/${tagId}`)
  return data.data
}
