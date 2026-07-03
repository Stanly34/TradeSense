import { Request, Response } from 'express'
import * as favoriteInstrumentService from '../services/favoriteInstrument.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function listFavoriteInstruments(req: Request, res: Response) {
  try {
    const data = await favoriteInstrumentService.listFavoriteInstruments(req.user!.userId)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to list favorite instruments', 500)
  }
}

export async function createFavoriteInstrument(req: Request, res: Response) {
  try {
    const data = await favoriteInstrumentService.createFavoriteInstrument(req.user!.userId, req.body.instrument)
    return sendSuccess(res, data, 'Favorite instrument created', 201)
  } catch {
    return sendError(res, 'Failed to create favorite instrument', 500)
  }
}

export async function deleteFavoriteInstrument(req: Request, res: Response) {
  try {
    await favoriteInstrumentService.deleteFavoriteInstrument(req.user!.userId, req.params.id)
    return sendSuccess(res, null)
  } catch {
    return sendError(res, 'Failed to delete favorite instrument', 500)
  }
}
