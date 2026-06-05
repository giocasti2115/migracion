import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { renderPreventivoPDF } from "@/lib/pdf/preventivo-pdf"

type Params = { params: { id: string } }

/** GET /api/preventivos/[id]/pdf — generate and stream PDF for a preventivo */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const id = parseInt(params.id)

  const preventivo = await prisma.preventivo.findUnique({ where: { id } })

  if (!preventivo) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  // Fetch equipo separately (no relation declared in schema; idEquipo is a bare FK)
  let equipo: any = null
  if (preventivo.idEquipo) {
    equipo = await prisma.equipo.findUnique({
      where: { id: preventivo.idEquipo },
      include: {
        modelo: { include: { marca: true, clase: true } },
        sede: { include: { cliente: { select: { nombre: true } } } },
      },
    })
  }

  try {
    const pdfBuffer = await renderPreventivoPDF({ ...preventivo, equipo } as any)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="preventivo-${id}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Error generando PDF de preventivo:", err)
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 })
  }
}
