import { MemoryStore, Options, Store, ClientRateLimitInfo } from 'express-rate-limit'
import { createClient } from 'redis'

type RedisClient = ReturnType<typeof createClient>

const DEFAULT_RATE_LIMIT_PREFIX = 'chatroom:rate-limit'

const activeStores = new Set<RedisRateLimitStore>()

function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL
}

function getRateLimitPrefix(): string {
  return process.env.REDIS_RATE_LIMIT_PREFIX || DEFAULT_RATE_LIMIT_PREFIX
}

function createRedisClient(redisUrl: string): RedisClient {
  return createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
    },
  })
}

export class RedisRateLimitStore implements Store {
  localKeys = false
  prefix: string

  private limiterPrefix: string
  private client: RedisClient | null = null
  private memoryFallback = new MemoryStore()
  private connectPromise: Promise<void> | null = null
  private windowMs = 60 * 1000
  private redisReady = false

  constructor(prefix: string) {
    this.limiterPrefix = prefix
    this.prefix = `${DEFAULT_RATE_LIMIT_PREFIX}:${prefix}:`
    activeStores.add(this)
  }

  init(options: Options): void {
    this.windowMs = options.windowMs
    this.memoryFallback.init(options)
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const client = await this.getClient()
    if (!client) return this.memoryFallback.get(key)

    const totalHits = Number(await client.get(this.key(key)))
    if (!totalHits) return undefined

    const ttl = await client.pTTL(this.key(key))
    const resetTime = new Date(Date.now() + Math.max(ttl, 0))
    return { totalHits, resetTime }
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const client = await this.getClient()
    if (!client) return this.memoryFallback.increment(key)

    const redisKey = this.key(key)
    const totalHits = await client.incr(redisKey)

    if (totalHits === 1) {
      await client.pExpire(redisKey, this.windowMs)
    }

    let ttl = await client.pTTL(redisKey)
    if (ttl < 0) {
      await client.pExpire(redisKey, this.windowMs)
      ttl = this.windowMs
    }

    return {
      totalHits,
      resetTime: new Date(Date.now() + ttl),
    }
  }

  async decrement(key: string): Promise<void> {
    const client = await this.getClient()
    if (!client) {
      await this.memoryFallback.decrement(key)
      return
    }

    const redisKey = this.key(key)
    const totalHits = await client.decr(redisKey)
    if (totalHits <= 0) {
      await client.del(redisKey)
    }
  }

  async resetKey(key: string): Promise<void> {
    const client = await this.getClient()
    if (!client) {
      await this.memoryFallback.resetKey(key)
      return
    }

    await client.del(this.key(key))
  }

  async shutdown(): Promise<void> {
    this.memoryFallback.shutdown()
    activeStores.delete(this)
    this.redisReady = false

    if (this.client?.isOpen) {
      await this.client.quit()
    }

    this.client = null
    this.connectPromise = null
  }

  private key(key: string): string {
    return `${getRateLimitPrefix()}:${this.limiterPrefix}:${key}`
  }

  private async getClient(): Promise<RedisClient | null> {
    const redisUrl = getRedisUrl()
    if (!redisUrl) return null

    if (this.client?.isReady && this.redisReady) return this.client
    if (this.client?.isOpen) return null

    if (!this.connectPromise) {
      this.client = createRedisClient(redisUrl)
      this.client.on('ready', () => {
        this.redisReady = true
      })
      this.client.on('end', () => {
        this.redisReady = false
        this.connectPromise = null
      })
      this.client.on('error', (err: Error) => {
        this.redisReady = false
        console.error('Redis rate limit error:', err.message)
      })

      this.connectPromise = this.client
        .connect()
        .then(() => {
          this.redisReady = true
          console.log(`Redis rate limit store ready for prefix "${getRateLimitPrefix()}:${this.limiterPrefix}:"`)
        })
        .catch((err: Error) => {
          this.redisReady = false
          this.connectPromise = null
          this.client = null
          console.error('Redis rate limit store unavailable, using local fallback:', err.message)
        })
    }

    await this.connectPromise
    return this.client?.isReady && this.redisReady ? this.client : null
  }
}

export async function closeRateLimitRedis(): Promise<void> {
  await Promise.allSettled(Array.from(activeStores, (store) => store.shutdown()))
}
