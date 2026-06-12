import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"
import { loginSchema } from "./validations/auth"
import { crearSesion, revocarSesionesAnteriores } from "./session-manager"
import {
  signAccessToken,
  verifyAccessToken,
  signFallbackToken,
  verifyFallbackToken,
} from "./auth-tokens"

export type Rol =
  | "administrador"
  | "analista"
  | "tecnico"
  | "coordinador"
  | "comercial"

function determinarRol(usuario: {
  administrador: { activo: boolean } | null
  analista: { activo: boolean } | null
  tecnico: { activo: boolean } | null
  coordinador: { activo: boolean } | null
  comercial: { activo: boolean } | null
}): Rol {
  if (usuario.administrador?.activo) return "administrador"
  if (usuario.analista?.activo) return "analista"
  if (usuario.coordinador?.activo) return "coordinador"
  if (usuario.comercial?.activo) return "comercial"
  if (usuario.tecnico?.activo) return "tecnico"
  return "tecnico"
}

const nextAuthConfig: Parameters<typeof NextAuth>[0] = {
  jwt: {
    async encode({ token }) {
      if (!token) return ""
      try {
        return await signAccessToken(token)
      } catch (error) {
        console.error("[auth] RS256 failed, using HS256 fallback:", error)
        return signFallbackToken(token)
      }
    },
    async decode({ token }) {
      if (!token) return null
      try {
        const payload = await verifyAccessToken(token)
        if (payload) return payload as Record<string, unknown> | null
      } catch {
        // RS256 failed, try HS256
      }
      try {
        const payload = await verifyFallbackToken(token)
        return payload as Record<string, unknown> | null
      } catch {
        return null
      }
    },
  },
  providers: [
    Credentials({
      credentials: {
        usuario: { type: "text" },
        clave: { type: "password" },
        lat: { type: "text" },
        lng: { type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const usuario = await prisma.usuario.findUnique({
          where: { usuario: parsed.data.usuario, activo: true },
          include: {
            administrador: true,
            analista: true,
            tecnico: true,
            coordinador: true,
            comercial: true,
          },
        })
        if (!usuario) return null

        const passwordOk = await compare(parsed.data.clave, usuario.clave)
        if (!passwordOk) return null

        // Requirement 1.1 — revoke all previous sessions before creating a new one
        await revocarSesionesAnteriores(usuario.id)

        const lat =
          credentials?.lat && credentials.lat !== ""
            ? parseFloat(credentials.lat as string)
            : undefined
        const lng =
          credentials?.lng && credentials.lng !== ""
            ? parseFloat(credentials.lng as string)
            : undefined

        const sesion = await crearSesion(usuario.id, lat, lng)

        return {
          id: String(usuario.id),
          name: usuario.nombre,
          email: usuario.correo ?? undefined,
          sessionId: sesion.id,
          role: determinarRol(usuario),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.sessionId = (user as { sessionId?: number }).sessionId
        token.role = (user as { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.sessionId = token.sessionId as number
      session.user.role = token.role as string
      return session
    },
  },
  session: { strategy: "jwt", maxAge: 15 * 60 }, // 15 minutes
  pages: { signIn: "/login" },
  trustHost: true,
}

const { handlers, auth, signIn, signOut } = NextAuth(nextAuthConfig)

// Re-export handlers for the [...nextauth] route
export const { GET, POST } = handlers
export { auth, signIn, signOut }
