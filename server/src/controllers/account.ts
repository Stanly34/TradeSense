import { Request, Response } from 'express'
import * as accountService from '../services/account.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function createAccount(req: Request, res: Response) {
  try {
    const account = await accountService.createAccount(req.user!.userId, req.body)
    return sendSuccess(res, account, 'Account created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create account', 400)
  }
}

export async function listAccounts(req: Request, res: Response) {
  try {
    const accounts = await accountService.listAccounts(req.user!.userId)
    return sendSuccess(res, accounts)
  } catch {
    return sendError(res, 'Failed to list accounts', 500)
  }
}

export async function getAccount(req: Request, res: Response) {
  try {
    const account = await accountService.getAccount(req.user!.userId, req.params.id)
    return sendSuccess(res, account)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Account not found', 404)
  }
}

export async function updateAccount(req: Request, res: Response) {
  try {
    const account = await accountService.updateAccount(req.user!.userId, req.params.id, req.body)
    return sendSuccess(res, account, 'Account updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update account', 400)
  }
}

export async function deleteAccount(req: Request, res: Response) {
  try {
    await accountService.deleteAccount(req.user!.userId, req.params.id)
    return sendSuccess(res, null, 'Account deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete account', 400)
  }
}

export async function batchDelete(req: Request, res: Response) {
  try {
    const { accountIds } = req.body
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return sendError(res, 'accountIds must be a non-empty array', 400)
    }
    await accountService.batchDeleteAccounts(req.user!.userId, accountIds)
    return sendSuccess(res, null, `${accountIds.length} accounts deleted`)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete accounts', 400)
  }
}

export async function toggleFavorite(req: Request, res: Response) {
  try {
    const account = await accountService.toggleFavorite(req.user!.userId, req.params.id)
    return sendSuccess(res, account, 'Favorite toggled')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to toggle favorite', 400)
  }
}

export async function getAllProgressStatuses(req: Request, res: Response) {
  try {
    const statuses = await accountService.getAllProgressStatuses(req.user!.userId)
    return sendSuccess(res, statuses)
  } catch {
    return sendError(res, 'Failed to get progress statuses', 500)
  }
}

export async function getChallengeProgress(req: Request, res: Response) {
  try {
    const progress = await accountService.getChallengeProgress(req.user!.userId, req.params.id)
    return sendSuccess(res, progress)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get challenge progress', 400)
  }
}

export async function overrideStatus(req: Request, res: Response) {
  try {
    const { status } = req.body
    if (status && status !== 'PASSED' && status !== 'FAILED' && status !== 'FUNDED') {
      return sendError(res, 'Invalid status. Must be PASSED, FAILED, FUNDED, or null to clear', 400)
    }
    const account = await accountService.overrideStatus(req.user!.userId, req.params.id, status || null)
    return sendSuccess(res, account, 'Status updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to override status', 400)
  }
}

export async function resetAccount(req: Request, res: Response) {
  try {
    const account = await accountService.resetAccount(req.user!.userId, req.params.id)
    return sendSuccess(res, account, 'Account reset to Phase 1')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to reset account', 400)
  }
}

export async function addPayout(req: Request, res: Response) {
  try {
    const account = await accountService.addPayout(req.user!.userId, req.params.id, req.body)
    return sendSuccess(res, account, 'Payout added')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to add payout', 400)
  }
}

export async function removePayout(req: Request, res: Response) {
  try {
    const account = await accountService.removePayout(req.user!.userId, req.params.id, parseInt(req.params.idx, 10))
    return sendSuccess(res, account, 'Payout removed')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to remove payout', 400)
  }
}