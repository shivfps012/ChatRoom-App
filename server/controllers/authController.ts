import { Response } from 'express'
import User from '../models/User.js'
import { generateToken } from '../utils/jwt.js'
import { AuthRequest } from '../middleware/auth.js'

interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: boolean | 'lax' | 'strict' | 'none'
  maxAge: number
}

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

export async function signup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body as {
      username: string
      email: string
      password: string
    }

    if (!username || !email || !password) {
      res.status(400).json({ message: 'All fields are required.' })
      return
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username'
      res.status(409).json({ message: `${field} is already taken.` })
      return
    }

    const user = await User.create({ username, email, password })
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
    const { email, password } = req.body as {
      email: string
      password: string
    }

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' })
      return
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid email or password.' })
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
  res.clearCookie('token', COOKIE_OPTIONS)
  res.status(200).json({ message: 'Logged out successfully.' })
}
