/**
 * WebSocket Handler
 * Manages connections, rooms, messaging, and typing indicators.
 * Saves every chat message to MongoDB.
 *
 * Event types received from client:
 *   join   — user joins a room
 *   chat   — user sends a text/image message
 *   leave  — user leaves a room
 *   typing — user is typing
 *
 * Event types sent to clients:
 *   session  — confirms sessionId to the connecting client
 *   join     — broadcast when a user joins
 *   leave    — broadcast when a user leaves
 *   chat     — broadcast a new message
 *   history  — sends paginated message history on join
 *   typing   — broadcast typing indicator to room
 *   error    — error payload
 */

import { WebSocket, WebSocketServer } from 'ws'
import { verifyToken } from '../utils/jwt.js'
import Message from '../models/Message.js'
import Room from '../models/Room.js'
import User from '../models/User.js'
import { v4 as uuidv4 } from 'uuid'

interface Client {
  socket: WebSocket
  socketId: string
  sessionId: string
  userId: string | null
  username: string | null
  roomId: string | null
}

interface ChatMessage {
  type: 'join' | 'chat' | 'leave' | 'typing' | 'session' | 'history' | 'error'
  payload?: Record<string, any>
}

// In-memory maps
const clients = new Map<string, Client>()
const rooms = new Map<string, Set<string>>()
const roomMembers = new Map<string, Set<string>>()

function getRoomClients(roomId: string): Set<string> {
  return rooms.get(roomId) || new Set()
}

function broadcast(
  roomId: string,
  payload: Record<string, any>,
  excludeSocketId: string | null = null
): void {
  const roomClients = getRoomClients(roomId)
  const data = JSON.stringify(payload)
  for (const socketId of roomClients) {
    const client = clients.get(socketId)
    if (client && client.socket.readyState === 1 && socketId !== excludeSocketId) {
      client.socket.send(data)
    }
  }
}

function broadcastAll(roomId: string, payload: Record<string, any>): void {
  broadcast(roomId, payload, null)
}

function getRoomUserCount(roomId: string): number {
  return (roomMembers.get(roomId) || new Set()).size
}

function safeSend(socket: WebSocket, payload: Record<string, any>): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload))
  }
}

async function handleJoin(
  socketId: string,
  client: Client,
  payload: Record<string, any>
): Promise<void> {
  const { roomId, token } = payload

  let userId: string, username: string
  try {
    const decoded = verifyToken(token)
    const user = await User.findById(decoded.userId)
    if (!user) throw new Error('User not found')
    userId = user._id.toString()
    username = user.username
  } catch {
    safeSend(client.socket, { type: 'error', message: 'Authentication failed.' })
    return
  }

  const room = await Room.findOne({ roomId })
  if (!room) {
    safeSend(client.socket, { type: 'error', message: 'Room not found.' })
    return
  }

  if (client.roomId && client.roomId !== roomId) {
    leaveRoom(socketId, client)
  }

  client.userId = userId
  client.username = username
  client.roomId = roomId
  clients.set(socketId, client)

  if (!rooms.has(roomId)) rooms.set(roomId, new Set())
  rooms.get(roomId)!.add(socketId)

  if (!roomMembers.has(roomId)) roomMembers.set(roomId, new Set())
  const memberSet = roomMembers.get(roomId)!
  const isNewMember = !memberSet.has(userId)
  memberSet.add(userId)

  safeSend(client.socket, {
    type: 'session',
    sessionId: client.sessionId,
    userId,
    username,
  })

  const history = await Message.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
  safeSend(client.socket, {
    type: 'history',
    messages: history.reverse().map((m: any) => ({
      id: m._id.toString(),
      sender: m.senderUsername,
      senderId: m.senderId.toString(),
      text: m.message,
      imageUrl: m.imageUrl,
      timestamp: m.createdAt,
    })),
  })

  const usersCount = getRoomUserCount(roomId)
  const joinPayload = {
    type: 'join',
    username,
    userId,
    usersCount,
    timestamp: new Date(),
  }
  safeSend(client.socket, joinPayload)

  if (isNewMember) {
    broadcast(roomId, joinPayload, socketId)
  }
}

async function handleChat(
  socketId: string,
  client: Client,
  payload: Record<string, any>
): Promise<void> {
  const { roomId, message, imageUrl } = payload

  if (!client.userId || !client.roomId) {
    safeSend(client.socket, { type: 'error', message: 'Not in a room.' })
    return
  }

  const saved = await Message.create({
    roomId: client.roomId,
    senderId: client.userId,
    senderUsername: client.username,
    message: message || '',
    imageUrl: imageUrl || null,
  })

  const outgoing = {
    type: 'chat',
    id: saved._id.toString(),
    sender: client.username,
    senderId: client.userId,
    sessionId: client.sessionId,
    text: saved.message,
    imageUrl: saved.imageUrl,
    timestamp: saved.createdAt,
  }

  broadcastAll(client.roomId, outgoing)
}

function handleTyping(
  socketId: string,
  client: Client,
  payload: Record<string, any>
): void {
  if (!client.roomId) return
  broadcast(
    client.roomId,
    {
      type: 'typing',
      username: client.username,
      userId: client.userId,
      isTyping: payload.isTyping,
    },
    socketId
  )
}

function leaveRoom(socketId: string, client: Client): void {
  const { roomId, username, userId } = client
  if (!roomId) return

  const roomSet = rooms.get(roomId)
  if (roomSet) {
    roomSet.delete(socketId)
    if (roomSet.size === 0) rooms.delete(roomId)
  }

  const hasOtherConnections = Array.from(getRoomClients(roomId)).some(
    (sid) => clients.get(sid)?.userId === userId
  )

  if (!hasOtherConnections && userId) {
    const memberSet = roomMembers.get(roomId)
    if (memberSet) {
      memberSet.delete(userId)
      if (memberSet.size === 0) roomMembers.delete(roomId)
    }

    const usersCount = getRoomUserCount(roomId)
    broadcast(roomId, {
      type: 'leave',
      username,
      userId,
      usersCount,
      timestamp: new Date(),
    })
  }

  client.roomId = null
}

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (socket: WebSocket) => {
    const socketId = uuidv4()
    const sessionId = uuidv4()

    const client: Client = {
      socket,
      socketId,
      sessionId,
      userId: null,
      username: null,
      roomId: null,
    }
    clients.set(socketId, client)

    socket.on('message', async (raw: any) => {
      let msg: ChatMessage
      try {
        msg = JSON.parse(raw)
      } catch {
        safeSend(socket, { type: 'error', message: 'Invalid JSON.' })
        return
      }

      const { type, payload = {} } = msg

      try {
        if (type === 'join') await handleJoin(socketId, client, payload)
        else if (type === 'chat') await handleChat(socketId, client, payload)
        else if (type === 'typing') handleTyping(socketId, client, payload)
        else if (type === 'leave') leaveRoom(socketId, client)
      } catch (err) {
        console.error('WS handler error:', err)
        safeSend(socket, { type: 'error', message: 'Internal server error.' })
      }
    })

    socket.on('close', () => {
      leaveRoom(socketId, client)
      clients.delete(socketId)
    })

    socket.on('error', (err: Error) => {
      console.error('Socket error:', err)
      leaveRoom(socketId, client)
      clients.delete(socketId)
    })
  })
}
