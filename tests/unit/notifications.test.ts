/**
 * Unit tests: notifications.ts (17.3 partial)
 * Tests that state transitions never block when email fails,
 * and that notifications call sendEmail with the right parameters.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the email module before importing notifications
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}))

import {
  notificarAprobacionSolicitud,
  notificarRechazoSolicitud,
  notificarCierreOrden,
  notificarAprobacionCotizacion,
} from "@/lib/notifications"
import { sendEmail } from "@/lib/email"

const mockedSendEmail = sendEmail as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Non-blocking behavior ─────────────────────────────────────────────────────
describe("notifications — never throw, even when sendEmail fails", () => {
  it("notificarAprobacionSolicitud does not throw when sendEmail rejects", async () => {
    mockedSendEmail.mockRejectedValue(new Error("SMTP connection refused"))
    await expect(
      notificarAprobacionSolicitud(1, "Juan Pérez", "juan@test.com", 100)
    ).resolves.not.toThrow()
  })

  it("notificarRechazoSolicitud does not throw when sendEmail rejects", async () => {
    mockedSendEmail.mockRejectedValue(new Error("SMTP error"))
    await expect(
      notificarRechazoSolicitud(1, "María López", "maria@test.com", "No aplica")
    ).resolves.not.toThrow()
  })

  it("notificarCierreOrden does not throw when sendEmail rejects", async () => {
    mockedSendEmail.mockRejectedValue(new Error("Connection timeout"))
    await expect(
      notificarCierreOrden(50, "Empresa ABC", "contacto@abc.com", "Trabajo completado")
    ).resolves.not.toThrow()
  })
})

// ── Skips email when no address is available ──────────────────────────────────
describe("notifications — skip silently when no correo", () => {
  it("notificarAprobacionSolicitud skips when correo is null", async () => {
    await notificarAprobacionSolicitud(1, "Juan", null, 1)
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })

  it("notificarAprobacionSolicitud skips when correo is undefined", async () => {
    await notificarAprobacionSolicitud(1, "Juan", undefined, 1)
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })

  it("notificarRechazoSolicitud skips when correo is null", async () => {
    await notificarRechazoSolicitud(1, "María", null, "Motivo")
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })

  it("notificarCierreOrden skips when correo is null", async () => {
    await notificarCierreOrden(50, "Cliente", null)
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })

  it("notificarAprobacionCotizacion skips when correo is null", async () => {
    await notificarAprobacionCotizacion(5, "Cliente", null)
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })
})

// ── Correct email content ─────────────────────────────────────────────────────
describe("notifications — send email with correct parameters", () => {
  beforeEach(() => {
    mockedSendEmail.mockResolvedValue({ ok: true })
  })

  it("notificarAprobacionSolicitud sends to the correct address", async () => {
    await notificarAprobacionSolicitud(5, "Pedro García", "pedro@test.com", 200)
    expect(mockedSendEmail).toHaveBeenCalledOnce()
    const call = mockedSendEmail.mock.calls[0][0]
    expect(call.to).toBe("pedro@test.com")
    expect(call.subject).toContain("5")     // solicitudId
    expect(call.subject).toContain("200")   // ordenId
  })

  it("notificarRechazoSolicitud includes motivo in email content", async () => {
    await notificarRechazoSolicitud(3, "Ana Rodríguez", "ana@test.com", "No cumple requisitos")
    const call = mockedSendEmail.mock.calls[0][0]
    expect(call.html).toContain("No cumple requisitos")
  })

  it("notificarCierreOrden sends to the correct address", async () => {
    await notificarCierreOrden(99, "Empresa XYZ", "xyz@empresa.com", "Trabajo finalizado")
    const call = mockedSendEmail.mock.calls[0][0]
    expect(call.to).toBe("xyz@empresa.com")
    expect(call.html).toContain("99")
  })

  it("notificarAprobacionCotizacion sends to the client correo", async () => {
    await notificarAprobacionCotizacion(12, "Cliente AB", "cliente@ab.com")
    const call = mockedSendEmail.mock.calls[0][0]
    expect(call.to).toBe("cliente@ab.com")
    expect(call.subject).toContain("12")
  })
})
