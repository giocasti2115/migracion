/**
 * Unit tests: Orden lifecycle
 * Tests diasFuera calculation, state schema validation, cerrar/anular rules
 */
import { describe, it, expect } from "vitest"
import {
  ordenSchema,
  ordenUpdateSchema,
  cerrarOrdenSchema,
  ordenCambioSchema,
} from "@/lib/validations/ordenes"

// ── Pure helper (extracted business logic) ────────────────────────────────────

/**
 * Calculates días fuera for an orden.
 * Mirrors the logic used in the informes endpoints.
 */
function calcularDiasFuera(creacion: Date, cierre?: Date | null): number {
  const end = cierre ?? new Date()
  const diffMs = end.getTime() - creacion.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Whether an orden in a given state can still be modified.
 * State IDs: 1=Abierta, 2=Cerrada, 3=Anulada
 */
function puedeModificar(idEstado: number): boolean {
  const CLOSED_STATES = [2, 3] // Cerrada, Anulada
  return !CLOSED_STATES.includes(idEstado)
}

// ── ordenSchema ───────────────────────────────────────────────────────────────
describe("ordenSchema — creation", () => {
  it("requires a positive integer idSolicitud", () => {
    expect(ordenSchema.safeParse({ idSolicitud: 1 }).success).toBe(true)
  })

  it("rejects missing idSolicitud", () => {
    expect(ordenSchema.safeParse({}).success).toBe(false)
  })

  it("rejects idSolicitud = 0", () => {
    expect(ordenSchema.safeParse({ idSolicitud: 0 }).success).toBe(false)
  })

  it("rejects negative idSolicitud", () => {
    expect(ordenSchema.safeParse({ idSolicitud: -5 }).success).toBe(false)
  })
})

// ── cerrarOrdenSchema ─────────────────────────────────────────────────────────
describe("cerrarOrdenSchema", () => {
  const validPayload = {
    observacionesCierre: "La orden fue completada correctamente.",
    nombreRecibe: "Juan Pérez",
    cedulaRecibe: "12345678",
    solicitarDadoBaja: false,
  }

  it("accepts a valid close payload", () => {
    expect(cerrarOrdenSchema.safeParse(validPayload).success).toBe(true)
  })

  it("rejects observacionesCierre shorter than 10 characters", () => {
    const result = cerrarOrdenSchema.safeParse({ ...validPayload, observacionesCierre: "corto" })
    expect(result.success).toBe(false)
  })

  it("rejects observacionesCierre longer than 2000 characters", () => {
    const result = cerrarOrdenSchema.safeParse({
      ...validPayload,
      observacionesCierre: "x".repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it("accepts observacionesCierre at exactly 10 characters", () => {
    expect(
      cerrarOrdenSchema.safeParse({ ...validPayload, observacionesCierre: "1234567890" }).success
    ).toBe(true)
  })

  it("accepts solicitarDadoBaja = true", () => {
    expect(
      cerrarOrdenSchema.safeParse({ ...validPayload, solicitarDadoBaja: true }).success
    ).toBe(true)
  })

  it("rejects cedulaRecibe longer than 50 characters", () => {
    const result = cerrarOrdenSchema.safeParse({
      ...validPayload,
      cedulaRecibe: "1".repeat(51),
    })
    expect(result.success).toBe(false)
  })
})

// ── diasFuera calculation ─────────────────────────────────────────────────────
describe("calcularDiasFuera", () => {
  it("returns 0 for an orden created today and closed today", () => {
    const today = new Date()
    expect(calcularDiasFuera(today, today)).toBe(0)
  })

  it("returns 1 for an orden created yesterday and closed today", () => {
    const yesterday = new Date(Date.now() - 86_400_000)
    const result = calcularDiasFuera(yesterday, new Date())
    expect(result).toBe(1)
  })

  it("returns 7 for an orden created 7 days ago and closed today", () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
    const result = calcularDiasFuera(sevenDaysAgo, new Date())
    expect(result).toBe(7)
  })

  it("returns 0 when cierre is before creacion (protective)", () => {
    const later = new Date()
    const earlier = new Date(Date.now() - 86_400_000)
    // cierre (earlier) before creacion (later) → max(0, negative) = 0
    expect(calcularDiasFuera(later, earlier)).toBe(0)
  })

  it("works without cierre (open orden) — uses current time", () => {
    const oneHourAgo = new Date(Date.now() - 3_600_000)
    const result = calcularDiasFuera(oneHourAgo)
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

// ── State modification guard ──────────────────────────────────────────────────
describe("puedeModificar — rejects modifications to anulada/cerrada ordenes", () => {
  it("allows modification of open orden (idEstado=1)", () => {
    expect(puedeModificar(1)).toBe(true)
  })

  it("rejects modification of closed orden (idEstado=2)", () => {
    expect(puedeModificar(2)).toBe(false)
  })

  it("rejects modification of anulada orden (idEstado=3)", () => {
    expect(puedeModificar(3)).toBe(false)
  })
})

// ── ordenCambioSchema ─────────────────────────────────────────────────────────
describe("ordenCambioSchema", () => {
  it("requires a positive idSubEstado", () => {
    expect(ordenCambioSchema.safeParse({ idSubEstado: 1 }).success).toBe(true)
  })

  it("rejects idSubEstado = 0", () => {
    expect(ordenCambioSchema.safeParse({ idSubEstado: 0 }).success).toBe(false)
  })

  it("rejects comentario longer than 2000 characters", () => {
    expect(
      ordenCambioSchema.safeParse({ idSubEstado: 1, comentario: "x".repeat(2001) }).success
    ).toBe(false)
  })
})
