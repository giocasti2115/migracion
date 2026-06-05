import { createId } from "@paralleldrive/cuid2"
import { prisma } from "./prisma"

const REFRESH_TOKEN_TTL_DAYS = 7

/**
 * Creates a new refresh token for the given user/session, stores it in the DB
 * and returns the raw token string.
 */
export async function signRefreshToken(
  idUsuario: number,
  idSesion: number
): Promise<string> {
  const token = createId()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)

  await prisma.refreshToken.create({
    data: { token, idUsuario, idSesion, expiresAt },
  })

  return token
}

/**
 * Looks up a refresh token in the DB.
 * Returns the record if valid (not revoked, not expired), null otherwise.
 */
export async function verifyRefreshToken(token: string) {
  const record = await prisma.refreshToken.findUnique({
    where: { token },
    include: { usuario: true, sesion: true },
  })

  if (!record) return null
  if (record.revocado) return null
  if (record.expiresAt < new Date()) return null

  return record
}

/**
 * Marks a single refresh token as revoked.
 */
export async function revocarRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token, revocado: false },
    data: { revocado: true },
  })
}

/**
 * Revokes ALL active refresh tokens for a given user.
 * Called when a previous token is reused (token-reuse attack).
 */
export async function revocarTodosRefreshTokens(idUsuario: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { idUsuario, revocado: false },
    data: { revocado: true },
  })
}

/**
 * Revokes all refresh tokens associated with a specific session.
 */
export async function revocarRefreshTokensPorSesion(idSesion: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { idSesion, revocado: false },
    data: { revocado: true },
  })
}
