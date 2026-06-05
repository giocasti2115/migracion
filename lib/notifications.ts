import { sendEmail } from "@/lib/email"

const APP_NAME = process.env.APP_NAME ?? "Ziriuz"
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

function baseTemplate(body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0;">
        <h2 style="color:#1e40af;margin-top:0;">${APP_NAME}</h2>
        ${body}
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />
        <p style="color:#64748b;font-size:12px;margin:0;">
          Este mensaje fue generado automáticamente por ${APP_NAME}.
          <a href="${APP_URL}" style="color:#1e40af;">Ir a la plataforma</a>
        </p>
      </div>
    </div>
  `
}

/**
 * Notifica al creador de una solicitud que fue aprobada y se generó una orden.
 */
export async function notificarAprobacionSolicitud(
  solicitudId: number,
  solicitudCreadorNombre: string,
  solicitudCreadorCorreo: string | null | undefined,
  ordenId: number
) {
  if (!solicitudCreadorCorreo) return

  const html = baseTemplate(`
    <p>Hola <strong>${solicitudCreadorNombre}</strong>,</p>
    <p>
      Su solicitud <strong>#${solicitudId}</strong> ha sido <strong style="color:#16a34a;">aprobada</strong>
      y se ha generado la Orden de Trabajo <strong>#${ordenId}</strong>.
    </p>
    <p>
      <a href="${APP_URL}/ordenes/${ordenId}"
         style="display:inline-block;padding:10px 20px;background:#1e40af;color:#fff;border-radius:6px;text-decoration:none;">
        Ver Orden de Trabajo
      </a>
    </p>
  `)

  try {
    await sendEmail({
      to: solicitudCreadorCorreo,
      subject: `[${APP_NAME}] Solicitud #${solicitudId} aprobada — Orden #${ordenId}`,
      html,
    })
  } catch {
    // Non-blocking: email errors must never interrupt the main flow
  }
}

/**
 * Notifica al creador de una solicitud que fue rechazada.
 */
export async function notificarRechazoSolicitud(
  solicitudId: number,
  solicitudCreadorNombre: string,
  solicitudCreadorCorreo: string | null | undefined,
  motivo?: string | null
) {
  if (!solicitudCreadorCorreo) return

  const motivoSection = motivo
    ? `<p><strong>Motivo:</strong> ${motivo}</p>`
    : ""

  const html = baseTemplate(`
    <p>Hola <strong>${solicitudCreadorNombre}</strong>,</p>
    <p>
      Lamentamos informarle que su solicitud <strong>#${solicitudId}</strong>
      ha sido <strong style="color:#dc2626;">rechazada</strong>.
    </p>
    ${motivoSection}
    <p>
      <a href="${APP_URL}/solicitudes/${solicitudId}"
         style="display:inline-block;padding:10px 20px;background:#1e40af;color:#fff;border-radius:6px;text-decoration:none;">
        Ver Solicitud
      </a>
    </p>
  `)

  try {
    await sendEmail({
      to: solicitudCreadorCorreo,
      subject: `[${APP_NAME}] Solicitud #${solicitudId} rechazada`,
      html,
    })
  } catch {
    // Non-blocking: email errors must never interrupt the main flow
  }
}

/**
 * Notifica el cierre de una orden al correo del cliente o al creador de la solicitud.
 */
export async function notificarCierreOrden(
  ordenId: number,
  clienteNombre: string,
  destinatarioCorreo: string | null | undefined,
  observaciones?: string | null
) {
  if (!destinatarioCorreo) return

  const obsSection = observaciones
    ? `<p><strong>Observaciones de cierre:</strong> ${observaciones}</p>`
    : ""

  const html = baseTemplate(`
    <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
    <p>
      La Orden de Trabajo <strong>#${ordenId}</strong> ha sido
      <strong style="color:#16a34a;">cerrada</strong> exitosamente.
    </p>
    ${obsSection}
    <p>
      <a href="${APP_URL}/ordenes/${ordenId}"
         style="display:inline-block;padding:10px 20px;background:#1e40af;color:#fff;border-radius:6px;text-decoration:none;">
        Ver Orden
      </a>
    </p>
  `)

  try {
    await sendEmail({
      to: destinatarioCorreo,
      subject: `[${APP_NAME}] Orden de Trabajo #${ordenId} cerrada`,
      html,
    })
  } catch {
    // Non-blocking: email errors must never interrupt the main flow
  }
}

/**
 * Notifica aprobación de una cotización al cliente.
 */
export async function notificarAprobacionCotizacion(
  cotizacionId: number,
  clienteNombre: string,
  clienteCorreo: string | null | undefined
) {
  if (!clienteCorreo) return

  const html = baseTemplate(`
    <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
    <p>
      La cotización <strong>#${cotizacionId}</strong> ha sido
      <strong style="color:#16a34a;">aprobada</strong>.
    </p>
    <p>
      <a href="${APP_URL}/cotizaciones/${cotizacionId}"
         style="display:inline-block;padding:10px 20px;background:#1e40af;color:#fff;border-radius:6px;text-decoration:none;">
        Ver Cotización
      </a>
    </p>
  `)

  try {
    await sendEmail({
      to: clienteCorreo,
      subject: `[${APP_NAME}] Cotización #${cotizacionId} aprobada`,
      html,
    })
  } catch {
    // Non-blocking: email errors must never interrupt the main flow
  }
}
