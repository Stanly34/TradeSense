import { Request, Response } from 'express'
import * as tagService from '../services/tag.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function createTag(req: Request, res: Response) {
  try {
    const tag = await tagService.createTag(req.user!.userId, req.body)
    return sendSuccess(res, tag, 'Tag created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create tag', 400)
  }
}

export async function listTags(req: Request, res: Response) {
  try {
    const tags = await tagService.listTags(req.user!.userId)
    return sendSuccess(res, tags)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to list tags', 400)
  }
}

export async function updateTag(req: Request, res: Response) {
  try {
    const tag = await tagService.updateTag(req.user!.userId, req.params.id, req.body)
    return sendSuccess(res, tag, 'Tag updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update tag', 400)
  }
}

export async function deleteTag(req: Request, res: Response) {
  try {
    await tagService.deleteTag(req.user!.userId, req.params.id)
    return sendSuccess(res, null, 'Tag deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete tag', 400)
  }
}

export async function batchDeleteTags(req: Request, res: Response) {
  try {
    const { ids } = req.body as { ids: string[] }
    await tagService.batchDeleteTags(req.user!.userId, ids)
    return sendSuccess(res, null, `${ids.length} tags deleted`)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete tags', 400)
  }
}
