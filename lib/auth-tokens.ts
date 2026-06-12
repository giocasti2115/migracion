import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose"
import { createId } from "@paralleldrive/cuid2"
import { prisma } from "./prisma"
import { getRedis } from "./redis"

const REFRESH_TOKEN_TTL_DAYS = 7
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, "\n")
}

async function getPrivateKey() {
  const key = process.env.AUTH_PRIVATE_KEY
  if (!key) throw new Error("AUTH_PRIVATE_KEY environment variable is not set")
  return await importPKCS8(normalizePem(key), "RS256")
}

async function getPublicKey() {
  const key = process.env.AUTH_PUBLIC_KEY
  if (!key) throw new Error("AUTH_PUBLIC_KEY environment variable is not set")
  return await importSPKI(normalizePem(key), "RS256")
}

export async function signAccessToken(
  payload: Record<string, unknown>
): Promise<string> {
  const jti = createId()
  const privateKey = await getPrivateKey()

  return await new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .setJti(jti)
    .sign(privateKey)
}

export async function verifyAccessToken(
  token: string
): Promise<Record<string, unknown> | null> {
  try {
    const publicKey = await getPublicKey()
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["RS256"],
    })

    const jti = payload.jti as string
    if (jti) {
      const r = await getRedis()
      const revoked = await r?.get(`revoked:${jti}`)
      if (revoked) return null
    }

    const sessionId = payload.sessionId as number | undefined
    if (sessionId) {
      const r = await getRedis()
      const sessionRevoked = await r?.get(`revoked-session:${sessionId}`)
      if (sessionRevoked) return null
    }

    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export async function revocarAccessTokenJti(jti: string): Promise<void> {
  const r = await getRedis()
  if (r) {
    await r.set(`revoked:${jti}`, "1", "EX", ACCESS_TOKEN_TTL_SECONDS)
  }
}

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

export async function revocarRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token, revocado: false },
    data: { revocado: true },
  })
}

export async function revocarTodosRefreshTokens(idUsuario: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { idUsuario, revocado: false },
    data: { revocado: true },
  })
}

export async function revocarRefreshTokensPorSesion(idSesion: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { idSesion, revocado: false },
    data: { revocado: true },
  })
}
