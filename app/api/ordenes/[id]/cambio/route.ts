import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { ordenCambioSchema } from "@/lib/validations/ordenes"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/**
 * POST /api/ordenes/[id]/cambio
 *
 * Adds a state change entry (OrdenCambio) to an Orden.
 * Body: { idSubEstado: number, comentario?: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)

  const orden = await prisma.orden.findUnique({
    where: { id },
    include: { solicitud: { select: { equipo: { select: { idSede: true } } } } },
  })

  if (!orden) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
  if (sedeIds !== "all" && !sedeIds.includes(orden.solicitud.equipo.idSede)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = ordenCambioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const cambio = await prisma.ordenCambio.create({
    data: {
      idOrden: id,
      idSubEstado: parsed.data.idSubEstado,
      idCreador: userId,
      comentario: parsed.data.comentario ?? null,
    },
    include: { subEstado: true, creador: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(cambio, { status: 201 })
}

/** GET /api/ordenes/[id]/cambio — list all cambios for this orden */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)

  const orden = await prisma.orden.findUnique({
    where: { id },
    include: { solicitud: { select: { equipo: { select: { idSede: true } } } } },
  })

  if (!orden) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
  if (sedeIds !== "all" && !sedeIds.includes(orden.solicitud.equipo.idSede)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const cambios = await prisma.ordenCambio.findMany({
    where: { idOrden: id },
    include: { subEstado: true, creador: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  })

  return NextResponse.json(cambios)
}
