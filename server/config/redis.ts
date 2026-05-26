import { randomUUID } from 'crypto'
import { createClient } from 'redis'

const DEFAULT_CHAT_CHANNEL = 'chatroom:events'
const DEFAULT_PRESENCE_PREFIX = 'chatroom:presence'
const DEFAULT_HISTORY_PREFIX = 'chatroom:history'
export const DEFAULT_HISTORY_LIMIT = 500
const DEFAULT_HISTORY_TTL_SECONDS = 60 * 60
const generatedServerId = randomUUID()

type RedisClient = ReturnType<typeof createClient>

export interface RoomEventEnvelope {
  originId: string
  roomId: string
  payload: Record<string, any>
  excludeSocketId?: string | null
}

export interface AddPresenceResult {
  usersCount: number
  isFirstUserConnection: boolean
}

export interface RemovePresenceResult {
  usersCount: number
  isLastUserConnection: boolean
}

export interface CachedRoomMessage {
  id: string
  sender: string | null
  senderId: string
  text: string
  imageUrl?: string | null
  videoUrl?: string | null
  replyTo?: {
    messageId: string
    senderId: string
    sender: string
    text: string
    imageUrl?: string | null
    videoUrl?: string | null
  } | null
  timestamp: string | Date
}

let publisher: RedisClient | null = null
let subscriber: RedisClient | null = null
let cacheClient: RedisClient | null = null
let connecting: Promise<boolean> | null = null
let pubSubReady = false
let cacheReady = false

function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL
}

function getChatChannel(): string {
  return process.env.REDIS_CHAT_CHANNEL || DEFAULT_CHAT_CHANNEL
}

function getPresencePrefix(): string {
  return process.env.REDIS_PRESENCE_PREFIX || DEFAULT_PRESENCE_PREFIX
}

function getHistoryPrefix(): string {
  return process.env.REDIS_HISTORY_PREFIX || DEFAULT_HISTORY_PREFIX
}

function getHistoryLimit(): number {
  const limit = Number(process.env.REDIS_HISTORY_LIMIT)
  return Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_HISTORY_LIMIT
}

function getHistoryTtlSeconds(): number {
  const ttl = Number(process.env.REDIS_HISTORY_TTL_SECONDS)
  return Number.isInteger(ttl) && ttl > 0 ? ttl : DEFAULT_HISTORY_TTL_SECONDS
}

function getRedisServerId(): string {
  return process.env.INSTANCE_ID || generatedServerId
}

function createRedisClient(redisUrl: string): RedisClient {
  return createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
    },
  })
}

function presenceKey(roomId: string): string {
  return `${getPresencePrefix()}:${roomId}`
}

function historyKey(roomId: string): string {
  return `${getHistoryPrefix()}:${roomId}`
}

export function isRedisReady(): boolean {
  return pubSubReady && Boolean(publisher?.isOpen)
}

export function isRedisCacheReady(): boolean {
  return cacheReady && Boolean(cacheClient?.isOpen)
}

export async function initRedisPubSub(
  onRoomEvent: (event: RoomEventEnvelope) => void
): Promise<boolean> {
  const redisUrl = getRedisUrl()
  if (!redisUrl) {
    console.warn('Redis pub/sub disabled. Set REDIS_URL to enable multi-instance chat.')
    return false
  }

  if (connecting) return connecting

  connecting = (async () => {
    try {
      const chatChannel = getChatChannel()
      publisher = createRedisClient(redisUrl)
      subscriber = createRedisClient(redisUrl)
      cacheClient = createRedisClient(redisUrl)

      publisher.on('error', (err: Error) => {
        pubSubReady = false
        console.error('Redis publisher error:', err.message)
      })
      subscriber.on('error', (err: Error) => {
        pubSubReady = false
        console.error('Redis subscriber error:', err.message)
      })
      cacheClient.on('error', (err: Error) => {
        cacheReady = false
        console.error('Redis cache error:', err.message)
      })

      await Promise.all([publisher.connect(), subscriber.connect(), cacheClient.connect()])
      await subscriber.subscribe(chatChannel, (message: string) => {
        try {
          const event = JSON.parse(message) as RoomEventEnvelope
          if (event.originId === getRedisServerId()) return
          onRoomEvent(event)
        } catch (err) {
          console.error('Invalid Redis room event:', err)
        }
      })

      pubSubReady = true
      cacheReady = true
      console.log(`Redis pub/sub connected on channel "${chatChannel}"`)
      console.log('Redis cache connection ready')
      return true
    } catch (err) {
      pubSubReady = false
      cacheReady = false
      console.error('Redis pub/sub unavailable, falling back to local WebSocket only:', err)
      await closeRedis()
      return false
    }
  })()

  return connecting
}

export async function publishRoomEvent(
  roomId: string,
  payload: Record<string, any>,
  excludeSocketId: string | null = null
): Promise<boolean> {
  if (!isRedisReady() || !publisher) return false

  try {
    const envelope: RoomEventEnvelope = {
      originId: getRedisServerId(),
      roomId,
      payload,
      excludeSocketId,
    }
    await publisher.publish(getChatChannel(), JSON.stringify(envelope))
    return true
  } catch (err) {
    console.error('Failed to publish Redis room event:', err)
    return false
  }
}

