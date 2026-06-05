import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { visitaUpdateSchema, visitaEstadoTransicionSchema } from "@/lib/validations/visitas"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

async function getVisitaWithAccess(id: number, sedeIds: number[] | "all") {
  const visita = await prisma.visita.findUnique({
    where: { id },
    include: {
      orden: { select: { solicitud: { select: { equipo: { select: { idSede: true } } } } } },
    },
  })
  if (!visita) return null
  if (sedeIds !== "all" && !sedeIds.includes(visita.orden.solicitud.equipo.idSede)) return null
  return visita
}

/** GET /api/visitas/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  const accessible = await getVisitaWithAccess(id, sedeIds)
  if (!accessible) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const visita = await prisma.visita.findUnique({
    where: { id },
    include: {
      estado: true,
      ejecutador: { select: { id: true, nombre: true } },
      orden: {
        include: {
          estado: { select: { estado: true } },
          solicitud: {
            include: {
              servicio: true,
              equipo: {
                include: {
                  sede: { include: { cliente: { select: { id: true, nombre: true } } } },
                  modelo: { include: { marca: true } },
                },
              },
            },
          },
        },
      },
      actividadesEjecutadas: {
        include: { protocolo: true, resultados: { include: { campo: true } } },
      },
    },
  })

  return NextResponse.json(visita)
}

/** PATCH /api/visitas/[id] — update fields (not estado transition) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  const accessible = await getVisitaWithAccess(id, sedeIds)
  if (!accessible) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const body = await req.json()
  const parsed = visitaUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const data: Record<string, unknown> = {}
  if (parsed.data.idEjecutador !== undefined) data.idEjecutador = parsed.data.idEjecutador
  if (parsed.data.fechaProgramada !== undefined)
    data.fechaProgramada = parsed.data.fechaProgramada ? new Date(parsed.data.fechaProgramada) : null
  if (parsed.data.fechaInicio !== undefined)
    data.fechaInicio = parsed.data.fechaInicio ? new Date(parsed.data.fechaInicio) : null
  if (parsed.data.fechaCierre !== undefined)
    data.fechaCierre = parsed.data.fechaCierre ? new Date(parsed.data.fechaCierre) : null
  if (parsed.data.duracion !== undefined) data.duracion = parsed.data.duracion
  if (parsed.data.observacionesCierre !== undefined) data.observacionesCierre = parsed.data.observacionesCierre
  if (parsed.data.motivoRechazo !== undefined) data.motivoRechazo = parsed.data.motivoRechazo

  const updated = await prisma.visita.update({ where: { id }, data })
  return NextResponse.json(updated)
}

/** DELETE /api/visitas/[id] — soft delete (activo = false), admin only */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role
  if (rol !== "administrador") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const id = parseInt(params.id)
  await prisma.visita.update({ where: { id }, data: { activo: false } })
  return new Response(null, { status: 204 })
}
