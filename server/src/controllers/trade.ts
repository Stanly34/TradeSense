import { Request, Response } from 'express'
import * as tradeService from '../services/trade.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function createTrade(req: Request, res: Response) {
  try {
    const trade = await tradeService.createTrade(req.user!.userId, req.body)
    return sendSuccess(res, trade, 'Trade created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create trade', 400)
  }
}

export async function getTrade(req: Request, res: Response) {
  try {
    const trade = await tradeService.getTradeById(req.user!.userId, req.params.id)
    if (!trade) return sendError(res, 'Trade not found', 404)
    return sendSuccess(res, trade)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get trade', 400)
  }
}

export async function listTrades(req: Request, res: Response) {
  try {
    const { page, limit, status, result, direction, instrument, date, templateId, sortBy, sortOrder } = req.query
    const result_ = await tradeService.listTrades(req.user!.userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      result: result as string,
      direction: direction as string,
      instrument: instrument as string,
      date: date as string,
      templateId: templateId as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    })
    return sendSuccess(res, result_)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to list trades', 400)
  }
}

export async function updateTrade(req: Request, res: Response) {
  try {
    const trade = await tradeService.updateTrade(req.user!.userId, req.params.id, req.body)
    return sendSuccess(res, trade, 'Trade updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update trade', 400)
  }
}

export async function deleteTrade(req: Request, res: Response) {
  try {
    await tradeService.deleteTrade(req.user!.userId, req.params.id)
    return sendSuccess(res, null, 'Trade deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete trade', 400)
  }
}

export async function batchDelete(req: Request, res: Response) {
  try {
    const { tradeIds } = req.body
    if (!Array.isArray(tradeIds) || tradeIds.length === 0) {
      return sendError(res, 'tradeIds must be a non-empty array', 400)
    }
    await tradeService.batchDeleteTrades(req.user!.userId, tradeIds)
    return sendSuccess(res, null, `${tradeIds.length} trades deleted`)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete trades', 400)
  }
}

export async function addTags(req: Request, res: Response) {
  try {
    const { tagIds } = req.body
    const trade = await tradeService.addTagsToTrade(req.user!.userId, req.params.id, tagIds)
    return sendSuccess(res, trade, 'Tags added')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to add tags', 400)
  }
}

export async function removeTag(req: Request, res: Response) {
  try {
    const trade = await tradeService.removeTagFromTrade(req.user!.userId, req.params.id, req.params.tagId)
    return sendSuccess(res, trade, 'Tag removed')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to remove tag', 400)
  }
}
