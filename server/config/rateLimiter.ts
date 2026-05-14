import rateLimit from 'express-rate-limit'
import fs from 'fs'
import path from 'path'

// Ensure logs directory exists and prepare log file
const logsDir = path.join(process.cwd(), 'logs')
try {
  fs.mkdirSync(logsDir, { recursive: true })
} catch (e) {
  // ignore
}
const rateLogPath = path.join(logsDir, 'rate-limit.log')

function appendRateLog(line: string) {
  const ts = new Date().toISOString()
  try {
    fs.appendFileSync(rateLogPath, `${ts} ${line}\n`)
  } catch (e) {
    // fallback to console if file write fails
    console.error('Failed to write rate log', e)
  }
}

// Global rate limiter - 10 requests per 5 minutes (temporary test setting)
export const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/health' ||
    req.path === '/api/auth/logout',
  handler: (req, res) => {
    console.warn(
      `[RateLimit] Global limit hit - ip=${req.ip} path=${req.method} ${req.path}`
    )
    appendRateLog(`[Global] limit hit - ip=${req.ip} method=${req.method} path=${req.path}`)
    res.status(429).json({ message: 'Too many requests from this IP, please try again later.' })
  },
})

// Strict limiter for auth routes - 5 requests per 5 minutes
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    console.warn(
      `[RateLimit] Auth limit hit - ip=${req.ip} path=${req.method} ${req.path}`
    )
    appendRateLog(`[Auth] limit hit - ip=${req.ip} method=${req.method} path=${req.path}`)
    res.status(429).json({ message: 'Too many login attempts, please try again later.' })
  },
})
