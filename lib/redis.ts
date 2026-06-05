import Redis from "ioredis"

/**
 * Singleton ioredis client.
 * Reuses the connection across hot-reloads in development.
 */
const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis: Redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  })

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}
