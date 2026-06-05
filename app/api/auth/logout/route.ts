import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { revocarRefreshToken } from "@/lib/auth-tokens"
import { revocarSesion } from "@/lib/session-manager"
import { signOut } from "@/lib/auth"

/**
 * POST /api/auth/logout
 *
 * Revokes the refresh token in the DB, marks the session inactive,
 * and clears both auth cookies.
 *
 * Requirement 1.9
 */
export async function POST() {
  const session = await auth()
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get("refresh_token")?.value

  // Revoke refresh token if present
  if (refreshToken) {
    await revocarRefreshToken(refreshToken)
  }

  // Mark session as inactive if we have a sessionId in the JWT
  if (session?.user?.sessionId) {
    try {
      await revocarSesion(session.user.sessionId)
    } catch {
      // Session may already be inactive — continue with logout
    }
  }

  // Clear cookies
  cookieStore.delete("refresh_token")
  cookieStore.delete("authjs.session-token")
  cookieStore.delete("__Secure-authjs.session-token")

  return Response.json({ ok: true })
}
