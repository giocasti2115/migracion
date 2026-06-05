import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

type Params = { params: { id: string } }

const firmaSchema = z.object({
  /** Base64-encoded PNG (data:image/png;base64,...) from SignaturePad */
  firmaBase64: z.string().min(10),
  /** Display name of the person signing */
  nombreFirmante: z.string().min(1).max(200),
  cedulaFirmante: z.string().max(30).optional(),
})

/**
 * POST /api/ordenes/[id]/firma
 *
 * Persists the digital signature for an order (firma de entrega).
 * Saves the PNG to disk and stores a reference in OrdenAdjunto.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)

  const orden = await prisma.orden.findUnique({
    where: { id },
    select: {
      id: true,
      solicitud: { select: { equipo: { select: { idSede: true } } } },
    },
  })

  if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  if (sedeIds !== "all" && !sedeIds.includes(orden.solicitud.equipo.idSede)) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = firmaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const { firmaBase64, nombreFirmante, cedulaFirmante } = parsed.data

  // Strip the data URI prefix and decode the image
  const base64Data = firmaBase64.replace(/^data:image\/png;base64,/, "")
  const imgBuffer = Buffer.from(base64Data, "base64")

  // Save to public/uploads/firmas/orden-{id}-{timestamp}.png
  const filename = `orden-${id}-${Date.now()}.png`
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "firmas")
  await mkdir(uploadsDir, { recursive: true })
  await writeFile(path.join(uploadsDir, filename), imgBuffer)

  // Record adjunto (nombre stores the path; activo = true marks it as firma)
  const adjunto = await prisma.ordenAdjunto.create({
    data: {
      idOrden: id,
      nombre: `firmas/${filename}`,
      activo: true,
    },
  })

  // Update order's receiver info
  await prisma.orden.update({
    where: { id },
    data: {
      nombreRecibe: nombreFirmante,
      ...(cedulaFirmante ? { cedulaRecibe: cedulaFirmante } : {}),
    },
  })

  return NextResponse.json({ ok: true, adjuntoId: adjunto.id, url: `/uploads/firmas/${filename}` })
}
