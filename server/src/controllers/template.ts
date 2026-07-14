import { Request, Response } from 'express'
import * as templateService from '../services/template.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { updateEodPeak } from '../services/template.js'

export async function createTemplate(req: Request, res: Response) {
  try {
    const template = await templateService.createTemplate(req.user!.userId, req.body)
    return sendSuccess(res, template, 'Template created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create template', 400)
  }
}

export async function listTemplates(req: Request, res: Response) {
  try {
    const templates = await templateService.listTemplates(req.user!.userId)
    return sendSuccess(res, templates)
  } catch {
    return sendError(res, 'Failed to list templates', 500)
  }
}

export async function getTemplate(req: Request, res: Response) {
  try {
    const template = await templateService.getTemplate(req.user!.userId, req.params.id)
    return sendSuccess(res, template)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Template not found', 404)
  }
}

export async function updateTemplate(req: Request, res: Response) {
  try {
    const template = await templateService.updateTemplate(req.user!.userId, req.params.id, req.body)
    return sendSuccess(res, template, 'Template updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update template', 400)
  }
}

export async function deleteTemplate(req: Request, res: Response) {
  try {
    await templateService.deleteTemplate(req.user!.userId, req.params.id)
    return sendSuccess(res, null, 'Template deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete template', 400)
  }
}

export async function batchDelete(req: Request, res: Response) {
  try {
    const { templateIds } = req.body
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return sendError(res, 'templateIds must be a non-empty array', 400)
    }
    await templateService.batchDeleteTemplates(req.user!.userId, templateIds)
    return sendSuccess(res, null, `${templateIds.length} accounts deleted`)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete accounts', 400)
  }
}

export async function toggleFavorite(req: Request, res: Response) {
  try {
    const template = await templateService.toggleFavorite(req.user!.userId, req.params.id)
    return sendSuccess(res, template, 'Favorite toggled')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to toggle favorite', 400)
  }
}

export async function getAllProgressStatuses(req: Request, res: Response) {
  try {
    const statuses = await templateService.getAllProgressStatuses(req.user!.userId)
    return sendSuccess(res, statuses)
  } catch {
    return sendError(res, 'Failed to get progress statuses', 500)
  }
}

export async function getChallengeProgress(req: Request, res: Response) {
  try {
    await updateEodPeak(req.user!.userId, req.params.id)
    const progress = await templateService.getChallengeProgress(req.user!.userId, req.params.id)
    return sendSuccess(res, progress)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get challenge progress', 400)
  }
}

export async function overrideStatus(req: Request, res: Response) {
  try {
    const { status } = req.body
    if (status && status !== 'PASSED' && status !== 'FAILED') {
      return sendError(res, 'Invalid status. Must be PASSED, FAILED, or null to clear', 400)
    }
    const template = await templateService.overrideStatus(req.user!.userId, req.params.id, status || null)
    return sendSuccess(res, template, 'Status updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to override status', 400)
  }
}
