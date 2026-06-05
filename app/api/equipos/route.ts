import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas, buildSedeFilter } from "@/lib/data-scope-filter"
import { equipoSchema } from "@/lib/validations/equipos"
import { NextRequest, NextResponse } from "next/server"

/** GET /api/equipos */
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
  const idSede = searchParams.get("idSede") ? parseInt(searchParams.get("idSede")!) : undefined
  const idModelo = searchParams.get("idModelo") ? parseInt(searchParams.get("idModelo")!) : undefined
  const soloActivos = searchParams.get("activo") !== "false"

  const sedeFilter = buildSedeFilter(sedeIds)

  const where: Record<string, unknown> = {
    ...sedeFilter,
    activo: soloActivos ? true : undefined,
    ...(idSede ? { idSede } : {}),
    ...(idModelo ? { idModelo } : {}),
    ...(q
      ? {
          OR: [
            { serie: { contains: q } },
            { activoFijo: { contains: q } },
            { ubicacion: { contains: q } },
            { modelo: { modelo: { contains: q } } },
            { modelo: { marca: { marca: { contains: q } } } },
          ],
        }
      : {}),
  }

  const [total, items] = await Promise.all([
    prisma.equipo.count({ where }),
    prisma.equipo.findMany({
      where,
      include: {
        modelo: { include: { marca: true, clase: true } },
        sede: { include: { cliente: true } },
        area: true,
        tipo: true,
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/** POST /api/equipos */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  // Only admin/coordinador/analista can create equipos
  if (!["administrador", "coordinador", "analista"].includes(rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = equipoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // Verify access to the target sede
  if (sedeIds !== "all" && !sedeIds.includes(parsed.data.idSede)) {
    return NextResponse.json({ error: "No autorizado para esta sede" }, { status: 403 })
  }

  const equipo = await prisma.equipo.create({
    data: {
      idModelo: parsed.data.idModelo,
      idSede: parsed.data.idSede,
      idArea: parsed.data.idArea ?? null,
      idTipo: parsed.data.idTipo ?? null,
      serie: parsed.data.serie ?? null,
      activoFijo: parsed.data.activoFijo ?? null,
      ubicacion: parsed.data.ubicacion ?? null,
      mtto: parsed.data.mtto ?? false,
    },
  })

  return NextResponse.json(equipo, { status: 201 })
}
