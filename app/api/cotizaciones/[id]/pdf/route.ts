import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextRequest, NextResponse } from "next/server"
import { renderCotizacionPDF } from "@/lib/pdf/cotizacion-pdf"

type Params = { params: { id: string } }

/** GET /api/cotizaciones/[id]/pdf — generate and stream PDF for a cotizacion */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      estado: true,
      cliente: true,
      creador: { select: { id: true, nombre: true } },
      cambiador: { select: { id: true, nombre: true } },
      repuestos: {
        include: { repuesto: { select: { id: true, nombre: true } } },
      },
      itemsAdicionales: true,
    },
  })

  if (!cotizacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  // Scope check via client's sedes
  if (sedeIds !== "all") {
    const clienteIds = await prisma.sede
      .findMany({ where: { id: { in: sedeIds as number[] } }, select: { idCliente: true } })
      .then((ss) => [...new Set(ss.map((s) => s.idCliente))])
    if (!clienteIds.includes(cotizacion.idCliente)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 })
    }
  }

  try {
    const pdfBuffer = await renderCotizacionPDF(cotizacion as any)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cotizacion-${id}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Error generando PDF de cotizacion:", err)
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 })
  }
}
