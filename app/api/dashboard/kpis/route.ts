import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextResponse } from "next/server"

/**
 * GET /api/dashboard/kpis
 *
 * Returns four KPI counters scoped to the current user's allowed sedes:
 * - ordenesAbiertas       (idEstado != closed — assumed id 3)
 * - solicitudesPendientes (idEstado = 1: Pendiente)
 * - visitasHoy            (fechaProgramada = today)
 * - cotizacionesActivas   (estado Borrador or Enviada)
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"

  const sedeIds = await getSedesRelacionadas(userId, rol)
  const sedeNested = sedeIds === "all" ? undefined : { in: sedeIds as number[] }

  const hoyStart = new Date()
  hoyStart.setHours(0, 0, 0, 0)
  const hoyEnd = new Date()
  hoyEnd.setHours(23, 59, 59, 999)

  // Scope helpers
  const ordenScope = sedeNested
    ? { solicitud: { equipo: { idSede: sedeNested } } }
    : {}
  const solicitudScope = sedeNested
    ? { equipo: { idSede: sedeNested } }
    : {}
  const visitaScope = sedeNested
    ? { orden: { solicitud: { equipo: { idSede: sedeNested } } } }
    : {}
  const cotizacionScope = sedeNested
    ? { cliente: { sedes: { some: { id: sedeNested } } } }
    : {}

  const [ordenesAbiertas, solicitudesPendientes, visitasHoy, cotizacionesActivas] =
    await Promise.all([
      prisma.orden.count({
        where: { ...ordenScope, idEstado: { not: 3 } },
      }),
      prisma.solicitud.count({
        where: { ...solicitudScope, idEstado: 1 },
      }),
      prisma.visita.count({
        where: {
          ...visitaScope,
          fechaProgramada: { gte: hoyStart, lte: hoyEnd },
          activo: true,
        },
      }),
      prisma.cotizacion.count({
        where: {
          ...cotizacionScope,
          estado: { estado: { in: ["Borrador", "Enviada"] } },
        },
      }),
    ])

  return NextResponse.json({
    ordenesAbiertas,
    solicitudesPendientes,
    visitasHoy,
    cotizacionesActivas,
  })
}
