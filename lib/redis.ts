import type RedisType from "ioredis"

const globalForRedis = globalThis as unknown as { redis: RedisType | undefined }

const IS_EDGE = process.env.NEXT_RUNTIME === "edge"

async function createRedisClient(): Promise<RedisType> {
  const { default: Redis } = await import("ioredis")
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  })

  // Prevent unhandled error events (e.g., ECONNREFUSED when no Redis is running).
  // The .catch on the promise is not enough because ioredis emits an 'error'
  // event on the client instance which crashes the process if unhandled.
  client.on("error", () => {})

  if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = client
  }
  return client
}

let redisPromise: Promise<RedisType> | null = null

export function getRedis(): Promise<RedisType | null> {
  if (IS_EDGE) return Promise.resolve(null)
  if (!redisPromise) {
    redisPromise = createRedisClient().catch(() => null as unknown as RedisType)
  }
  return redisPromise
}
