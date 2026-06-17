import { PrismaClient } from "@prisma/client"
import { sanitizeUtf8Deep } from "@/lib/sanitize"

/**
 * Singleton Prisma client to avoid exhausting the database connection pool
 * in development (Next.js hot-reload creates new module instances).
 *
 * In production a single instance is created and reused.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

// Auto-sanitize UTF-8 on all query results (fixes double-encoded mojibake)
prismaClient.$use(async (params, next) => {
  const result = await next(params)
  return sanitizeUtf8Deep(result)
})

export const prisma = prismaClient

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient
}
