/**
 * WebSocket Handler
 * Manages connections, rooms, messaging, typing indicators, and Redis pub/sub.
 * Saves every chat message to MongoDB.
 */

import { WebSocket, WebSocketServer } from 'ws'
import { Types } from 'mongoose'
import { verifyToken } from '../utils/jwt.js'
import Message from '../models/Message.js'
import Room from '../models/Room.js'
import User from '../models/User.js'
import { v4 as uuidv4 } from 'uuid'
import {
  addRoomPresence,
  appendCachedRoomMessage,
  cacheRoomHistory,
  CachedRoomMessage,
  getCachedRoomHistory,
  getPresenceCount,
  initRedisPubSub,
  publishRoomEvent,
  removeRoomPresence,
  resetUserPresence,
  cleanupStalePresenceInRoom,
} from '../config/redis.js'

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

const clients = new Map<string, Client>()
const rooms = new Map<string, Set<string>>()
const roomMembers = new Map<string, Set<string>>()
const DB_HISTORY_LIMIT = 100
const REPLY_PREVIEW_LIMIT = 160

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
    if (client && client.socket.readyState === WebSocket.OPEN && socketId !== excludeSocketId) {
      client.socket.send(data)
    }
  }
}

async function emitRoomEvent(
  roomId: string,
  payload: Record<string, any>,
  excludeSocketId: string | null = null
): Promise<void> {
  broadcast(roomId, payload, excludeSocketId)
  await publishRoomEvent(roomId, payload, excludeSocketId)
}

function getRoomUserCount(roomId: string): number {
  return (roomMembers.get(roomId) || new Set()).size
}

function addLocalPresence(roomId: string, userId: string): boolean {
  if (!roomMembers.has(roomId)) roomMembers.set(roomId, new Set())

  const memberSet = roomMembers.get(roomId)!
  const isNewMember = !memberSet.has(userId)
  memberSet.add(userId)
  return isNewMember
}

function removeLocalPresence(roomId: string, userId: string | null): boolean {
  if (!userId) return false

  const hasOtherConnections = Array.from(getRoomClients(roomId)).some(
    (sid) => clients.get(sid)?.userId === userId
  )
  if (hasOtherConnections) return false

  const memberSet = roomMembers.get(roomId)
  if (!memberSet) return false

  memberSet.delete(userId)
  if (memberSet.size === 0) roomMembers.delete(roomId)
  return true
}

function safeSend(socket: WebSocket, payload: Record<string, any>): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload))
  }
}

function buildMessagePreview(
  message: string,
  imageUrl?: string | null,
  videoUrl?: string | null
): string {
  const trimmed = message.trim()
  const preview = trimmed || (imageUrl ? 'Photo' : videoUrl ? 'Video' : '')
  return preview.length > REPLY_PREVIEW_LIMIT
    ? `${preview.slice(0, REPLY_PREVIEW_LIMIT - 1)}...`
    : preview
}

function buildReplyFallback(replyToSnapshot: any): Record<string, any> | null {
  if (!replyToSnapshot?.messageId) return null

  return {
    messageId: String(replyToSnapshot.messageId),
    senderId: String(replyToSnapshot.senderId || ''),
    senderUsername: String(replyToSnapshot.sender || replyToSnapshot.senderUsername || 'Unknown'),
    messagePreview: buildMessagePreview(
      String(replyToSnapshot.text || replyToSnapshot.messagePreview || ''),
      replyToSnapshot.imageUrl || null,
      replyToSnapshot.videoUrl || null
    ),
    imageUrl: replyToSnapshot.imageUrl || '',
    videoUrl: replyToSnapshot.videoUrl || '',
  }
}

function formatReplyTo(replyTo: any): CachedRoomMessage['replyTo'] {
  if (!replyTo?.messageId) return null

  return {
    messageId: replyTo.messageId.toString(),
    senderId: replyTo.senderId.toString(),
    sender: replyTo.senderUsername,
    text: replyTo.messagePreview,
    imageUrl: replyTo.imageUrl || null,
    videoUrl: replyTo.videoUrl || null,
  }
}

