import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { equipoUpdateSchema } from "@/lib/validations/equipos"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

async function getEquipoWithAccess(id: number, sedeIds: number[] | "all") {
  const equipo = await prisma.equipo.findUnique({ where: { id }, select: { idSede: true } })
  if (!equipo) return null
  if (sedeIds !== "all" && !sedeIds.includes(equipo.idSede)) return null
  return equipo
}

/** GET /api/equipos/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  const check = await getEquipoWithAccess(id, sedeIds)
  if (!check) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: {
      modelo: { include: { marca: true, clase: true } },
      sede: { include: { cliente: true, municipio: { include: { departamento: true } } } },
      area: true,
      tipo: true,
      solicitudes: {
        orderBy: { creacion: "desc" },
        take: 10,
        include: { estado: true, servicio: true },
      },
    },
  })

  return NextResponse.json(equipo)
}

/** PATCH /api/equipos/[id] */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  if (!["administrador", "coordinador", "analista"].includes(rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const check = await getEquipoWithAccess(id, sedeIds)
  if (!check) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const body = await req.json()
  const parsed = equipoUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // If changing sede, verify access to new sede
  if (parsed.data.idSede && sedeIds !== "all" && !sedeIds.includes(parsed.data.idSede)) {
    return NextResponse.json({ error: "No autorizado para la sede destino" }, { status: 403 })
  }

  const equipo = await prisma.equipo.update({ where: { id }, data: parsed.data })
  return NextResponse.json(equipo)
}

/** DELETE /api/equipos/[id] — soft delete, admin only */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden desactivar equipos" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const equipo = await prisma.equipo.update({ where: { id }, data: { activo: false } })
  return NextResponse.json(equipo)
}
