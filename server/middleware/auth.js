import { verifyToken } from '../utils/jwt.js'
import User from '../models/User.js'

export async function protect(req, res, next) {
  try {
    // Support token from Authorization header or cookie
    let token = null

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies?.token) {
      token = req.cookies.token
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' })
    }

    const decoded = verifyToken(token)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}
