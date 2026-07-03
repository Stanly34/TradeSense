import { Response } from 'express'

export function sendSuccess(res: Response, data: unknown, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  })
}

export function sendError(res: Response, message: string, statusCode = 400, errors?: unknown) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      message,
      details: errors || undefined,
    },
    timestamp: new Date().toISOString(),
  })
}
