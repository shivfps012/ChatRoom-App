import express from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import roomRoutes from './routes/roomRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import { setupWebSocket } from './websocket/handler.js'

const app = express()
const server = http.createServer(app)

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

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
