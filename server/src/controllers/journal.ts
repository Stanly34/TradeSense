import { Request, Response } from 'express'
import * as journalService from '../services/journal.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function upsertJournal(req: Request, res: Response) {
  try {
    const { content } = req.body
    if (!content?.trim()) return sendError(res, 'Content is required', 400)
    const journal = await journalService.createOrUpdateJournal(req.params.tradeId, req.user!.userId, content)
    return sendSuccess(res, journal, 'Journal saved')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to save journal', 400)
  }
}

export async function getJournal(req: Request, res: Response) {
  try {
    const journal = await journalService.getJournalForTrade(req.params.tradeId, req.user!.userId)
    if (!journal) return sendError(res, 'No journal entry found', 404)
    return sendSuccess(res, journal)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get journal', 400)
  }
}

export async function listJournals(req: Request, res: Response) {
  try {
    const journals = await journalService.listJournals(req.user!.userId)
    return sendSuccess(res, journals)
  } catch {
    return sendError(res, 'Failed to list journals', 500)
  }
}

export async function deleteJournal(req: Request, res: Response) {
  try {
    await journalService.deleteJournal(req.params.tradeId, req.user!.userId)
    return sendSuccess(res, null, 'Journal deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete journal', 400)
  }
}
