export interface Trade {
  id: string
  userId: string
  instrument: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number | null
  exitPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  quantity: number | null
  pipSize: number | null
  pipValue: number | null
  fees: number | null
  broker: string | null
  account: string | null
  session: 'LONDON' | 'NEW_YORK' | 'ASIA' | 'CUSTOM' | null
  marketBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null
  entryTime: string | null
  exitTime: string | null
  status: 'DRAFT' | 'COMPLETED' | 'ARCHIVED'
  result: 'WIN' | 'LOSS' | 'BREAK_EVEN' | 'CANCELLED' | null
  riskReward: number | null
  notes: string | null
  reason: string | null
  mistakes: string | null
  templateId: string | null
  checklistData: Record<string, string[]> | null
  template: { id: string; name: string; type: string; defaultValues: Record<string, unknown> | null } | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  images: TradeImage[]
  partialExits: PartialExit[]
  timeline: TradeTimeline[]
  tags: { tag: Tag }[]
}

export interface PartialExit {
  id: string
  tradeId: string
  quantity: number
  exitPrice: number
  exitTime: string | null
}

export interface TradeImage {
  id: string
  tradeId: string
  imageUrl: string
  category: string
  description: string | null
  width: number | null
  height: number | null
  createdAt: string
}

export interface TradeTimeline {
  id: string
  tradeId: string
  eventType: string
  title: string
  description: string | null
  eventTime: string
}

export interface Tag {
  id: string
  userId: string
  name: string
  color: string | null
  content: string | null
  createdAt: string
  _count?: { trades: number }
}

export interface JournalEntry {
  id: string
  tradeId: string
  content: string
  createdAt: string
}

export interface TradeFormData {
  instrument: string
  direction: 'LONG' | 'SHORT'
  entryPrice?: number
  exitPrice?: number
  stopLoss?: number
  takeProfit?: number
  quantity?: number
  pipSize?: number
  pipValue?: number
  fees?: number
  broker?: string
  account?: string
  session?: 'LONDON' | 'NEW_YORK' | 'ASIA' | 'CUSTOM'
  marketBias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  entryTime?: string
  exitTime?: string
  status?: 'DRAFT' | 'COMPLETED' | 'ARCHIVED'
  result?: 'WIN' | 'LOSS' | 'BREAK_EVEN' | 'CANCELLED'
  riskReward?: number
  notes?: string
  reason?: string
  mistakes?: string
  templateId?: string
  checklistData?: Record<string, string[]>
  _pendingImages?: File[]
  _partialExits?: Array<{ quantity: number; exitPrice: number; exitTime?: string }>
}

export interface TradeListParams {
  page?: number
  limit?: number
  status?: string
  result?: string
  direction?: string
  instrument?: string
  date?: string
  templateId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  trades: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
