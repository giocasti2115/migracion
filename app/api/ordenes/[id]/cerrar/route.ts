import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { cerrarOrdenSchema } from "@/lib/validations/ordenes"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/**
 * POST /api/ordenes/[id]/cerrar
 *
 * Closes an Orden:
 * - Validates the orden is not already closed or cancelled
 * - Sets cierre = now(), idCerrador, observacionesCierre, idAccionesFalla, idsFallaModos, etc.
 * - Updates idEstado to the "closed" state (id = 3 in ordenes_estados)
 * - Records an OrdenCambio entry
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)

  // Verify access via solicitud → equipo → sede
  const orden = await prisma.orden.findUnique({
    where: { id },
    include: {
      estado: true,
      solicitud: { select: { equipo: { select: { idSede: true } } } },
    },
  })

  if (!orden) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
  if (sedeIds !== "all" && !sedeIds.includes(orden.solicitud.equipo.idSede)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // Prevent closing an already-closed or cancelled orden
  if (orden.cierre) {
    return NextResponse.json({ error: "La orden ya está cerrada" }, { status: 409 })
  }

  const body = await req.json()
  const parsed = cerrarOrdenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const { observacionesCierre, nombreRecibe, cedulaRecibe, solicitarDadoBaja, total, idAccionesFalla, idsFallaModos } =
    parsed.data

  // Estado "Cerrada" = id 3 in legacy ordenes_estados
  const ESTADO_CERRADA = 3
  // Sub-estado for closing = depends on legacy data; use sub-estado 6 (Orden cerrada) as placeholder
  const SUBESTADO_CIERRE = 6

  const [updated] = await prisma.$transaction([
    prisma.orden.update({
      where: { id },
      data: {
        idEstado: ESTADO_CERRADA,
        idCerrador: userId,
        cierre: new Date(),
        observacionesCierre: observacionesCierre ?? null,
        nombreRecibe: nombreRecibe ?? null,
        cedulaRecibe: cedulaRecibe ?? null,
        solicitarDadoBaja: solicitarDadoBaja ?? false,
        total: total != null ? total : null,
        idAccionesFalla: idAccionesFalla ?? null,
        idsFallaModos: idsFallaModos ?? null,
      },
    }),
    prisma.ordenCambio.create({
      data: {
        idOrden: id,
        idSubEstado: SUBESTADO_CIERRE,
        idCreador: userId,
        comentario: observacionesCierre ?? null,
      },
    }),
  ])

  return NextResponse.json(updated)
}
