import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextResponse } from "next/server"

/**
 * GET /api/dashboard/charts
 *
 * Returns four chart data sets:
 * - ordenesPorMes:         last 12 months, { mes, total }[]
 * - distribucionServicios: by servicio name, { tipo, total }[]
 * - topEquipos:            top 5 equipos with most orders, { equipo, total }[]
 * - disponibilidad:        { disponibles, enMantenimiento, inactivos }
 *
 * Uses raw SQL where joins across relations are needed.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  // Safe: sedeIds values are integers sourced from the database, never user input
  const sedeClause =
    sedeIds !== "all" && (sedeIds as number[]).length > 0
      ? `AND e.id_sede IN (${(sedeIds as number[]).join(",")})`
      : sedeIds !== "all" && (sedeIds as number[]).length === 0
      ? "AND 1=0" // no sedes → no results
      : "" // all

  const hace12Meses = new Date()
  hace12Meses.setMonth(hace12Meses.getMonth() - 12)

  const [rawMeses, rawServicios, rawEquipos, rawDisp] = await Promise.all([
    // Orders per month (joined through solicitud → equipo for scope)
    prisma.$queryRawUnsafe<{ mes: string; total: bigint }[]>(
      `SELECT DATE_FORMAT(o.creacion, '%Y-%m') AS mes, COUNT(*) AS total
       FROM ordenes o
       JOIN solicitudes s ON s.id = o.id_solicitud
       JOIN equipos e ON e.id = s.id_equipo
       WHERE o.creacion >= ? ${sedeClause}
       GROUP BY mes ORDER BY mes`,
      hace12Meses
    ),
    // Distribution by service name
    prisma.$queryRawUnsafe<{ tipo: string; total: bigint }[]>(
      `SELECT sv.servicio AS tipo, COUNT(*) AS total
       FROM ordenes o
       JOIN solicitudes s ON s.id = o.id_solicitud
       JOIN equipos e ON e.id = s.id_equipo
       JOIN servicios sv ON sv.id = s.id_servicio
       WHERE o.creacion >= ? ${sedeClause}
       GROUP BY sv.id ORDER BY total DESC`,
      hace12Meses
    ),
    // Top 5 equipos by order count
    prisma.$queryRawUnsafe<{ idEquipo: number; total: bigint }[]>(
      `SELECT s.id_equipo AS idEquipo, COUNT(*) AS total
       FROM ordenes o
       JOIN solicitudes s ON s.id = o.id_solicitud
       JOIN equipos e ON e.id = s.id_equipo
       WHERE o.creacion >= ? ${sedeClause}
       GROUP BY s.id_equipo ORDER BY total DESC LIMIT 5`,
      hace12Meses
    ),
    // Equipment availability (activo + mtto flags)
    prisma.$queryRawUnsafe<{ disponibles: bigint; enMantenimiento: bigint; inactivos: bigint }[]>(
      `SELECT
         SUM(CASE WHEN e.activo = 1 AND e.mtto = 0 THEN 1 ELSE 0 END) AS disponibles,
         SUM(CASE WHEN e.mtto = 1 THEN 1 ELSE 0 END) AS enMantenimiento,
         SUM(CASE WHEN e.activo = 0 THEN 1 ELSE 0 END) AS inactivos
       FROM equipos e
       WHERE 1=1 ${sedeClause.replace(" AND e.id_sede", " AND e.id_sede")}`,
    ),
  ])

  // Enrich top-equipo IDs with labels (marca + modelo)
  const equipoIds = rawEquipos.map((r) => Number(r.idEquipo))
  const equipos = await prisma.equipo.findMany({
    where: { id: { in: equipoIds } },
    select: {
      id: true,
      serie: true,
      activoFijo: true,
      modelo: { select: { modelo: true, marca: { select: { marca: true } } } },
    },
  })
  const equipoMap = new Map(
    equipos.map((e) => [
      e.id,
      `${e.modelo.marca.marca} ${e.modelo.modelo}${ e.serie ? ` (${e.serie})` : e.activoFijo ? ` [${e.activoFijo}]` : "" }`,
    ])
  )

  const disp = rawDisp[0] ?? { disponibles: BigInt(0), enMantenimiento: BigInt(0), inactivos: BigInt(0) }

  return NextResponse.json({
    ordenesPorMes: rawMeses.map((r) => ({ mes: r.mes, total: Number(r.total) })),
    distribucionServicios: rawServicios.map((r) => ({
      tipo: r.tipo ?? "Sin clasificar",
      total: Number(r.total),
    })),
    topEquipos: rawEquipos.map((r) => ({
      equipo: equipoMap.get(Number(r.idEquipo)) ?? `Equipo #${r.idEquipo}`,
      total: Number(r.total),
    })),
    disponibilidad: {
      disponibles: Number(disp.disponibles),
      enMantenimiento: Number(disp.enMantenimiento),
      inactivos: Number(disp.inactivos),
    },
  })
}
