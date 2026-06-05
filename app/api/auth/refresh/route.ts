import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { signRefreshToken, revocarRefreshToken, revocarTodosRefreshTokens, verifyRefreshToken } from "@/lib/auth-tokens"

/**
 * POST /api/auth/refresh
 *
 * Rotates the refresh token:
 * 1. Reads the httpOnly `refresh_token` cookie.
 * 2. If valid → revoke old token, issue new access + refresh pair, set new cookies.
 * 3. If previously used (reuse attack) → revoke ALL sessions for that user, return 401.
 * 4. If missing/expired/revoked → return 401.
 *
 * Requirements: 1.7, 1.8
 */
export async function POST() {
  const cookieStore = await cookies()
  const oldRefreshToken = cookieStore.get("refresh_token")?.value

  if (!oldRefreshToken) {
    return Response.json({ error: "No refresh token" }, { status: 401 })
  }

  const tokenRecord = await verifyRefreshToken(oldRefreshToken)

  if (!tokenRecord) {
    // Check if this is a previously revoked token (reuse attack — Req 1.8)
    const revokedRecord = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    })

    if (revokedRecord) {
      // Token reuse detected — revoke all sessions for the user
      await revocarTodosRefreshTokens(revokedRecord.idUsuario)
      await prisma.sesion.updateMany({
        where: { idUsuario: revokedRecord.idUsuario, activa: true },
        data: { activa: false },
      })
    }

    return Response.json({ error: "Token inválido o expirado" }, { status: 401 })
  }

  // Rotate: revoke the old token, issue a new one
  await revocarRefreshToken(oldRefreshToken)
  const newRefreshToken = await signRefreshToken(
    tokenRecord.idUsuario,
    tokenRecord.idSesion
  )

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }

  const response = Response.json({ ok: true })
  cookieStore.set("refresh_token", newRefreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return response
}
