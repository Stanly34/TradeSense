import { Request, Response } from 'express'
import * as dashboardService from '../services/dashboard.js'
import { sendSuccess, sendError } from '../utils/response.js'

function getFilters(req: Request) {
  const templateId = req.query.templateId as string | undefined
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
  return { templateId, startDate, endDate }
}

export async function getStats(req: Request, res: Response) {
  try {
    const { templateId, startDate, endDate } = getFilters(req)
    const stats = await dashboardService.getStats(req.user!.userId, templateId, startDate, endDate)
    return sendSuccess(res, stats)
  } catch (err) {
    return sendError(res, 'Failed to get stats', 500)
  }
}

export async function getMonthlyPerformance(req: Request, res: Response) {
  try {
    const { templateId, startDate, endDate } = getFilters(req)
    const data = await dashboardService.getMonthlyPerformance(req.user!.userId, templateId, startDate, endDate)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get performance data', 500)
  }
}

export async function getResultDistribution(req: Request, res: Response) {
  try {
    const { templateId, startDate, endDate } = getFilters(req)
    const data = await dashboardService.getResultDistribution(req.user!.userId, templateId, startDate, endDate)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get distribution', 500)
  }
}

export async function getRecentTrades(req: Request, res: Response) {
  try {
    const { templateId, startDate, endDate } = getFilters(req)
    const trades = await dashboardService.getRecentTrades(req.user!.userId, templateId, 10, startDate, endDate)
    return sendSuccess(res, trades)
  } catch {
    return sendError(res, 'Failed to get recent trades', 500)
  }
}

export async function getCalendarData(req: Request, res: Response) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear()
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1
    const { templateId, startDate, endDate } = getFilters(req)
    const data = await dashboardService.getCalendarData(req.user!.userId, year, month, templateId, startDate, endDate)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get calendar data', 500)
  }
}

export async function getInstrumentPerformance(req: Request, res: Response) {
  try {
    const { templateId, startDate, endDate } = getFilters(req)
    const data = await dashboardService.getInstrumentPerformance(req.user!.userId, templateId, startDate, endDate)
    return sendSuccess(res, data)
  } catch {
    return sendError(res, 'Failed to get instrument performance', 500)
  }
}
