import { Response } from 'express'
import crypto from 'crypto'
import User from '../models/User.js'
import { generateToken } from '../utils/jwt.js'
import { AuthRequest } from '../middleware/auth.js'

interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: boolean | 'lax' | 'strict' | 'none'
  maxAge: number
}

interface CookieClearOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: boolean | 'lax' | 'strict' | 'none'
}

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

const COOKIE_CLEAR_OPTIONS: CookieClearOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
}

export async function signup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body
    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] })
    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? 'Email' : 'Username'
      res.status(409).json({ message: `${field} is already taken.` })
      return
    }

    const user = await User.create({ username, email: normalizedEmail, password })
    const token = generateToken(user._id)

    res.cookie('token', token, COOKIE_OPTIONS)
    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ message: 'Signup failed.', error: error.message })
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body
    const normalizedEmail = email.trim().toLowerCase()

    const user = await User.findOne({ email: normalizedEmail }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      const remainingAttempts = (req as AuthRequest & { rateLimit?: { remaining?: number } }).rateLimit?.remaining
      res.status(401).json({
        message: 'Invalid email or password.',
        remainingAttempts,
      })
      return
    }

    const token = generateToken(user._id)
    res.cookie('token', token, COOKIE_OPTIONS)
    res.status(200).json({
      message: 'Logged in successfully.',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ message: 'Login failed.', error: error.message })
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  res.status(200).json({
    user: { id: req.user?._id, username: req.user?.username, email: req.user?.email },
  })
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  res.clearCookie('token', COOKIE_CLEAR_OPTIONS)
  res.status(200).json({ message: 'Logged out successfully.' })
}

export async function forgotPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email: string }
    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      res.status(404).json({ message: 'No account found for that email.' })
      return
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

    user.resetPasswordToken = resetTokenHash
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()

    console.log(`[PasswordReset] email=${normalizedEmail} token=${resetToken}`)

    res.status(200).json({
      message: 'Reset token generated. Use it to set a new password.',
      resetToken,
    })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ message: 'Could not generate reset token.', error: error.message })
  }
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, token, newPassword } = req.body as {
      email: string
      token: string
      newPassword: string
    }
    const normalizedEmail = email.trim().toLowerCase()

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token.' })
      return
    }

    user.password = newPassword
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    res.status(200).json({ message: 'Password reset successfully.' })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ message: 'Could not reset password.', error: error.message })
  }
}
