import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { preventivoUpdateSchema } from "@/lib/validations/preventivos"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/** GET /api/preventivos/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const id = parseInt(params.id)
  const preventivo = await prisma.preventivo.findUnique({ where: { id } })
  if (!preventivo) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  return NextResponse.json(preventivo)
}

/** PATCH /api/preventivos/[id] — admin/coordinador/analista only */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador" && rol !== "coordinador" && rol !== "analista") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const exists = await prisma.preventivo.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const body = await req.json()
  const parsed = preventivoUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const data: Record<string, unknown> = {}
  const d = parsed.data
  if (d.title !== undefined) data.title = d.title
  if (d.version !== undefined) data.version = d.version
  if (d.idEquipo !== undefined) data.idEquipo = d.idEquipo
  if (d.fechaProgramada !== undefined)
    data.fechaProgramada = d.fechaProgramada ? new Date(d.fechaProgramada) : null
  if (d.cualitativo !== undefined) data.cualitativo = d.cualitativo
  if (d.mantenimiento !== undefined) data.mantenimiento = d.mantenimiento
  if (d.cuantitativo !== undefined) data.cuantitativo = d.cuantitativo
  if (d.otros !== undefined) data.otros = d.otros

  const updated = await prisma.preventivo.update({ where: { id }, data })
  return NextResponse.json(updated)
}

/** DELETE /api/preventivos/[id] — soft delete, admin only */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role
  if (rol !== "administrador") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const id = parseInt(params.id)
  await prisma.preventivo.update({ where: { id }, data: { activo: false } })
  return new Response(null, { status: 204 })
}
