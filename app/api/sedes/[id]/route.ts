import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { sedeUpdateSchema } from "@/lib/validations/sedes"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/** GET /api/sedes/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  if (sedeIds !== "all" && !sedeIds.includes(id)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const sede = await prisma.sede.findUnique({
    where: { id },
    include: {
      cliente: true,
      municipio: { include: { departamento: true } },
      equipos: {
        where: { activo: true },
        include: { modelo: { include: { marca: true } } },
        orderBy: { id: "desc" },
        take: 20,
      },
      _count: { select: { equipos: true, vsUsuarios: true } },
    },
  })

  if (!sede) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(sede)
}

/** PATCH /api/sedes/[id] — admin only */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const body = await req.json()
  const parsed = sedeUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const sede = await prisma.sede.update({ where: { id }, data: parsed.data })
  return NextResponse.json(sede)
}

/** DELETE /api/sedes/[id] — soft delete, admin only */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden desactivar sedes" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const sede = await prisma.sede.update({ where: { id }, data: { activo: false } })
  return NextResponse.json(sede)
}
