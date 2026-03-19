import User from '../models/User.js'
import { generateToken } from '../utils/jwt.js'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

// POST /api/auth/signup
export async function signup(req, res) {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username'
      return res.status(409).json({ message: `${field} is already taken.` })
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
    res.status(500).json({ message: 'Signup failed.', error: err.message })
  }
}

// POST /api/auth/login
export async function login(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = generateToken(user._id)
    res.cookie('token', token, COOKIE_OPTIONS)
    res.status(200).json({
      message: 'Logged in successfully.',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    })
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message })
  }
}

// GET /api/auth/me
export async function getMe(req, res) {
  res.status(200).json({
    user: { id: req.user._id, username: req.user.username, email: req.user.email },
  })
}

// POST /api/auth/logout
export async function logout(req, res) {
  res.clearCookie('token', COOKIE_OPTIONS)
  res.status(200).json({ message: 'Logged out successfully.' })
}
