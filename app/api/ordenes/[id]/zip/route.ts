import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { renderOrdenPDF } from "@/lib/pdf/orden-pdf"

type Params = { params: { id: string } }

/**
 * GET /api/ordenes/[id]/zip
 *
 * Generates a ZIP file containing:
 * - orden-{id}.pdf  — the full order PDF
 * - adjuntos/       — any attached files stored in OrdenAdjunto records (if accessible)
 *
 * The adjunto URLs are expected to be relative paths under /public.
 * Files not found on disk are silently skipped.
 */
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
      adjuntos: { where: { activo: true } },
    },
  })

  if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  // Scope check
  const idSede = (orden.solicitud.equipo as any).idSede
  if (sedeIds !== "all" && !sedeIds.includes(idSede)) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 })
  }

  const zip = new JSZip()

  // 1. Add PDF
  const pdfBuffer = await renderOrdenPDF(orden as any)
  zip.file(`orden-${id}.pdf`, pdfBuffer)

  // 2. Add adjuntos from disk (best-effort)
  if (orden.adjuntos.length > 0) {
    const { readFile } = await import("fs/promises")
    const path = await import("path")
    const folder = zip.folder("adjuntos")!

    for (const adjunto of orden.adjuntos) {
      try {
        const relativePath = (adjunto as any).url as string
        if (!relativePath) continue
        // Strip leading slash and prefix with public/
        const filePath = path.join(process.cwd(), "public", relativePath.replace(/^\//, ""))
        const buf = await readFile(filePath)
        const filename = path.basename(filePath)
        folder.file(filename, buf)
      } catch {
        // File not found on disk — skip silently
      }
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="orden-${id}.zip"`,
    },
  })
}
