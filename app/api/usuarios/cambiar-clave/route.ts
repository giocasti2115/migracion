import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cambiarClaveSchema } from "@/lib/validations/usuarios"
import { compare, hash } from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/usuarios/cambiar-clave
 * Allows the authenticated user to change their own password.
 * Body: { claveActual: string, claveNueva: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)

  const body = await req.json()
  const parsed = cambiarClaveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const { claveActual, claveNueva } = parsed.data

  // Fetch stored hash
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { clave: true },
  })
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const ok = await compare(claveActual, usuario.clave)
  if (!ok) {
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 })
  }

  if (claveActual === claveNueva) {
    return NextResponse.json({ error: "La nueva contraseña debe ser diferente a la actual" }, { status: 400 })
  }

  const nuevaHash = await hash(claveNueva, 12)
  await prisma.usuario.update({ where: { id: userId }, data: { clave: nuevaHash } })

  return NextResponse.json({ ok: true })
}
