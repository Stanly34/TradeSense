import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { sendError } from './response.js'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return sendError(res, 'Validation failed', 422, errors)
    }
    req.body = result.data
    next()
  }
}
