import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { informeCorrectivosSchema } from "@/lib/validations/informes"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/informes/correctivos
 * Returns closed órdenes (estado = "Cerrada") in the given date range,
 * filtered by the user's sede scope and optional idCliente/idSede/idTecnico.
 *
 * Query params: desde, hasta, idCliente?, idSede?, idTecnico?, estado
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

  const parsed = informeCorrectivosSchema.safeParse({
    desde: rawDesde,
    hasta: rawHasta,
    idCliente: searchParams.get("idCliente") ? parseInt(searchParams.get("idCliente")!) : undefined,
    idSede: searchParams.get("idSede") ? parseInt(searchParams.get("idSede")!) : undefined,
    idTecnico: searchParams.get("idTecnico") ? parseInt(searchParams.get("idTecnico")!) : undefined,
    estado: searchParams.get("estado") ?? "todas",
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const { desde, hasta, idCliente, idSede, idTecnico, estado } = parsed.data

  // Build scope: nested sede filter
  const sedeCondition = sedeIds === "all" ? {} : {
    solicitud: { equipo: { idSede: { in: sedeIds } } },
  }

  // Optional extra filters
  const extraConditions: Record<string, unknown>[] = []
  if (idSede) {
    extraConditions.push({ solicitud: { equipo: { idSede } } })
  }
  if (idCliente) {
    extraConditions.push({ solicitud: { equipo: { sede: { idCliente } } } })
  }
  if (idTecnico) {
    extraConditions.push({ visitas: { some: { idEjecutador: idTecnico } } })
  }

  // Estado filter: look up OrdenEstado
  let estadoFilter: Record<string, unknown> = {}
  if (estado === "abiertas") {
    estadoFilter = { estado: { estado: { not: "Cerrada" } } }
  } else if (estado === "cerradas") {
    estadoFilter = { estado: { estado: "Cerrada" } }
  }

  const ordenes = await prisma.orden.findMany({
    where: {
      AND: [
        sedeCondition,
        ...extraConditions,
        estadoFilter,
        { creacion: { gte: new Date(desde), lte: new Date(hasta) } },
      ],
    },
    include: {
      estado: true,
      solicitud: {
        include: {
          servicio: true,
          equipo: {
            include: {
              modelo: { include: { marca: true } },
              sede: { include: { cliente: true } },
            },
          },
        },
      },
      creador: { select: { id: true, nombre: true } },
      cerrador: { select: { id: true, nombre: true } },
      visitas: {
        include: { ejecutador: { select: { id: true, nombre: true } } },
        orderBy: { fechaCierre: "desc" },
        take: 1,
      },
    },
    orderBy: { creacion: "desc" },
  })

  return NextResponse.json({ total: ordenes.length, items: ordenes })
}
