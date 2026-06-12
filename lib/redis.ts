import type Redis from "ioredis"
type RedisType = Redis

const globalForRedis = globalThis as unknown as { redis: RedisType | undefined }
const IS_EDGE = process.env.NEXT_RUNTIME === "edge"

let RedisConstructor: typeof Redis | null = null

async function getRedisConstructor(): Promise<typeof Redis> {
  if (!RedisConstructor) {
    const mod = await import("ioredis")
    RedisConstructor = mod.default ?? mod
  }
  return RedisConstructor
}

async function createRedisClient(): Promise<RedisType | null> {
  if (!process.env.REDIS_URL) return null
  try {
    const Redis = await getRedisConstructor()
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    })
    client.on("error", () => {})
    if (process.env.NODE_ENV !== "production") {
      globalForRedis.redis = client
    }
    return client
  } catch {
    return null
  }
}

let redisPromise: Promise<RedisType | null> | null = null

export function getRedis(): Promise<RedisType | null> {
  if (IS_EDGE) return Promise.resolve(null)
  if (!redisPromise) {
    redisPromise = createRedisClient()
  }
  return redisPromise
}
