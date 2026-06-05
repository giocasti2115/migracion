/**
 * Unit tests: Informes calculations
 * Tests availability calculation, date range filtering, average days to close
 */
import { describe, it, expect } from "vitest"
import { dateRangeSchema, informeCorrectivosSchema, informeIndicadoresSchema } from "@/lib/validations/informes"

// ── Pure calculation helpers ──────────────────────────────────────────────────

function calcularDisponibilidad(totalHours: number, outOfServiceHours: number): number {
  if (totalHours <= 0) return 100
  const bounded = Math.min(outOfServiceHours, totalHours)
  return ((totalHours - bounded) / totalHours) * 100
}

function calcularPromedioDiasCierre(diasArr: number[]): number {
  if (diasArr.length === 0) return 0
  return diasArr.reduce((sum, d) => sum + d, 0) / diasArr.length
}

/** Returns true if the date is within [desde, hasta] inclusive */
function estaEnRango(fecha: Date, desde: Date, hasta: Date): boolean {
  return fecha >= desde && fecha <= hasta
}

// ── Availability calculation ──────────────────────────────────────────────────
describe("calcularDisponibilidad", () => {
  it("returns 100% when no out-of-service hours (no ordenes abiertas)", () => {
    expect(calcularDisponibilidad(720, 0)).toBe(100)
  })

  it("returns 0% when all hours are out of service", () => {
    expect(calcularDisponibilidad(720, 720)).toBe(0)
  })

  it("returns 50% when half of total hours are out of service", () => {
    expect(calcularDisponibilidad(100, 50)).toBe(50)
  })

  it("returns 100% when totalHours = 0 (no period to measure)", () => {
    expect(calcularDisponibilidad(0, 0)).toBe(100)
    expect(calcularDisponibilidad(0, 100)).toBe(100)
  })

  it("never exceeds 100%", () => {
    expect(calcularDisponibilidad(100, 0)).toBeLessThanOrEqual(100)
    expect(calcularDisponibilidad(100, 200)).toBeLessThanOrEqual(100) // bounded
  })

  it("never goes below 0%", () => {
    expect(calcularDisponibilidad(100, 150)).toBeGreaterThanOrEqual(0)
  })

  it("returns correct percentage for fractional hours", () => {
    const result = calcularDisponibilidad(1000, 250)
    expect(result).toBe(75)
  })
})

// ── Average days to close ─────────────────────────────────────────────────────
describe("calcularPromedioDiasCierre", () => {
  it("returns 0 for empty array (no closed ordenes)", () => {
    expect(calcularPromedioDiasCierre([])).toBe(0)
  })

  it("returns the only value for a single-element array", () => {
    expect(calcularPromedioDiasCierre([5])).toBe(5)
  })

  it("calculates the correct average", () => {
    expect(calcularPromedioDiasCierre([2, 4, 6])).toBe(4)
  })

  it("handles large arrays without overflow", () => {
    const arr = Array.from({ length: 10_000 }, () => 365)
    expect(calcularPromedioDiasCierre(arr)).toBe(365)
  })

  it("returns a non-negative value", () => {
    expect(calcularPromedioDiasCierre([0, 0, 0])).toBe(0)
  })
})

// ── Date range inclusive filter ───────────────────────────────────────────────
describe("estaEnRango (inclusive date filter)", () => {
  const desde = new Date("2025-01-01T00:00:00Z")
  const hasta = new Date("2025-12-31T23:59:59Z")

  it("includes the desde boundary", () => {
    expect(estaEnRango(desde, desde, hasta)).toBe(true)
  })

  it("includes the hasta boundary", () => {
    expect(estaEnRango(hasta, desde, hasta)).toBe(true)
  })

  it("includes a date in the middle", () => {
    const mid = new Date("2025-06-15T12:00:00Z")
    expect(estaEnRango(mid, desde, hasta)).toBe(true)
  })

  it("excludes a date before desde", () => {
    const before = new Date("2024-12-31T23:59:59Z")
    expect(estaEnRango(before, desde, hasta)).toBe(false)
  })

  it("excludes a date after hasta", () => {
    const after = new Date("2026-01-01T00:00:01Z")
    expect(estaEnRango(after, desde, hasta)).toBe(false)
  })
})

// ── dateRangeSchema ───────────────────────────────────────────────────────────
describe("dateRangeSchema", () => {
  it("accepts a valid range where desde <= hasta", () => {
    const result = dateRangeSchema.safeParse({
      desde: "2025-01-01T00:00:00.000Z",
      hasta: "2025-12-31T23:59:59.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a single-day range (desde == hasta)", () => {
    const result = dateRangeSchema.safeParse({
      desde: "2025-06-15T00:00:00.000Z",
      hasta: "2025-06-15T23:59:59.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("rejects cuando desde > hasta", () => {
    const result = dateRangeSchema.safeParse({
      desde: "2025-12-31T00:00:00.000Z",
      hasta: "2025-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain("hasta")
  })

  it("rejects non-datetime strings", () => {
    const result = dateRangeSchema.safeParse({ desde: "not-a-date", hasta: "also-not" })
    expect(result.success).toBe(false)
  })
})

// ── informeCorrectivosSchema ──────────────────────────────────────────────────
describe("informeCorrectivosSchema", () => {
  const basePayload = {
    desde: "2025-01-01T00:00:00.000Z",
    hasta: "2025-12-31T00:00:00.000Z",
  }

  it("accepts minimal payload (just date range)", () => {
    expect(informeCorrectivosSchema.safeParse(basePayload).success).toBe(true)
  })

  it("accepts valid estado value", () => {
    expect(
      informeCorrectivosSchema.safeParse({ ...basePayload, estado: "abiertas" }).success
    ).toBe(true)
  })

  it("rejects invalid estado value", () => {
    expect(
      informeCorrectivosSchema.safeParse({ ...basePayload, estado: "pendientes" }).success
    ).toBe(false)
  })

  it("defaults estado to 'todas' when not provided", () => {
    const result = informeCorrectivosSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.estado).toBe("todas")
  })
})
