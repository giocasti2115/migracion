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
  try {
    return await prisma.sesion.create({
      data: { idUsuario, activa: true, lat, lng },
    })
  } catch (e: any) {
    console.error("[dbg] crearSesion failed:", e?.message)
    throw e
  }
}

/**
 * Revokes all previous active sessions for a user (single-session enforcement).
 * Also revokes all associated refresh tokens.
 * Requirement 1.1: exactly one active session per user at any time.
 */
export async function revocarSesionesAnteriores(idUsuario: number): Promise<void> {
  // Revoke all refresh tokens for the user first
  try {
    await revocarTodosRefreshTokens(idUsuario)
  } catch (e: any) {
    console.error("[dbg] revocarTodosRefreshTokens failed:", e?.message)
  }

  // Cache revoked sessions in Redis for access token invalidation
  let previousSessions: any[] = []
  try {
    previousSessions = await prisma.sesion.findMany({
      where: { idUsuario, activa: true },
    })
  } catch (e: any) {
    console.error("[dbg] findMany failed:", e?.message)
  }
  try {
    const r = await getRedis()
    if (r) {
      for (const sesion of previousSessions) {
        await r.set(`revoked-session:${sesion.id}`, "1", "EX", 86400)
      }
    }
  } catch (e: any) {
    console.error("[dbg] Redis set failed:", e?.message)
  }

  // Mark all active sessions as inactive
  try {
    await prisma.sesion.updateMany({
      where: { idUsuario, activa: true },
      data: { activa: false },
    })
  } catch (e: any) {
    console.error("[dbg] updateMany failed:", e?.message)
  }
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
