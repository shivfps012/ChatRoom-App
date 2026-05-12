import jwt, { SignOptions } from 'jsonwebtoken'
import { Types } from 'mongoose'

export interface TokenPayload {
  userId: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export function generateToken(userId: string | Types.ObjectId): string {
  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  }
  return jwt.sign({ userId: userId.toString() }, JWT_SECRET, signOptions)
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}
