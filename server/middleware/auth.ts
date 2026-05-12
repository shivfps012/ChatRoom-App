import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import User, { IUser } from '../models/User.js'

export interface AuthRequest extends Request {
  user?: IUser
}

export async function protect(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | null = null

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies?.token) {
      token = req.cookies.token
    }

    if (!token) {
      res.status(401).json({ message: 'Not authenticated. Please log in.' })
      return
    }

    const decoded = verifyToken(token)
    const user = await User.findById(decoded.userId)

    if (!user) {
      res.status(401).json({ message: 'User no longer exists.' })
      return
    }

    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}