function formatMessage(m: any): CachedRoomMessage {
  return {
    id: m._id.toString(),
    sender: m.senderUsername,
    senderId: m.senderId.toString(),
    text: m.message,
    imageUrl: m.imageUrl,
    videoUrl: m.videoUrl,
    replyTo: formatReplyTo(m.replyTo),
    timestamp: m.createdAt,
  }
}

async function buildReplySnapshot(
  roomId: string,
  replyToMessageId: unknown,
  replyToSnapshot: unknown
): Promise<Record<string, any> | null> {
  if (!replyToMessageId) return null

  const fallback = buildReplyFallback(replyToSnapshot)
  if (typeof replyToMessageId !== 'string') {
    throw new Error('Invalid reply target.')
  }

  if (!Types.ObjectId.isValid(replyToMessageId)) {
    return fallback
  }

  const original = await Message.findOne({
    _id: replyToMessageId,
    roomId,
  })
    .select('senderId senderUsername message imageUrl videoUrl')
    .lean()

  if (!original) {
    return fallback
  }

  return {
    messageId: original._id.toString(),
    senderId: original.senderId.toString(),
    senderUsername: original.senderUsername,
    messagePreview: buildMessagePreview(original.message || '', original.imageUrl, original.videoUrl),
    imageUrl: original.imageUrl || '',
    videoUrl: original.videoUrl || '',
  }
}

async function getRoomHistory(roomId: string): Promise<CachedRoomMessage[]> {
  const cachedHistory = await getCachedRoomHistory(roomId)
  if (cachedHistory) return cachedHistory

  const history = await Message.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(DB_HISTORY_LIMIT)
    .lean()

  const messages = history.reverse().map(formatMessage)

  await cacheRoomHistory(roomId, messages)
  return messages
}

async function handleJoin(
  socketId: string,
  client: Client,
  payload: Record<string, any>
): Promise<void> {
  const { roomId, token } = payload

  if (typeof roomId !== 'string' || typeof token !== 'string') {
    safeSend(client.socket, { type: 'error', message: 'Invalid join payload.' })
    return
  }

  let userId: string
  let username: string
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

  const alreadyJoined = client.roomId === roomId && client.userId === userId
  if (client.roomId && client.roomId !== roomId) {
    await leaveRoom(socketId, client)
  }

  // For a brand new join from this browser tab, clean up any stale presence
  // in the room (from previous sessions) to ensure accurate user counts
  if (!alreadyJoined) {
    // Always cleanup stale presence when a fresh user joins
    // This ensures the room doesn't accumulate stale data from previous sessions
    await cleanupStalePresenceInRoom(roomId)
  }

  client.userId = userId
  client.username = username
  client.roomId = roomId
  clients.set(socketId, client)

  if (!rooms.has(roomId)) rooms.set(roomId, new Set())
  rooms.get(roomId)!.add(socketId)

  const localIsNewMember = addLocalPresence(roomId, userId)
  const redisPresence = alreadyJoined ? null : await addRoomPresence(roomId, userId, localIsNewMember)
  const usersCount = redisPresence?.usersCount ?? getRoomUserCount(roomId)
  const shouldBroadcastJoin = redisPresence?.isFirstUserConnection ?? localIsNewMember

  console.log(`[Join] ${username} (${userId}) → ${roomId}: users=${usersCount}`)

  safeSend(client.socket, {
    type: 'session',
    sessionId: client.sessionId,
    userId,
    username,
  })

  const history = await getRoomHistory(roomId)

  safeSend(client.socket, {
    type: 'history',
    messages: history,
  })

  const joinPayload = {
    type: 'join',
    username,
    userId,
    usersCount,
    timestamp: new Date(),
  }
  safeSend(client.socket, joinPayload)

  if (!alreadyJoined && shouldBroadcastJoin) {
    await emitRoomEvent(roomId, joinPayload, socketId)
  }
}

