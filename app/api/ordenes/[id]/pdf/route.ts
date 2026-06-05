import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextRequest, NextResponse } from "next/server"
import { renderOrdenPDF } from "@/lib/pdf/orden-pdf"

type Params = { params: { id: string } }

/** GET /api/ordenes/[id]/pdf — generate and stream PDF for an orden */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)

  const orden = await prisma.orden.findUnique({
    where: { id },
    include: {
      estado: true,
      solicitud: {
        include: {
          servicio: true,
          equipo: {
            include: {
              sede: { include: { cliente: { select: { id: true, nombre: true } } } },
              modelo: { include: { marca: true, clase: true } },
            },
          },
          creador: { select: { id: true, nombre: true } },
        },
      },
      creador: { select: { id: true, nombre: true } },
      cerrador: { select: { id: true, nombre: true } },
      accionFalla: true,
      visitas: {
        include: {
          estado: true,
          ejecutador: { select: { id: true, nombre: true } },
          actividadesEjecutadas: {
            include: { protocolo: { select: { title: true } } },
          },
        },
        where: { activo: true },
        orderBy: { fechaInicio: "asc" },
      },
    },
  })

  if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  // Scope check
  const idSede = orden.solicitud.equipo.sede.id ?? (orden.solicitud.equipo as any).idSede
  if (sedeIds !== "all" && !sedeIds.includes(idSede)) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 })
  }

  try {
    const pdfBuffer = await renderOrdenPDF(orden as any)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="orden-${id}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Error generando PDF de orden:", err)
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 })
  }
}
