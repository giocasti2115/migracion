import { prisma } from "./prisma"
import { getRedis } from "./redis"
import { revocarRefreshTokensPorSesion, revocarTodosRefreshTokens } from "./auth-tokens"

/**
 * Creates a new active session record for a user.
 * Optionally records geolocation captured at login time.
 */
export async function crearSesion(
  idUsuario: number,
  lat?: number,
  lng?: number
) {
  return prisma.sesion.create({
    data: { idUsuario, activa: true, lat, lng },
  })
}

/**
 * Revokes all previous active sessions for a user (single-session enforcement).
 * Also revokes all associated refresh tokens.
 * Requirement 1.1: exactly one active session per user at any time.
 */
export async function revocarSesionesAnteriores(idUsuario: number): Promise<void> {
  // Revoke all refresh tokens for the user first
  await revocarTodosRefreshTokens(idUsuario)

  // Cache revoked sessions in Redis for access token invalidation
  const previousSessions = await prisma.sesion.findMany({
    where: { idUsuario, activa: true },
  })
  const r = await getRedis()
  if (r) {
    for (const sesion of previousSessions) {
      await r.set(`revoked-session:${sesion.id}`, "1", "EX", 86400)
    }
  }

  // Mark all active sessions as inactive
  await prisma.sesion.updateMany({
    where: { idUsuario, activa: true },
    data: { activa: false },
  })
}

/**
 * Revokes a single session and its associated refresh tokens.
 * Requirement 10.4: admin session revocation.
 */
export async function revocarSesion(idSesion: number): Promise<void> {
  await revocarRefreshTokensPorSesion(idSesion)
  await prisma.sesion.update({
    where: { id: idSesion },
    data: { activa: false },
  })
  const r = await getRedis()
  if (r) {
    await r.set(`revoked-session:${idSesion}`, "1", "EX", 86400)
  }
}

/**
 * Returns all currently active sessions with user info.
 * Requirement 10.3: admin view of active sessions.
 */
export async function getSesionesActivas() {
  return prisma.sesion.findMany({
    where: { activa: true },
    include: {
      usuario: {
        select: { id: true, nombre: true, usuario: true },
      },
    },
    orderBy: { creacion: "desc" },
  })
}
