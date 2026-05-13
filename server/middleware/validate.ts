import { Request, Response, NextFunction } from 'express'
import { ZodType, ZodError } from 'zod'

export const validateBody = (schema: ZodType<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: (result.error as ZodError).issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }
    req.body = result.data
    next()
  }

export const validateParams = (schema: ZodType<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: (result.error as ZodError).issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }
    req.params = result.data as any
    next()
  }

export const validateQuery = (schema: ZodType<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: (result.error as ZodError).issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }
    req.query = result.data as any
    next()
  }
