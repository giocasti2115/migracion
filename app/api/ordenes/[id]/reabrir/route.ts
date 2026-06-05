import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/**
 * POST /api/ordenes/[id]/reabrir
 *
 * Re-opens a closed Orden:
 * - Validates the orden is currently closed
 * - Clears cierre, idCerrador, observacionesCierre
 * - Restores idEstado to "Abierta" (id = 1)
 * - Records an OrdenCambio entry
 * - Only administradores and coordinadores can re-open
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"

  if (rol !== "administrador" && rol !== "coordinador") {
    return NextResponse.json({ error: "Solo administradores o coordinadores pueden reabrir" }, { status: 403 })
  }

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
  if (!orden.cierre) {
    return NextResponse.json({ error: "La orden no está cerrada" }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const comentario = typeof body?.comentario === "string" ? body.comentario : null

  const ESTADO_ABIERTA = 1
  const SUBESTADO_REAPERTURA = 7 // "Orden reabierta" placeholder sub-estado

  const [updated] = await prisma.$transaction([
    prisma.orden.update({
      where: { id },
      data: {
        idEstado: ESTADO_ABIERTA,
        idCerrador: null,
        cierre: null,
        observacionesCierre: null,
      },
    }),
    prisma.ordenCambio.create({
      data: {
        idOrden: id,
        idSubEstado: SUBESTADO_REAPERTURA,
        idCreador: userId,
        comentario,
      },
    }),
  ])

  return NextResponse.json(updated)
}
