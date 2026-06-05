import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { visitaEstadoTransicionSchema } from "@/lib/validations/visitas"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/**
 * Valid state machine transitions (ids from visitas_estados):
 *  1 Pendiente  → 2 Aprobada
 *  2 Aprobada   → 3 Abierta (opened/in-progress)
 *  3 Abierta    → 4 Cerrada
 *  1 | 2 | 3   → 5 Rechazada (requires motivoRechazo, max 500 chars)
 */
const VALID_TRANSITIONS: Record<number, number[]> = {
  1: [2, 5],
  2: [3, 5],
  3: [4, 5],
}

/**
 * POST /api/visitas/[id]/estado
 * Body: { idEstado, motivoRechazo?, observacionesCierre? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  const visita = await prisma.visita.findUnique({
    where: { id },
    include: {
      orden: { select: { solicitud: { select: { equipo: { select: { idSede: true } } } } } },
    },
  })

  if (!visita) return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 })
  if (sedeIds !== "all" && !sedeIds.includes(visita.orden.solicitud.equipo.idSede)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = visitaEstadoTransicionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const { idEstado: targetEstado, motivoRechazo, observacionesCierre } = parsed.data
  const currentEstado = visita.idEstado

  // Validate state machine
  const allowed = VALID_TRANSITIONS[currentEstado] ?? []
  if (!allowed.includes(targetEstado)) {
    return NextResponse.json(
      {
        error: `Transición inválida: estado actual ${currentEstado} no puede transicionar a ${targetEstado}`,
        allowedTransitions: allowed,
      },
      { status: 409 }
    )
  }

  // Estado 5 = Rechazada — requires motivoRechazo
  if (targetEstado === 5 && !motivoRechazo?.trim()) {
    return NextResponse.json({ error: "motivoRechazo es requerido al rechazar" }, { status: 422 })
  }

  // observacionesCierre max 1000 chars
  if (observacionesCierre && observacionesCierre.length > 1000) {
    return NextResponse.json({ error: "observacionesCierre supera 1000 caracteres" }, { status: 422 })
  }

  const data: Record<string, unknown> = { idEstado: targetEstado }

  // Estado 3 (Abierta) = set fechaInicio
  if (targetEstado === 3) data.fechaInicio = new Date()

  // Estado 4 (Cerrada) = set fechaCierre + observacionesCierre
  if (targetEstado === 4) {
    data.fechaCierre = new Date()
    if (observacionesCierre) data.observacionesCierre = observacionesCierre
    if (visita.fechaInicio) {
      const mins = Math.round((Date.now() - new Date(visita.fechaInicio).getTime()) / 60000)
      if (mins > 0) data.duracion = mins
    }
  }

  // Estado 5 (Rechazada) = set motivoRechazo
  if (targetEstado === 5 && motivoRechazo) {
    data.motivoRechazo = motivoRechazo
  }

  const updated = await prisma.visita.update({ where: { id }, data })
  return NextResponse.json(updated)
}
