import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextResponse } from "next/server"

/**
 * GET /api/dashboard/mapa
 *
 * Returns orders grouped by departamento for the last 12 months,
 * with DANE codes so the Colombia heatmap can colour each department.
 *
 * Response shape:
 * [{ codigoDane: "05", departamento: "Antioquia", total: 42 }, ...]
 *
 * Task 3.3 — Requirement 3.2
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"

  const sedeIds = await getSedesRelacionadas(userId, rol)

  const hace12Meses = new Date()
  hace12Meses.setMonth(hace12Meses.getMonth() - 12)

  // Build an IN clause for the sede filter
  const sedeWhere =
    sedeIds === "all" ? "" : `AND s.id IN (${(sedeIds as number[]).join(",")})`

  // Raw SQL: ordenes → solicitudes → equipos → sedes → municipios → departamentos
  const rows = await prisma.$queryRawUnsafe<
    { codigo_dane: string; departamento: string; total: bigint }[]
  >(
    `
    SELECT d.codigo AS codigo_dane,
           d.nombre AS departamento,
           COUNT(o.id) AS total
    FROM   ordenes o
    JOIN   solicitudes sol ON sol.id = o.id_solicitud
    JOIN   equipos     e   ON e.id  = sol.id_equipo
    JOIN   sedes       s   ON s.id  = e.id_sede
    JOIN   municipios  m   ON m.id  = s.id_municipio
    JOIN   departamentos d ON d.id  = m.id_departamento
    WHERE  o.creacion >= ?
    AND    d.codigo IS NOT NULL
    ${sedeWhere}
    GROUP  BY d.id, d.codigo, d.nombre
    ORDER  BY total DESC
    `,
    hace12Meses
  )

  const data = rows.map((r: { codigo_dane: string; departamento: string; total: bigint }) => ({
    codigoDane: r.codigo_dane,
    departamento: r.departamento,
    total: Number(r.total),
  }))

  return NextResponse.json(data)
}
