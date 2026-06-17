import { PrismaClient } from "@prisma/client"

/**
 * Singleton Prisma client to avoid exhausting the database connection pool
 * in development (Next.js hot-reload creates new module instances).
 *
 * In production a single instance is created and reused.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
