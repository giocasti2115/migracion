import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { visitaSchema } from "@/lib/validations/visitas"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/visitas — paginated list with scope filter
 * Scope path: Visita → Orden → Solicitud → Equipo → Sede
 * Query params: page, pageSize, idEstado, idEjecutador
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
  const idEjecutador = searchParams.get("idEjecutador") ? parseInt(searchParams.get("idEjecutador")!) : undefined

  const sedeFilter =
    sedeIds === "all"
      ? {}
      : { orden: { solicitud: { equipo: { idSede: { in: sedeIds } } } } }

  const where = {
    activo: true,
    ...sedeFilter,
    ...(idEstado ? { idEstado } : {}),
    ...(idEjecutador ? { idEjecutador } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.visita.count({ where }),
    prisma.visita.findMany({
      where,
      include: {
        estado: { select: { id: true, estado: true } },
        ejecutador: { select: { id: true, nombre: true } },
        orden: {
          select: {
            id: true,
            solicitud: {
              select: {
                equipo: {
                  select: {
                    sede: { select: { id: true, nombre: true } },
                    modelo: { select: { modelo: true, marca: { select: { marca: true } } } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { fechaProgramada: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/**
 * POST /api/visitas — create a new Visita for an Orden
 * Body: { idOrden, idEjecutador?, fechaProgramada? }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const body = await req.json()
  const parsed = visitaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // Verify access via orden → solicitud → equipo → sede
  if (sedeIds !== "all") {
    const orden = await prisma.orden.findUnique({
      where: { id: parsed.data.idOrden },
      select: { solicitud: { select: { equipo: { select: { idSede: true } } } } },
    })
    if (!orden || !sedeIds.includes(orden.solicitud.equipo.idSede)) {
      return NextResponse.json({ error: "No autorizado para esta orden" }, { status: 403 })
    }
  }

  const visita = await prisma.visita.create({
    data: {
      idOrden: parsed.data.idOrden,
      idEstado: 1, // Estado inicial: Pendiente
      idEjecutador: parsed.data.idEjecutador ?? null,
      fechaProgramada: parsed.data.fechaProgramada ? new Date(parsed.data.fechaProgramada) : null,
    },
  })

  return NextResponse.json(visita, { status: 201 })
}
