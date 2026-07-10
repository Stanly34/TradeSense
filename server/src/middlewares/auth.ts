import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, TokenPayload } from '../utils/tokens.js'
import { prisma } from '../lib/prisma.js'
import { sendError } from '../utils/response.js'

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required', 401)
  }

  const token = header.split(' ')[1]
  try {
    const decoded = verifyAccessToken(token)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { isActive: true } })
    if (!user || !user.isActive) {
      return sendError(res, 'Account is suspended', 403)
    }
    req.user = decoded
    next()
  } catch {
    return sendError(res, 'Invalid or expired token', 401)
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401)
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Insufficient permissions', 403)
    }
    next()
  }
}
