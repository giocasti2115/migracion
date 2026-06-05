import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { informeIndicadoresSchema } from "@/lib/validations/informes"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/informes/indicadores
 * Returns aggregate KPIs:
 *  - totalOrdenes, ordenesCerradas, ordenesAbiertas
 *  - promedioTiempoCierreHoras (avg time from creacion to cierre)
 *  - totalVisitas, visitasCerradas
 *  - desglose: array of { label, total, cerradas } grouped by month/sede/tecnico
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const { searchParams } = req.nextUrl
  const rawDesde = searchParams.get("desde")
  const rawHasta = searchParams.get("hasta")

  if (!rawDesde || !rawHasta) {
    return NextResponse.json({ error: "Los parámetros 'desde' y 'hasta' son requeridos" }, { status: 400 })
  }

  const parsed = informeIndicadoresSchema.safeParse({
    desde: rawDesde,
    hasta: rawHasta,
    idCliente: searchParams.get("idCliente") ? parseInt(searchParams.get("idCliente")!) : undefined,
    agruparPor: searchParams.get("agruparPor") ?? "mes",
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const { desde, hasta, idCliente, agruparPor } = parsed.data

  const sedeCondition = sedeIds === "all" ? {} : {
    solicitud: { equipo: { idSede: { in: sedeIds } } },
  }
  const clienteCondition = idCliente
    ? { solicitud: { equipo: { sede: { idCliente } } } }
    : {}

  const dateFilter = { creacion: { gte: new Date(desde), lte: new Date(hasta) } }

  const [ordenes, visitas] = await Promise.all([
    prisma.orden.findMany({
      where: { AND: [sedeCondition, clienteCondition, dateFilter] },
      include: {
        estado: true,
        solicitud: {
          include: {
            equipo: {
              include: { sede: { include: { cliente: true } } },
            },
          },
        },
        visitas: {
          include: { ejecutador: { select: { id: true, nombre: true } } },
        },
      },
    }),
    prisma.visita.findMany({
      where: {
        AND: [
          sedeIds === "all"
            ? {}
            : { orden: { solicitud: { equipo: { idSede: { in: sedeIds } } } } },
          ...(idCliente
            ? [{ orden: { solicitud: { equipo: { sede: { idCliente } } } } }]
            : []),
          { fechaInicio: { gte: new Date(desde), lte: new Date(hasta) } },
        ],
      },
      include: { estado: true },
    }),
  ])

  // Aggregate
  const ordenesCerradas = ordenes.filter((o) => o.cierre !== null)
  const totalTiempoMs = ordenesCerradas
    .filter((o) => o.cierre)
    .reduce((acc, o) => acc + (o.cierre!.getTime() - o.creacion.getTime()), 0)
  const promedioTiempoCierreHoras =
    ordenesCerradas.length > 0
      ? Math.round(totalTiempoMs / ordenesCerradas.length / 3600000)
      : null

  // Build desglose
  const desgloseMap: Record<string, { label: string; total: number; cerradas: number }> = {}

  for (const orden of ordenes) {
    let label = ""
    if (agruparPor === "mes") {
      const d = orden.creacion
      label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    } else if (agruparPor === "sede") {
      label = orden.solicitud.equipo.sede.nombre
    } else if (agruparPor === "tecnico") {
      const tec = orden.visitas[0]?.ejecutador
      label = tec ? tec.nombre : "Sin técnico"
    } else {
      // tipo_servicio — not available (no tipoServicio field), fallback to sede
      label = orden.solicitud.equipo.sede.nombre
    }
    if (!desgloseMap[label]) desgloseMap[label] = { label, total: 0, cerradas: 0 }
    desgloseMap[label].total += 1
    if (orden.cierre) desgloseMap[label].cerradas += 1
  }

  return NextResponse.json({
    totalOrdenes: ordenes.length,
    ordenesCerradas: ordenesCerradas.length,
    ordenesAbiertas: ordenes.length - ordenesCerradas.length,
    promedioTiempoCierreHoras,
    totalVisitas: visitas.length,
    visitasCerradas: visitas.filter((v) => v.estado.estado === "Cerrada").length,
    desglose: Object.values(desgloseMap).sort((a, b) => a.label.localeCompare(b.label)),
  })
}
