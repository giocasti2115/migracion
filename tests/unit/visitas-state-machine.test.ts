/**
 * Unit tests: Visita state machine
 * Tests valid/invalid state transitions, schema validation rules
 */
import { describe, it, expect } from "vitest"
import { visitaEstadoTransicionSchema, visitaUpdateSchema } from "@/lib/validations/visitas"

// ── State machine constants (mirrors route logic) ─────────────────────────────
const ESTADOS = {
  PENDIENTE: 1,
  APROBADA: 2,
  ABIERTA: 3,
  CERRADA: 4,
  RECHAZADA: 5,
}

/**
 * Pure state machine validation.
 * Mirrors the transition logic that should be enforced in the API route.
 * Returns null if valid, error message if invalid.
 */
function validarTransicion(estadoActual: number, estadoDestino: number): string | null {
  const VALID: Record<number, number[]> = {
    [ESTADOS.PENDIENTE]: [ESTADOS.APROBADA, ESTADOS.RECHAZADA],
    [ESTADOS.APROBADA]: [ESTADOS.ABIERTA, ESTADOS.RECHAZADA],
    [ESTADOS.ABIERTA]: [ESTADOS.CERRADA, ESTADOS.RECHAZADA],
    [ESTADOS.CERRADA]: [],    // terminal
    [ESTADOS.RECHAZADA]: [],  // terminal
  }

  const allowed = VALID[estadoActual] ?? []
  if (!allowed.includes(estadoDestino)) {
    return `Transición inválida: ${estadoActual} → ${estadoDestino}`
  }
  return null
}

// ── Valid transitions ─────────────────────────────────────────────────────────
describe("Visita state machine — valid transitions", () => {
  it("Pendiente → Aprobada is valid", () => {
    expect(validarTransicion(ESTADOS.PENDIENTE, ESTADOS.APROBADA)).toBeNull()
  })

  it("Aprobada → Abierta is valid", () => {
    expect(validarTransicion(ESTADOS.APROBADA, ESTADOS.ABIERTA)).toBeNull()
  })

  it("Abierta → Cerrada is valid", () => {
    expect(validarTransicion(ESTADOS.ABIERTA, ESTADOS.CERRADA)).toBeNull()
  })

  it("Pendiente → Rechazada is valid (early rejection)", () => {
    expect(validarTransicion(ESTADOS.PENDIENTE, ESTADOS.RECHAZADA)).toBeNull()
  })

  it("Aprobada → Rechazada is valid", () => {
    expect(validarTransicion(ESTADOS.APROBADA, ESTADOS.RECHAZADA)).toBeNull()
  })

  it("Abierta → Rechazada is valid", () => {
    expect(validarTransicion(ESTADOS.ABIERTA, ESTADOS.RECHAZADA)).toBeNull()
  })
})

// ── Invalid transitions ───────────────────────────────────────────────────────
describe("Visita state machine — invalid transitions", () => {
  it("Pendiente → Cerrada is NOT valid (cannot skip Aprobada and Abierta)", () => {
    expect(validarTransicion(ESTADOS.PENDIENTE, ESTADOS.CERRADA)).not.toBeNull()
  })

  it("Pendiente → Abierta is NOT valid (cannot skip Aprobada)", () => {
    expect(validarTransicion(ESTADOS.PENDIENTE, ESTADOS.ABIERTA)).not.toBeNull()
  })

  it("Aprobada → Cerrada is NOT valid (cannot skip Abierta)", () => {
    expect(validarTransicion(ESTADOS.APROBADA, ESTADOS.CERRADA)).not.toBeNull()
  })

  it("Cerrada → any state is NOT valid (terminal)", () => {
    expect(validarTransicion(ESTADOS.CERRADA, ESTADOS.PENDIENTE)).not.toBeNull()
    expect(validarTransicion(ESTADOS.CERRADA, ESTADOS.APROBADA)).not.toBeNull()
    expect(validarTransicion(ESTADOS.CERRADA, ESTADOS.RECHAZADA)).not.toBeNull()
  })

  it("Rechazada → any state is NOT valid (terminal)", () => {
    expect(validarTransicion(ESTADOS.RECHAZADA, ESTADOS.PENDIENTE)).not.toBeNull()
    expect(validarTransicion(ESTADOS.RECHAZADA, ESTADOS.ABIERTA)).not.toBeNull()
  })
})

// ── Schema validation ─────────────────────────────────────────────────────────
describe("visitaEstadoTransicionSchema", () => {
  it("accepts a valid transition payload", () => {
    const result = visitaEstadoTransicionSchema.safeParse({ idEstado: 2 })
    expect(result.success).toBe(true)
  })

  it("rejects idEstado = 0", () => {
    const result = visitaEstadoTransicionSchema.safeParse({ idEstado: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects idEstado = negative number", () => {
    const result = visitaEstadoTransicionSchema.safeParse({ idEstado: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects motivoRechazo exceeding 500 characters", () => {
    const result = visitaEstadoTransicionSchema.safeParse({
      idEstado: 5,
      motivoRechazo: "x".repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it("accepts motivoRechazo at exactly 500 characters", () => {
    const result = visitaEstadoTransicionSchema.safeParse({
      idEstado: 5,
      motivoRechazo: "x".repeat(500),
    })
    expect(result.success).toBe(true)
  })
})

describe("visitaUpdateSchema", () => {
  it("rejects observacionesCierre exceeding 1000 characters", () => {
    const result = visitaUpdateSchema.safeParse({
      observacionesCierre: "x".repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it("accepts observacionesCierre at exactly 1000 characters", () => {
    const result = visitaUpdateSchema.safeParse({
      observacionesCierre: "x".repeat(1000),
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty update payload", () => {
    const result = visitaUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("rejects non-integer duration", () => {
    const result = visitaUpdateSchema.safeParse({ duracion: 1.5 })
    expect(result.success).toBe(false)
  })

  it("accepts integer duration", () => {
    const result = visitaUpdateSchema.safeParse({ duracion: 60 })
    expect(result.success).toBe(true)
  })
})
