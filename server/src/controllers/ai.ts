import { Request, Response } from 'express'
import * as aiService from '../services/ai.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function generateReview(req: Request, res: Response) {
  try {
    const review = await aiService.generateReview(req.params.tradeId, req.user!.userId)
    return sendSuccess(res, review, 'Review generated', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to generate review', 400)
  }
}

export async function getReview(req: Request, res: Response) {
  try {
    const review = await aiService.getReviewForTrade(req.params.tradeId, req.user!.userId)
    if (!review) return sendError(res, 'No review found for this trade', 404)
    return sendSuccess(res, review)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get review', 400)
  }
}

export async function createChat(req: Request, res: Response) {
  try {
    const { title } = req.body
    const chat = await aiService.createChat(req.user!.userId, title)
    return sendSuccess(res, chat, 'Chat created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create chat', 400)
  }
}

export async function listChats(req: Request, res: Response) {
  try {
    const chats = await aiService.listChats(req.user!.userId)
    return sendSuccess(res, chats)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to list chats', 400)
  }
}

export async function getChat(req: Request, res: Response) {
  try {
    const chat = await aiService.getChat(req.params.id, req.user!.userId)
    return sendSuccess(res, chat)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get chat', 404)
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const { content } = req.body
    if (!content?.trim()) return sendError(res, 'Message content is required', 400)
    const result = await aiService.sendMessage(req.params.id, req.user!.userId, content)
    return sendSuccess(res, result, 'Message sent', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to send message', 400)
  }
}

export async function deleteChat(req: Request, res: Response) {
  try {
    await aiService.deleteChat(req.params.id, req.user!.userId)
    return sendSuccess(res, null, 'Chat deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete chat', 400)
  }
}

export async function togglePinChat(req: Request, res: Response) {
  try {
    const chat = await aiService.togglePinChat(req.params.id, req.user!.userId)
    return sendSuccess(res, chat, 'Chat pin toggled')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to toggle pin', 400)
  }
}

export async function archiveChat(req: Request, res: Response) {
  try {
    const chat = await aiService.archiveChat(req.params.id, req.user!.userId)
    return sendSuccess(res, chat, 'Chat archived')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to archive chat', 400)
  }
}
