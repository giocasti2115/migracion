import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { informeRepuestosSchema } from "@/lib/validations/informes"
import { generateExcelBlob } from "@/lib/export/excel-server"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/informes/repuestos
 * Returns CotizacionRepuesto items in the given date range,
 * grouped by repuesto with total quantity and value.
 * Optionally filtered by idSede or idRepuesto.
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

  const parsed = informeRepuestosSchema.safeParse({
    desde: rawDesde,
    hasta: rawHasta,
    idSede: searchParams.get("idSede") ? parseInt(searchParams.get("idSede")!) : undefined,
    idRepuesto: searchParams.get("idRepuesto") ? parseInt(searchParams.get("idRepuesto")!) : undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const { desde, hasta, idSede, idRepuesto } = parsed.data

  // Scope by cliente via sedes
  let clienteIds: number[] | undefined
  if (sedeIds !== "all") {
    const scopeSedes = await prisma.sede.findMany({
      where: { id: { in: sedeIds } },
      select: { idCliente: true },
    })
    clienteIds = scopeSedes.map((s) => s.idCliente)
  }

  const sedeClienteFilter = clienteIds ? { cotizacion: { idCliente: { in: clienteIds } } } : {}
  const sedeFilter = idSede
    ? { cotizacion: { orden: { solicitud: { equipo: { idSede } } } } }
    : {}

  const items = await prisma.cotizacionRepuesto.findMany({
    where: {
      AND: [
        sedeClienteFilter,
        sedeFilter,
        ...(idRepuesto ? [{ idRepuesto }] : []),
        { cotizacion: { creacion: { gte: new Date(desde), lte: new Date(hasta) } } },
      ],
    },
    include: {
      repuesto: true,
      cotizacion: {
        include: {
          cliente: { select: { id: true, nombre: true } },
          estado: true,
        },
      },
    },
    orderBy: { cotizacion: { creacion: "desc" } },
  })

  // Group by repuesto
  const grouped: Record<
    number,
    { repuesto: { id: number; nombre: string }; cantidad: number; valorTotal: number; lineas: number }
  > = {}
  for (const item of items) {
    const key = item.idRepuesto
    if (!grouped[key]) {
      grouped[key] = { repuesto: item.repuesto, cantidad: 0, valorTotal: 0, lineas: 0 }
    }
    grouped[key].cantidad += item.cantidad
    grouped[key].valorTotal += Number(item.valor) * item.cantidad
    grouped[key].lineas += 1
  }

  if (searchParams.get("format") === "xlsx") {
    const rows = items.map((item) => ({
      ID: item.id,
      Repuesto: item.repuesto.nombre,
      Cantidad: item.cantidad,
      "Valor unitario": Number(item.valor),
      "Valor total": Number(item.valor) * item.cantidad,
      Cliente: item.cotizacion.cliente?.nombre ?? "",
      "Fecha cotización": item.cotizacion.creacion.toISOString().split("T")[0],
    }))
    const blob = generateExcelBlob({ name: "Repuestos", data: rows })
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="repuestos.xlsx"`,
      },
    })
  }

  return NextResponse.json({
    total: items.length,
    items,
    resumen: Object.values(grouped).sort((a, b) => b.valorTotal - a.valorTotal),
  })
}
