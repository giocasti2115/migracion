import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { tienePermiso, type Rol } from "@/lib/permisos"

/**
 * Route protection middleware — Task 1.5.
 *
 * Behaviour:
 * • Auth pages (/login, /cambiar-clave): redirect to /dashboard if already authenticated.
 * • All other paths (outside /api/auth & static assets): require a valid session.
 * • After authentication, RBAC is enforced via PERMISOS_RUTA (Requirement 2.4).
 *
 * NextAuth v5 wraps the handler so `req.auth` holds the current session (or null).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Auth pages — redirect to dashboard when already logged in
  if (pathname === "/login" || pathname.startsWith("/cambiar-clave")) {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // No session or no user → redirect to login, preserving the intended URL
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // RBAC — check if role is allowed on this pathname
  const rol = (session.user as { role?: string }).role as Rol | undefined
  if (rol && !tienePermiso(pathname, rol)) {
    return NextResponse.redirect(new URL("/no-autorizado", req.url))
  }

  return NextResponse.next()
})

export const config = {
  /*
   * Match every route EXCEPT:
   *  - /api/auth/** (NextAuth handlers)
   *  - /_next/static, /_next/image (Next.js internals)
   *  - /favicon.ico, /geo/** (public static assets)
   */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|geo/).*)"],
}
