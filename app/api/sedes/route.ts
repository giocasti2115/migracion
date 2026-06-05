import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas, buildSedeFilter } from "@/lib/data-scope-filter"
import { sedeSchema } from "@/lib/validations/sedes"
import { NextRequest, NextResponse } from "next/server"

/** GET /api/sedes */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
  const q = searchParams.get("q") ?? ""
  const idCliente = searchParams.get("idCliente") ? parseInt(searchParams.get("idCliente")!) : undefined
  const soloActivos = searchParams.get("activo") !== "false"

  const sedeFilter = buildSedeFilter(sedeIds)

  const where: Record<string, unknown> = {
    ...sedeFilter,
    ...(soloActivos ? { activo: true } : {}),
    ...(idCliente ? { idCliente } : {}),
    ...(q ? { nombre: { contains: q } } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.sede.count({ where }),
    prisma.sede.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true } },
        municipio: { include: { departamento: { select: { id: true, nombre: true } } } },
        _count: { select: { equipos: true } },
      },
      orderBy: { nombre: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/** POST /api/sedes — admin only */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden crear sedes" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = sedeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const sede = await prisma.sede.create({ data: parsed.data })
  return NextResponse.json(sede, { status: 201 })
}
