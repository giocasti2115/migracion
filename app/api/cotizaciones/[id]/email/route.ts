import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { NextRequest, NextResponse } from "next/server"
import { renderCotizacionPDF } from "@/lib/pdf/cotizacion-pdf"
import { sendEmail } from "@/lib/email"

type Params = { params: { id: string } }

/**
 * POST /api/cotizaciones/[id]/email
 *
 * Generates the cotizacion PDF and sends it by email to the cliente's correo.
 * Returns 422 if the client has no email registered.
 */
export async function POST(_req: NextRequest, { params }: Params) {
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

  // Scope check
  if (sedeIds !== "all") {
    const clienteIds = await prisma.sede
      .findMany({ where: { id: { in: sedeIds as number[] } }, select: { idCliente: true } })
      .then((ss) => [...new Set(ss.map((s) => s.idCliente))])
    if (!clienteIds.includes(cotizacion.idCliente)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 })
    }
  }

  const destinatario = cotizacion.cliente.correo
  if (!destinatario) {
    return NextResponse.json(
      { error: "El cliente no tiene correo electrónico registrado" },
      { status: 422 }
    )
  }

  // Generate PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderCotizacionPDF(cotizacion as any)
  } catch (err) {
    console.error("Error generando PDF de cotizacion:", err)
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 })
  }

  // Build a simple HTML email body
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e40af;">Cotización #${id}</h2>
      <p>Estimado/a <strong>${cotizacion.cliente.nombre}</strong>,</p>
      <p>
        Adjunto encontrará la cotización <strong>#${id}</strong>
        elaborada por <strong>${cotizacion.creador.nombre}</strong>.
      </p>
      <p>
        Si tiene alguna pregunta, no dude en contactarnos.
      </p>
      <p style="color:#64748b;font-size:12px;margin-top:32px;">
        Este mensaje fue generado automáticamente.
      </p>
    </div>
  `

  const result = await sendEmail({
    to: destinatario,
    subject: `Cotización #${id} — ${cotizacion.cliente.nombre}`,
    html,
    attachments: [
      {
        filename: `cotizacion-${id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: "No se pudo enviar el correo", reason: result.reason },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, sentTo: destinatario })
}
