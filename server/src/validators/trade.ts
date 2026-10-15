import { z } from 'zod'

const baseTradeSchema = z.object({
  instrument: z.string().min(1).max(50),
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().positive().optional(),
  exitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  quantity: z.number().positive().optional(),
  pipSize: z.number().positive().optional(),
  pipValue: z.number().positive().optional(),
  fees: z.number().min(0).optional(),
  broker: z.string().max(100).optional(),
  account: z.string().max(100).optional(),
  session: z.enum(['LONDON', 'NEW_YORK', 'ASIA', 'CUSTOM']).optional(),
  marketBias: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']).optional(),
  entryTime: z.string().datetime(),
  exitTime: z.string().datetime(),
  status: z.enum(['DRAFT', 'COMPLETED', 'ARCHIVED']).optional(),
  result: z.enum(['WIN', 'LOSS', 'BREAK_EVEN', 'CANCELLED']),
  riskReward: z.number().positive().optional(),
  notes: z.string().max(5000).optional(),
  reason: z.string().max(500).optional(),
  mistakes: z.string().max(5000).optional(),
  lesson: z.string().max(5000).optional(),
  emotion: z.string().max(30).optional().nullable(),
  confidence: z.number().int().min(0).max(10).optional().nullable(),
  executionRating: z.number().int().min(0).max(5).optional().nullable(),
  patienceRating: z.number().int().min(0).max(5).optional().nullable(),
  disciplineRating: z.number().int().min(0).max(5).optional().nullable(),
  setup: z.string().max(100).optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  checklistData: z.record(z.array(z.string())).optional(),
  _partialExits: z.array(z.object({
    quantity: z.number().positive(),
    exitPrice: z.number(),
    exitTime: z.string().optional(),
  })).optional(),
})

function timeRefinement(data: Record<string, unknown>) {
  if (!data.entryTime || !data.exitTime) return true
  return new Date(data.exitTime as string) > new Date(data.entryTime as string)
}

export const createTradeSchema = baseTradeSchema.refine(timeRefinement, {
  message: 'Exit time must be later than entry time',
  path: ['exitTime'],
})

export const updateTradeSchema = baseTradeSchema.partial().refine(timeRefinement, {
  message: 'Exit time must be later than entry time',
  path: ['exitTime'],
})

export const createTagSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().max(7).optional(),
  content: z.string().optional(),
})

export const updateTagSchema = createTagSchema.partial()

export const createFavoriteInstrumentSchema = z.object({
  instrument: z.string().min(1).max(50),
})

