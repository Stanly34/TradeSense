import { Request, Response } from 'express'
import * as adminService from '../services/admin.js'
import * as couponService from '../services/coupon.js'
import * as platformService from '../services/platform.js'
import * as auditLogService from '../services/auditLog.js'
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
    const { role } = req.body
    if (req.user?.role === 'MANAGER' && role === 'ADMIN') {
      return sendError(res, 'Only admins can assign the ADMIN role', 403)
    }
    const user = await adminService.updateUser(req.params.id, req.body, req.user?.userId ?? '')
    return sendSuccess(res, user, 'User updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update user', 400)
  }
}

export async function changeUserPlan(req: Request, res: Response) {
  try {
    const { planId } = req.body
    if (!planId) return sendError(res, 'planId is required', 400)
    const result = await adminService.changeUserPlan(req.params.id, planId, req.user?.userId ?? '')
    return sendSuccess(res, result, 'Plan changed')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to change plan', 400)
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
    const plan = await adminService.createPlan(req.body, req.user?.userId ?? '')
    return sendSuccess(res, plan, 'Plan created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create plan', 400)
  }
}

export async function updatePlan(req: Request, res: Response) {
  try {
    const plan = await adminService.updatePlan(req.params.id, req.body, req.user?.userId ?? '')
    return sendSuccess(res, plan, 'Plan updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update plan', 400)
  }
}

export async function deletePlan(req: Request, res: Response) {
  try {
    await adminService.deletePlan(req.params.id, req.user?.userId ?? '')
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

export async function createSubscription(req: Request, res: Response) {
  try {
    const { userId, planId } = req.body
    if (!userId || !planId) return sendError(res, 'userId and planId are required', 400)
    const sub = await adminService.createSubscription(userId, planId)
    return sendSuccess(res, sub, 'Subscription created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create subscription', 400)
  }
}

export async function updateSubscription(req: Request, res: Response) {
  try {
    const sub = await adminService.updateSubscription(req.params.id, req.body)
    return sendSuccess(res, sub, 'Subscription updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update subscription', 400)
  }
}

export async function listSettings(_req: Request, res: Response) {
  try {
    const settings = await adminService.listSettings()
    return sendSuccess(res, settings)
  } catch {
    return sendError(res, 'Failed to list settings', 500)
  }
}

export async function updateSetting(req: Request, res: Response) {
  try {
    const { key, value } = req.body
    if (!key || value === undefined) return sendError(res, 'key and value are required', 400)
    await adminService.updateSetting(key, String(value))
    return sendSuccess(res, null, 'Setting updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update setting', 400)
  }
}

export async function listAllTrades(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const result = await adminService.listAllTrades(page, limit, req.query as Record<string, string>)
    return sendSuccess(res, result)
  } catch {
    return sendError(res, 'Failed to list trades', 500)
  }
}

export async function listAllJournals(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const result = await adminService.listAllJournals(page, limit, req.query as Record<string, string>)
    return sendSuccess(res, result)
  } catch {
    return sendError(res, 'Failed to list journals', 500)
  }
}

export async function listCoupons(_req: Request, res: Response) {
  try {
    const coupons = await couponService.listCoupons()
    return sendSuccess(res, coupons)
  } catch {
    return sendError(res, 'Failed to list coupons', 500)
  }
}

export async function createCoupon(req: Request, res: Response) {
  try {
    const coupon = await couponService.createCoupon(req.body)
    await auditLogService.logAction(req.user?.userId ?? '', 'COUPON_CREATED', 'COUPON', coupon.id, { code: coupon.code })
    return sendSuccess(res, coupon, 'Coupon created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create coupon', 400)
  }
}

export async function updateCoupon(req: Request, res: Response) {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body)
    await auditLogService.logAction(req.user?.userId ?? '', 'COUPON_EDITED', 'COUPON', coupon.id)
    return sendSuccess(res, coupon, 'Coupon updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update coupon', 400)
  }
}

export async function deleteCoupon(req: Request, res: Response) {
  try {
    const coupon = await couponService.deleteCoupon(req.params.id)
    await auditLogService.logAction(req.user?.userId ?? '', 'COUPON_DEACTIVATED', 'COUPON', req.params.id)
    return sendSuccess(res, null, 'Coupon deactivated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to deactivate coupon', 400)
  }
}

export async function listPlatforms(_req: Request, res: Response) {
  try {
    const platforms = await platformService.listPlatforms()
    return sendSuccess(res, platforms)
  } catch {
    return sendError(res, 'Failed to list platforms', 500)
  }
}

export async function createPlatform(req: Request, res: Response) {
  try {
    const platform = await platformService.createPlatform(req.body)
    await auditLogService.logAction(req.user?.userId ?? '', 'PLATFORM_CREATED', 'PLATFORM', platform.id, { name: platform.name })
    return sendSuccess(res, platform, 'Platform created', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create platform', 400)
  }
}

export async function updatePlatform(req: Request, res: Response) {
  try {
    const platform = await platformService.updatePlatform(req.params.id, req.body)
    await auditLogService.logAction(req.user?.userId ?? '', 'PLATFORM_EDITED', 'PLATFORM', platform.id)
    return sendSuccess(res, platform, 'Platform updated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to update platform', 400)
  }
}

export async function deletePlatform(req: Request, res: Response) {
  try {
    await platformService.deletePlatform(req.params.id)
    await auditLogService.logAction(req.user?.userId ?? '', 'PLATFORM_DELETED', 'PLATFORM', req.params.id)
    return sendSuccess(res, null, 'Platform deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to deactivate platform', 400)
  }
}

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const result = await auditLogService.listAuditLogs(page, limit, {
      action: req.query.action as string | undefined,
      userId: req.query.userId as string | undefined,
    })
    return sendSuccess(res, result)
  } catch {
    return sendError(res, 'Failed to list audit logs', 500)
  }
}