async function handleChat(
  client: Client,
  payload: Record<string, any>
): Promise<void> {
  const { message, imageUrl, videoUrl, replyToMessageId, replyToSnapshot } = payload

  if (!client.userId || !client.roomId) {
    safeSend(client.socket, { type: 'error', message: 'Not in a room.' })
    return
  }

  if (!message && !imageUrl && !videoUrl) {
    safeSend(client.socket, { type: 'error', message: 'Message cannot be empty.' })
    return
  }

  let replyTo: Record<string, any> | null = null
  try {
    replyTo = await buildReplySnapshot(client.roomId, replyToMessageId, replyToSnapshot)
  } catch (err) {
    safeSend(client.socket, {
      type: 'error',
      message: err instanceof Error ? err.message : 'Invalid reply target.',
    })
    return
  }

  const saved = await Message.create({
    roomId: client.roomId,
    senderId: client.userId,
    senderUsername: client.username,
    message: message || '',
    imageUrl: imageUrl || null,
    videoUrl: videoUrl || null,
    replyTo,
  })

  const outgoing = {
    type: 'chat',
    id: saved._id.toString(),
    sender: client.username,
    senderId: client.userId,
    sessionId: client.sessionId,
    text: saved.message,
    imageUrl: saved.imageUrl,
    videoUrl: saved.videoUrl,
    replyTo: formatReplyTo(saved.replyTo),
    timestamp: saved.createdAt,
  }

  await appendCachedRoomMessage(client.roomId, {
    id: outgoing.id,
    sender: outgoing.sender,
    senderId: outgoing.senderId,
    text: outgoing.text,
    imageUrl: outgoing.imageUrl,
    videoUrl: outgoing.videoUrl,
    replyTo: outgoing.replyTo,
    timestamp: outgoing.timestamp,
  })

  await emitRoomEvent(client.roomId, outgoing)
}

async function handleTyping(
  socketId: string,
  client: Client,
  payload: Record<string, any>
): Promise<void> {
  if (!client.roomId) return

  await emitRoomEvent(
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

async function leaveRoom(socketId: string, client: Client): Promise<void> {
  const { roomId, username, userId } = client
  if (!roomId) return

  client.roomId = null

  const roomSet = rooms.get(roomId)
  if (roomSet) {
    roomSet.delete(socketId)
    if (roomSet.size === 0) rooms.delete(roomId)
  }

  const localWasLastConnection = removeLocalPresence(roomId, userId)
  const redisPresence = userId ? await removeRoomPresence(roomId, userId) : null
  const wasLastConnection =
    redisPresence?.isLastUserConnection ?? localWasLastConnection

  console.log(`[Leave] ${username} (${userId}) from ${roomId}: users=${redisPresence?.usersCount ?? 0}`)

  if (!wasLastConnection) return

  const usersCount = redisPresence?.usersCount ?? getRoomUserCount(roomId)
  await emitRoomEvent(roomId, {
    type: 'leave',
    username,
    userId,
    usersCount,
    timestamp: new Date(),
  })
}

export function setupWebSocket(wss: WebSocketServer): void {
  void initRedisPubSub((event) => {
    broadcast(event.roomId, event.payload, event.excludeSocketId ?? null)
  })

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

    socket.on('message', async (raw: Buffer) => {
      let msg: ChatMessage
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        safeSend(socket, { type: 'error', message: 'Invalid JSON.' })
        return
      }

      const { type, payload = {} } = msg

      try {
        if (type === 'join') await handleJoin(socketId, client, payload)
        else if (type === 'chat') await handleChat(client, payload)
        else if (type === 'typing') await handleTyping(socketId, client, payload)
        else if (type === 'leave') await leaveRoom(socketId, client)
      } catch (err) {
        console.error('WS handler error:', err)
        safeSend(socket, { type: 'error', message: 'Internal server error.' })
      }
    })

    socket.on('close', () => {
      void leaveRoom(socketId, client).finally(() => {
        clients.delete(socketId)
      })
    })

    socket.on('error', (err: Error) => {
      console.error('Socket error:', err)
      void leaveRoom(socketId, client).finally(() => {
        clients.delete(socketId)
      })
    })
  })
}
