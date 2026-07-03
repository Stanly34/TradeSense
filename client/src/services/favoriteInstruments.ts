import api from './api'

export interface FavoriteInstrument {
  id: string
  instrument: string
  createdAt: string
}

export async function listFavoriteInstruments(): Promise<FavoriteInstrument[]> {
  const { data } = await api.get('/favorite-instruments')
  return data.data
}

export async function createFavoriteInstrument(instrument: string): Promise<FavoriteInstrument> {
  const { data } = await api.post('/favorite-instruments', { instrument })
  return data.data
}

export async function deleteFavoriteInstrument(id: string): Promise<void> {
  await api.delete(`/favorite-instruments/${id}`)
}
