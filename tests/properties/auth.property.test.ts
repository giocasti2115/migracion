/**
 * Property tests P1–P4: Authentication & Sessions
 *
 * P1: Single active session per user — after revocarSesionesAnteriores, exactly 0 prior sessions remain active
 * P2: Revoked refresh token is always invalid
 * P3: Expired refresh token is always invalid
 * P4: Tecnico role never has access to /administracion routes
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import * as fc from "fast-check"

// ── Import the modules under test ────────────────────────────────────────────
import { revocarSesionesAnteriores } from "@/lib/session-manager"
import { verifyRefreshToken, revocarTodosRefreshTokens } from "@/lib/auth-tokens"
import { PERMISOS_RUTA } from "@/lib/permisos"

// Prisma mock is provided by tests/setup.ts
import { prisma } from "@/lib/prisma"

const mockedPrisma = prisma as unknown as {
  refreshToken: {
    findUnique: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
  sesion: {
    updateMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── P1: Single active session ─────────────────────────────────────────────────
describe("P1 — Single active session per user", () => {
  it("revocarSesionesAnteriores marks all previous sessions inactive", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 100_000 }), async (idUsuario) => {
        mockedPrisma.sesion.updateMany.mockResolvedValue({ count: 1 })
        mockedPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 })

        await revocarSesionesAnteriores(idUsuario)

        // Must call updateMany with the correct userId and activa: false
        const calls = mockedPrisma.sesion.updateMany.mock.calls
        const lastCall = calls[calls.length - 1]?.[0]
        expect(lastCall?.where?.idUsuario).toBe(idUsuario)
        expect(lastCall?.data?.activa).toBe(false)
      })
    )
  })
})

// ── P2: Revoked token is always invalid ───────────────────────────────────────
describe("P2 — Revoked refresh token always returns null", () => {
  it("verifyRefreshToken returns null for any revoked token", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (token) => {
        // Simulate a revoked token record
        mockedPrisma.refreshToken.findUnique.mockResolvedValue({
          token,
          revocado: true,
          expiresAt: new Date(Date.now() + 86_400_000), // still in the future
          usuario: {},
          sesion: {},
        })

        const result = await verifyRefreshToken(token)
        expect(result).toBeNull()
      })
    )
  })
})

// ── P3: Expired token is always invalid ───────────────────────────────────────
describe("P3 — Expired refresh token always returns null", () => {
  it("verifyRefreshToken returns null for any expired token", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 365 }),
        async (token, daysAgo) => {
          const pastDate = new Date(Date.now() - daysAgo * 86_400_000)
          mockedPrisma.refreshToken.findUnique.mockResolvedValue({
            token,
            revocado: false,
            expiresAt: pastDate, // expired
            usuario: {},
            sesion: {},
          })

          const result = await verifyRefreshToken(token)
          expect(result).toBeNull()
        }
      )
    )
  })

  it("verifyRefreshToken returns the record for a valid, non-revoked, non-expired token", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 30 }),
        async (token, daysAhead) => {
          const futureDate = new Date(Date.now() + daysAhead * 86_400_000)
          const record = {
            token,
            revocado: false,
            expiresAt: futureDate,
            usuario: { id: 1 },
            sesion: { id: 1 },
          }
          mockedPrisma.refreshToken.findUnique.mockResolvedValue(record)

          const result = await verifyRefreshToken(token)
          expect(result).not.toBeNull()
        }
      )
    )
  })
})

// ── P4: Tecnico role never accesses /administracion ───────────────────────────
describe("P4 — Role isolation: tecnico cannot access restricted routes", () => {
  const TECNICO_FORBIDDEN = ["/administracion", "/catalogos", "/cotizaciones", "/equipos", "/preventivos"]

  it("tecnico is not in the allowed roles for /administracion", () => {
    const adminRoles = PERMISOS_RUTA["/administracion"] ?? []
    expect(adminRoles).not.toContain("tecnico")
  })

  it("for any forbidden route, tecnico is excluded from allowed roles", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TECNICO_FORBIDDEN),
        (route) => {
          const allowedRoles = PERMISOS_RUTA[route] ?? []
          return !allowedRoles.includes("tecnico")
        }
      )
    )
  })

  it("administrador has access to all defined routes", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(PERMISOS_RUTA)),
        (route) => {
          const allowedRoles = PERMISOS_RUTA[route] ?? []
          return allowedRoles.includes("administrador")
        }
      )
    )
  })
})
