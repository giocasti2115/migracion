import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    sessionId?: number
    role?: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      sessionId?: number
      role?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
    sessionId?: number
    role?: string
  }
}
