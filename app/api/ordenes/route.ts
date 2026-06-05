import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { ordenSchema } from "@/lib/validations/ordenes"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/ordenes — paginated list with scope filter.
 * Scope path: Orden → Solicitud → Equipo → Sede
 * Query params: page, pageSize, idEstado, idSede, q (search on solicitud.aviso)
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
  const idEstado = searchParams.get("idEstado") ? parseInt(searchParams.get("idEstado")!) : undefined
  const idSede = searchParams.get("idSede") ? parseInt(searchParams.get("idSede")!) : undefined
  const q = searchParams.get("q") ?? undefined

  // Scope filter goes through solicitud → equipo → sede
  const sedeFilter =
    sedeIds === "all"
      ? {}
      : { solicitud: { equipo: { idSede: { in: sedeIds } } } }

  const where = {
    ...sedeFilter,
    ...(idEstado ? { idEstado } : {}),
    ...(idSede ? { solicitud: { equipo: { idSede } } } : {}),
    ...(q ? { solicitud: { aviso: { contains: q } } } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.orden.count({ where }),
    prisma.orden.findMany({
      where,
      include: {
        estado: { select: { id: true, estado: true } },
        solicitud: {
          select: {
            id: true,
            aviso: true,
            equipo: {
              select: {
                id: true,
                serie: true,
                activoFijo: true,
                sede: { select: { id: true, nombre: true } },
                modelo: { select: { modelo: true, marca: { select: { marca: true } } } },
              },
            },
          },
        },
        creador: { select: { id: true, nombre: true } },
        _count: { select: { visitas: true } },
      },
      orderBy: { creacion: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/**
 * POST /api/ordenes — create a new Orden from an existing Solicitud.
 * Body: { idSolicitud: number }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const body = await req.json()
  const parsed = ordenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // Verify access: trace solicitud → equipo → sede
  if (sedeIds !== "all") {
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: parsed.data.idSolicitud },
      select: { equipo: { select: { idSede: true } } },
    })
    if (!solicitud || !sedeIds.includes(solicitud.equipo.idSede)) {
      return NextResponse.json({ error: "No autorizado para esta solicitud" }, { status: 403 })
    }
  }

  const orden = await prisma.orden.create({
    data: {
      idSolicitud: parsed.data.idSolicitud,
      idCreador: userId,
      idEstado: 1, // Estado inicial: Abierta (id=1 en ordenes_estados)
    },
  })

  return NextResponse.json(orden, { status: 201 })
}
