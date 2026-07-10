import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifyAccessToken } from '../utils/tokens.js'
import { sendError } from '../utils/response.js'

export async function maintenanceCheck(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith('/api/v1/auth') || req.path.startsWith('/api/health')) {
    return next()
  }
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'maintenance_mode' } })
    if (setting?.value === 'true') {
      const header = req.headers.authorization
      if (header?.startsWith('Bearer ')) {
        try {
          const decoded = verifyAccessToken(header.split(' ')[1])
          if (decoded.role === 'ADMIN') return next()
        } catch {}
      }
      return sendError(res, 'Platform is under maintenance. Please check back later.', 503)
    }
  } catch {}
  next()
}