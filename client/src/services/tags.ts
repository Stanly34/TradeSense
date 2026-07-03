import api from './api'
import type { Tag } from '../types/trade'

export async function listTags(): Promise<Tag[]> {
  const { data } = await api.get('/tags')
  return data.data
}

export async function createTag(input: { name: string; color?: string; content?: string }): Promise<Tag> {
  const { data } = await api.post('/tags', input)
  return data.data
}

export async function updateTag(id: string, input: { name?: string; color?: string; content?: string }): Promise<Tag> {
  const { data } = await api.patch(`/tags/${id}`, input)
  return data.data
}

export async function deleteTag(id: string): Promise<void> {
  await api.delete(`/tags/${id}`)
}

export async function batchDeleteTags(ids: string[]): Promise<void> {
  await api.post('/tags/batch-delete', { ids })
}
