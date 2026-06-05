import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { solicitudSchema } from "@/lib/validations/solicitudes"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/solicitudes — paginated list with scope filter
 * Scope: Solicitud → Equipo → Sede
 * Query params: page, pageSize, idEstado, idSede, q (search on aviso/observacion)
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
  const sinOrden = searchParams.get("sinOrden") === "true"

  // Scope filter goes through equipo → sede
  const sedeFilter =
    sedeIds === "all"
      ? {}
      : { equipo: { idSede: { in: sedeIds } } }

  const where = {
    ...sedeFilter,
    ...(idEstado ? { idEstado } : {}),
    ...(idSede ? { equipo: { idSede } } : {}),
    ...(sinOrden ? { ordenes: { none: {} } } : {}),
    ...(q
      ? {
          OR: [
            { aviso: { contains: q } },
            { observacion: { contains: q } },
          ],
        }
      : {}),
  }

  const [total, items] = await Promise.all([
    prisma.solicitud.count({ where }),
    prisma.solicitud.findMany({
      where,
      include: {
        estado: { select: { id: true, estado: true } },
        servicio: { select: { id: true, servicio: true } },
        equipo: {
          select: {
            id: true,
            serie: true,
            activoFijo: true,
            sede: { select: { id: true, nombre: true } },
            modelo: { select: { id: true, modelo: true, marca: { select: { marca: true } } } },
          },
        },
        creador: { select: { id: true, nombre: true } },
      },
      orderBy: { creacion: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/**
 * POST /api/solicitudes — create a new solicitud
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const body = await req.json()
  const parsed = solicitudSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // Verify user has access to the equipo's sede
  if (sedeIds !== "all") {
    const equipo = await prisma.equipo.findUnique({
      where: { id: parsed.data.idEquipo },
      select: { idSede: true },
    })
    if (!equipo || !sedeIds.includes(equipo.idSede)) {
      return NextResponse.json({ error: "No autorizado para este equipo" }, { status: 403 })
    }
  }

  const solicitud = await prisma.solicitud.create({
    data: {
      aviso: parsed.data.aviso ?? null,
      observacion: parsed.data.observacion ?? null,
      idEquipo: parsed.data.idEquipo,
      idServicio: parsed.data.idServicio,
      idCreador: userId,
      idEstado: 1, // Estado inicial: Pendiente (id=1 en solicitudes_estados)
    },
  })

  return NextResponse.json(solicitud, { status: 201 })
}
