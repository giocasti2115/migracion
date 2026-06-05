import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { solicitudUpdateSchema } from "@/lib/validations/solicitudes"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/** Fetch a solicitud and verify the current user's scope grants access via equipo → sede */
async function getSolicitudWithAccess(id: number, sedeIds: number[] | "all") {
  const sol = await prisma.solicitud.findUnique({
    where: { id },
    include: { equipo: { select: { idSede: true } } },
  })
  if (!sol) return null
  if (sedeIds !== "all" && !sedeIds.includes(sol.equipo.idSede)) return null
  return sol
}

/** GET /api/solicitudes/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  const sol = await getSolicitudWithAccess(id, sedeIds)
  if (!sol) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const full = await prisma.solicitud.findUnique({
    where: { id },
    include: {
      estado: true,
      equipo: {
        include: {
          sede: true,
          modelo: { include: { marca: true } },
        },
      },
      creador: { select: { id: true, nombre: true } },
      ordenes: {
        select: { id: true, creacion: true, cierre: true, estado: { select: { estado: true } } },
        orderBy: { creacion: "desc" },
      },
    },
  })

  return NextResponse.json(full)
}

/** PATCH /api/solicitudes/[id] */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  const sol = await getSolicitudWithAccess(id, sedeIds)
  if (!sol) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const body = await req.json()
  const parsed = solicitudUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const updated = await prisma.solicitud.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

/** DELETE /api/solicitudes/[id] — only administradores */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role
  if (rol !== "administrador") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const id = parseInt(params.id)
  await prisma.solicitud.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
