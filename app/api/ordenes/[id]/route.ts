import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { ordenUpdateSchema } from "@/lib/validations/ordenes"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/** Fetch an orden and verify the current user has scope access via solicitud → equipo → sede */
async function getOrdenWithAccess(id: number, sedeIds: number[] | "all") {
  const orden = await prisma.orden.findUnique({
    where: { id },
    include: { solicitud: { select: { equipo: { select: { idSede: true } } } } },
  })
  if (!orden) return null
  if (sedeIds !== "all" && !sedeIds.includes(orden.solicitud.equipo.idSede)) return null
  return orden
}

/** GET /api/ordenes/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  const accessible = await getOrdenWithAccess(id, sedeIds)
  if (!accessible) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const orden = await prisma.orden.findUnique({
    where: { id },
    include: {
      estado: true,
      solicitud: {
        include: {
          servicio: true,
          equipo: {
            include: {
              sede: { include: { cliente: { select: { id: true, nombre: true } } } },
              modelo: { include: { marca: true, clase: true } },
              area: true,
              tipo: true,
            },
          },
          creador: { select: { id: true, nombre: true } },
        },
      },
      creador: { select: { id: true, nombre: true } },
      cerrador: { select: { id: true, nombre: true } },
      accionFalla: true,
      visitas: {
        include: { estado: true, ejecutador: { select: { id: true, nombre: true } } },
        where: { activo: true },
        orderBy: { fechaInicio: "desc" },
      },
      cambios: {
        include: { subEstado: true, creador: { select: { id: true, nombre: true } } },
        orderBy: { fecha: "desc" },
      },
      adjuntos: { where: { activo: true } },
      cotizaciones: {
        select: { id: true, creacion: true, estado: { select: { estado: true } } },
        orderBy: { creacion: "desc" },
      },
    },
  })

  return NextResponse.json(orden)
}

/** PATCH /api/ordenes/[id] */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  const accessible = await getOrdenWithAccess(id, sedeIds)
  if (!accessible) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const body = await req.json()
  const parsed = ordenUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const updated = await prisma.orden.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

/** DELETE /api/ordenes/[id] — only administradores */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role
  if (rol !== "administrador") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const id = parseInt(params.id)
  await prisma.orden.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
