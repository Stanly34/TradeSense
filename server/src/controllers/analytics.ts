import { Request, Response } from 'express'
import * as analyticsService from '../services/analytics.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function getMonthSummary(req: Request, res: Response) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear()
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1
    const templateId = req.query.templateId as string | undefined
    const data = await analyticsService.getMonthSummary(req.user!.userId, year, month, templateId)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get month summary', 500)
  }
}

export async function getTimeline(req: Request, res: Response) {
  try {
    const interval = (req.query.interval as string) || 'monthly'
    const templateId = req.query.templateId as string | undefined
    const data = await analyticsService.getTimeline(req.user!.userId, interval, templateId)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get timeline', 500)
  }
}

export async function getDistributions(req: Request, res: Response) {
  try {
    const templateId = req.query.templateId as string | undefined
    const data = await analyticsService.getDistributions(req.user!.userId, templateId)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get distributions', 500)
  }
}

export async function getTiming(req: Request, res: Response) {
  try {
    const templateId = req.query.templateId as string | undefined
    const data = await analyticsService.getTiming(req.user!.userId, templateId)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get timing', 500)
  }
}

export async function getBehavior(req: Request, res: Response) {
  try {
    const templateId = req.query.templateId as string | undefined
    const data = await analyticsService.getBehavior(req.user!.userId, templateId)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get behavior stats', 500)
  }
}

export async function getTrends(req: Request, res: Response) {
  try {
    const templateId = req.query.templateId as string | undefined
    const data = await analyticsService.getTrends(req.user!.userId, templateId)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get trends', 500)
  }
}