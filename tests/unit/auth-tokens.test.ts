/**
 * Unit tests: auth-tokens.ts
 * Tests signRefreshToken, verifyRefreshToken, revocar* functions
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

import {
  signRefreshToken,
  verifyRefreshToken,
  revocarRefreshToken,
  revocarTodosRefreshTokens,
  revocarRefreshTokensPorSesion,
} from "@/lib/auth-tokens"
import { prisma } from "@/lib/prisma"

const db = prisma as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe("signRefreshToken", () => {
  it("creates a token record in the DB and returns a non-empty string", async () => {
    db.refreshToken.create.mockResolvedValue({ id: 1, token: "tok123", revocado: false })

    const token = await signRefreshToken(1, 42)

    expect(typeof token).toBe("string")
    expect(token.length).toBeGreaterThan(0)
    expect(db.refreshToken.create).toHaveBeenCalledOnce()
  })

  it("sets expiresAt 7 days from now", async () => {
    let capturedData: any = null
    db.refreshToken.create.mockImplementation(async ({ data }: any) => {
      capturedData = data
      return { id: 1, ...data }
    })

    await signRefreshToken(1, 1)

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const diff = capturedData.expiresAt.getTime() - Date.now()
    // Allow ±5 seconds of timing slack
    expect(diff).toBeGreaterThan(sevenDaysMs - 5_000)
    expect(diff).toBeLessThan(sevenDaysMs + 5_000)
  })

  it("associates the token with the correct user and session IDs", async () => {
    let capturedData: any = null
    db.refreshToken.create.mockImplementation(async ({ data }: any) => {
      capturedData = data
      return { id: 1, ...data }
    })

    await signRefreshToken(99, 77)

    expect(capturedData.idUsuario).toBe(99)
    expect(capturedData.idSesion).toBe(77)
  })
})

describe("verifyRefreshToken", () => {
  it("returns null when token does not exist in DB", async () => {
    db.refreshToken.findUnique.mockResolvedValue(null)
    expect(await verifyRefreshToken("nonexistent")).toBeNull()
  })

  it("returns null for a revoked token", async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      token: "t1",
      revocado: true,
      expiresAt: new Date(Date.now() + 86_400_000),
      usuario: {},
      sesion: {},
    })
    expect(await verifyRefreshToken("t1")).toBeNull()
  })

  it("returns null for an expired (but not revoked) token", async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      token: "t2",
      revocado: false,
      expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      usuario: {},
      sesion: {},
    })
    expect(await verifyRefreshToken("t2")).toBeNull()
  })

  it("returns the record for a valid, non-revoked, non-expired token", async () => {
    const record = {
      token: "t3",
      revocado: false,
      expiresAt: new Date(Date.now() + 86_400_000),
      usuario: { id: 1 },
      sesion: { id: 1 },
    }
    db.refreshToken.findUnique.mockResolvedValue(record)
    const result = await verifyRefreshToken("t3")
    expect(result).not.toBeNull()
    expect(result?.token).toBe("t3")
  })
})

describe("revocarRefreshToken", () => {
  it("calls updateMany with the correct token and revocado=false filter", async () => {
    db.refreshToken.updateMany.mockResolvedValue({ count: 1 })
    await revocarRefreshToken("myToken")
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { token: "myToken", revocado: false },
      data: { revocado: true },
    })
  })
})

describe("revocarTodosRefreshTokens", () => {
  it("revokes all tokens for the given user", async () => {
    db.refreshToken.updateMany.mockResolvedValue({ count: 3 })
    await revocarTodosRefreshTokens(5)
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { idUsuario: 5, revocado: false },
      data: { revocado: true },
    })
  })
})

describe("revocarRefreshTokensPorSesion", () => {
  it("revokes all tokens for the given session", async () => {
    db.refreshToken.updateMany.mockResolvedValue({ count: 1 })
    await revocarRefreshTokensPorSesion(42)
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { idSesion: 42, revocado: false },
      data: { revocado: true },
    })
  })
})