export async function addRoomPresence(
  roomId: string,
  userId: string,
  isLocalNewMember: boolean
): Promise<AddPresenceResult | null> {
  if (!isRedisReady() || !publisher) return null

  try {
    const key = presenceKey(roomId)
    
    let connections: number
    if (isLocalNewMember) {
      // First socket from this user in this room - reset to 1 to avoid stale counts
      // This prevents double-counting after server restarts
      await publisher.hSet(key, userId, '1')
      connections = 1
    } else {
      // User already has sockets in this room - increment (multiple tabs/windows)
      connections = await publisher.hIncrBy(key, userId, 1)
    }
    
    // Set expiration on the presence key (5 minutes) to clean up stale entries
    await publisher.expire(key, 300)
    
    const usersCount = await publisher.hLen(key)
    
    return {
      usersCount,
      isFirstUserConnection: connections === 1,
    }
  } catch (err) {
    console.error('Failed to add Redis room presence:', err)
    return null
  }
}

export async function removeRoomPresence(
  roomId: string,
  userId: string
): Promise<RemovePresenceResult | null> {
  if (!isRedisReady() || !publisher) return null

  try {
    const key = presenceKey(roomId)
    const connections = await publisher.hIncrBy(key, userId, -1)
    const isLastConnection = connections <= 0

    if (isLastConnection) {
      await publisher.hDel(key, userId)
    }

    const usersCount = await publisher.hLen(key)
    
    return {
      usersCount,
      isLastUserConnection: isLastConnection,
    }
  } catch (err) {
    console.error('Failed to remove Redis room presence:', err)
    return null
  }
}

export async function getPresenceCount(
  roomId: string,
  userId: string
): Promise<number | null> {
  if (!isRedisReady() || !publisher) return null

  try {
    const key = presenceKey(roomId)
    const count = await publisher.hGet(key, userId)
    return count ? parseInt(count, 10) : null
  } catch (err) {
    console.error('Failed to get presence count:', err)
    return null
  }
}

export async function resetUserPresence(
  roomId: string,
  userId: string
): Promise<void> {
  if (!isRedisReady() || !publisher) return

  try {
    const key = presenceKey(roomId)
    await publisher.hDel(key, userId)
  } catch (err) {
    console.error('Failed to reset presence:', err)
  }
}

export async function cleanupStalePresenceInRoom(
  roomId: string
): Promise<void> {
  if (!isRedisReady() || !publisher) return

  try {
    const key = presenceKey(roomId)
    const allUsers = await publisher.hGetAll(key)
    
    let cleaned = 0
    for (const [userId, countStr] of Object.entries(allUsers)) {
      const count = parseInt(countStr, 10)
      if (count > 1) {
        await publisher.hDel(key, userId)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Cleanup] Removed ${cleaned} stale presence entries from ${roomId}`)
    }
  } catch (err) {
    console.error('Failed to cleanup stale presence:', err)
  }
}

export async function getCachedRoomHistory(
  roomId: string
): Promise<CachedRoomMessage[] | null> {
  if (!isRedisCacheReady() || !cacheClient) return null

  try {
    const messages = await cacheClient.lRange(historyKey(roomId), 0, -1)
    if (messages.length === 0) return null

    await cacheClient.expire(historyKey(roomId), getHistoryTtlSeconds())
    return messages.map((message) => JSON.parse(message) as CachedRoomMessage)
  } catch (err) {
    console.error('Failed to read Redis room history cache:', err)
    return null
  }
}

export async function cacheRoomHistory(
  roomId: string,
  messages: CachedRoomMessage[]
): Promise<void> {
  if (!isRedisCacheReady() || !cacheClient) return

  const key = historyKey(roomId)
  const limit = getHistoryLimit()
  const recentMessages = messages.slice(-limit)

  try {
    await cacheClient.del(key)

    if (recentMessages.length > 0) {
      await cacheClient.rPush(
        key,
        recentMessages.map((message) => JSON.stringify(message))
      )
    }

    await cacheClient.expire(key, getHistoryTtlSeconds())
  } catch (err) {
    console.error('Failed to write Redis room history cache:', err)
  }
}

export async function appendCachedRoomMessage(
  roomId: string,
  message: CachedRoomMessage
): Promise<void> {
  if (!isRedisCacheReady() || !cacheClient) return

  const key = historyKey(roomId)

  try {
    await cacheClient.rPush(key, JSON.stringify(message))
    await cacheClient.lTrim(key, -getHistoryLimit(), -1)
    await cacheClient.expire(key, getHistoryTtlSeconds())
  } catch (err) {
    console.error('Failed to append Redis room history cache:', err)
  }
}

export async function closeRedis(): Promise<void> {
  pubSubReady = false
  cacheReady = false

  await Promise.allSettled([
    subscriber?.unsubscribe(getChatChannel()),
    subscriber?.quit(),
    publisher?.quit(),
    cacheClient?.quit(),
  ])

  subscriber = null
  publisher = null
  cacheClient = null
  connecting = null
}
