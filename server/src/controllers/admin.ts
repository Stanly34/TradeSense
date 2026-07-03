import { Request, Response } from 'express'
import * as adminService from '../services/admin.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function getStats(req: Request, res: Response) {
  try {
    const stats = await adminService.getDashboardStats()
    return sendSuccess(res, stats)
  } catch {
    return sendError(res, 'Failed to get stats', 500)
  }
}

export async function listUsers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const result = await adminService.listUsers(page, limit)
    return sendSuccess(res, result)
  } catch {
    return sendError(res, 'Failed to list users', 500)
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const user = await adminService.updateUser(req.params.id, req.body)
    return sendSuccess(res, user, 'User updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update user', 400)
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    await adminService.deleteUser(req.params.id)
    return sendSuccess(res, null, 'User deactivated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to deactivate user', 400)
  }
}

export async function listPlans(req: Request, res: Response) {
  try {
    const plans = await adminService.listPlans()
    return sendSuccess(res, plans)
  } catch {
    return sendError(res, 'Failed to list plans', 500)
  }
}

export async function createPlan(req: Request, res: Response) {
  try {
    const plan = await adminService.createPlan(req.body)
    return sendSuccess(res, plan, 'Plan created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create plan', 400)
  }
}

export async function updatePlan(req: Request, res: Response) {
  try {
    const plan = await adminService.updatePlan(req.params.id, req.body)
    return sendSuccess(res, plan, 'Plan updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update plan', 400)
  }
}

export async function deletePlan(req: Request, res: Response) {
  try {
    await adminService.deletePlan(req.params.id)
    return sendSuccess(res, null, 'Plan deactivated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to deactivate plan', 400)
  }
}

export async function listSubscriptions(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const result = await adminService.listSubscriptions(page, limit)
    return sendSuccess(res, result)
  } catch {
    return sendError(res, 'Failed to list subscriptions', 500)
  }
}
