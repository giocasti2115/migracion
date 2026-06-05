import nodemailer from "nodemailer"

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

/**
 * Sends an email via the configured SMTP server.
 * Returns { ok: true } on success, { ok: false, reason } if SMTP is not configured or send fails.
 * Never throws — email failures are non-blocking.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; reason?: string }> {
  const transporter = createTransporter()

  if (!transporter) {
    console.warn("[email] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.")
    return { ok: false, reason: "SMTP not configured" }
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType ?? "application/octet-stream",
      })),
    })
    return { ok: true }
  } catch (err: any) {
    console.error("[email] Send failed:", err?.message)
    return { ok: false, reason: err?.message }
  }
}
