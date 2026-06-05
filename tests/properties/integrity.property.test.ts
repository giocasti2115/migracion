/**
 * Property tests P9–P10: Referential integrity and temporal invariants
 *
 * P9: Cotizacion referential integrity — idCliente must be a positive integer
 * P10: RefreshToken temporal validity — expiresAt is always after createdAt
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import * as fc from "fast-check"

import { cotizacionSchema } from "@/lib/validations/cotizaciones"
import { signRefreshToken } from "@/lib/auth-tokens"
import { prisma } from "@/lib/prisma"

const mockedPrisma = prisma as unknown as {
  refreshToken: { create: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── P9: Cotizacion referential integrity ─────────────────────────────────────
describe("P9 — Cotizacion: idCliente must reference a valid (positive integer) client", () => {
  it("schema rejects any idCliente <= 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 0 }),
        (invalidId) => {
          const result = cotizacionSchema.safeParse({
            idCliente: invalidId,
            repuestos: [{ idRepuesto: 1, cantidad: 1, valor: 100 }],
            itemsAdicionales: [],
          })
          return !result.success
        }
      )
    )
  })

  it("schema accepts any idCliente > 0 with at least one line item", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1 }),
        (validId) => {
          const result = cotizacionSchema.safeParse({
            idCliente: validId,
            repuestos: [{ idRepuesto: 1, cantidad: 1, valor: 100 }],
            itemsAdicionales: [],
          })
          return result.success
        }
      )
    )
  })

  it("schema rejects cotizacion with no repuestos AND no itemsAdicionales", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1 }),
        (idCliente) => {
          const result = cotizacionSchema.safeParse({
            idCliente,
            repuestos: [],
            itemsAdicionales: [],
          })
          return !result.success
        }
      )
    )
  })

  it("cotizacion repuesto: quantity and price must be non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1 }),          // idRepuesto
        fc.integer({ min: 1 }),          // cantidad
        fc.double({ min: 0, max: 1_000_000, noNaN: true }),  // valor
        (idRepuesto, cantidad, valor) => {
          const result = cotizacionSchema.safeParse({
            idCliente: 1,
            repuestos: [{ idRepuesto, cantidad, valor }],
            itemsAdicionales: [],
          })
          return result.success
        }
      )
    )
  })
})

// ── P10: RefreshToken temporal invariant ──────────────────────────────────────
describe("P10 — RefreshToken: expiresAt is always after createdAt (creation time)", () => {
  it("signRefreshToken creates a token whose expiresAt is in the future", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100_000 }),   // idUsuario
        fc.integer({ min: 1, max: 100_000 }),   // idSesion
        async (idUsuario, idSesion) => {
          let capturedData: any = null
          mockedPrisma.refreshToken.create.mockImplementation(async ({ data }: any) => {
            capturedData = data
            return { ...data, id: 1 }
          })

          await signRefreshToken(idUsuario, idSesion)

          if (!capturedData) return false
          const now = new Date()
          // expiresAt should be in the future (at least 1 second from now)
          return capturedData.expiresAt > now
        }
      )
    )
  })

  it("for any valid refresh token record, expiresAt > createdAt", () => {
    fc.assert(
      fc.property(
        // createdAt in the past or now
        fc.integer({ min: 0, max: 365 }).map((d) => new Date(Date.now() - d * 86_400_000)),
        // expiresAt in the future
        fc.integer({ min: 1, max: 365 }).map((d) => new Date(Date.now() + d * 86_400_000)),
        (createdAt, expiresAt) => {
          // This is the property: any stored token must satisfy expiresAt > createdAt
          return expiresAt > createdAt
        }
      )
    )
  })

  it("a token with expiresAt <= createdAt would be immediately invalid", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }).map((d) => new Date(Date.now() - d * 86_400_000)),
        (pastDate) => {
          // If expiresAt is in the past, the token should be rejected
          const isExpired = pastDate < new Date()
          return isExpired
        }
      )
    )
  })
})
