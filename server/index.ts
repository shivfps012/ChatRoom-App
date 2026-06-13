import express, { Express } from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config()

import { connectDB } from './config/db.js'
import { globalLimiter } from './config/rateLimiter.js'
import authRoutes from './routes/authRoutes.js'
import roomRoutes from './routes/roomRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import { setupWebSocket } from './websocket/handler.js'
import { closeRedis } from './config/redis.js'
import { closeRateLimitRedis } from './config/redisRateLimitStore.js'

const app: Express = express()
const server = http.createServer(app)

// Trust proxy - important for rate limiting to work correctly
app.set('trust proxy', 1)

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(globalLimiter) // Apply global rate limiter

// ─── REST Routes ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/upload', uploadRoutes)

// ─── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server })
setupWebSocket(wss)

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🔌 WebSocket ready`)
  })
})

async function shutdown(): Promise<void> {
  await Promise.all([closeRedis(), closeRateLimitRedis()])
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})
