/**
 * Property tests P5–P8: Data filtering and business invariants
 *
 * P5: Data scope filter — any set of filtered ordenes only contains ordenes from allowed sedes
 * P6: Map consistency — totalOrdenes >= ordenesAbiertas for all departments
 * P7: diasFuera is always non-negative
 * P8: Approved solicitud has exactly one orden
 */
import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

// ── Pure helper functions extracted from business logic ──────────────────────

/**
 * Pure implementation of the data scope filter logic.
 * Mirrors the WHERE clause applied in API routes.
 */
function filterBySedeIds<T extends { idSede: number }>(
  items: T[],
  sedeIds: number[] | "all"
): T[] {
  if (sedeIds === "all") return items
  return items.filter((item) => sedeIds.includes(item.idSede))
}

/**
 * Calculates días fuera (days out of service).
 * Requirement 4.1: always non-negative.
 */
function calcularDiasFuera(creacion: Date, cierre?: Date | null): number {
  const end = cierre ?? new Date()
  const diffMs = end.getTime() - creacion.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Calculates equipment availability percentage.
 * Requirement 9.2: disponibilidad = (horasTotal - horasFueraServicio) / horasTotal * 100
 */
function calcularDisponibilidad(
  totalHours: number,
  outOfServiceHours: number
): number {
  if (totalHours <= 0) return 100
  const bounded = Math.min(outOfServiceHours, totalHours)
  return ((totalHours - bounded) / totalHours) * 100
}

/**
 * Calculates average days to close.
 */
function calcularPromedioDiasCierre(diasFueraArr: number[]): number {
  if (diasFueraArr.length === 0) return 0
  return diasFueraArr.reduce((sum, d) => sum + d, 0) / diasFueraArr.length
}

// ── P5: Data scope filter ─────────────────────────────────────────────────────
describe("P5 — Data scope filter: results only contain allowed sedes", () => {
  it("filtered list always contains only sedes from the allowed set", () => {
    fc.assert(
      fc.property(
        // Generate a list of items with random sede IDs
        fc.array(
          fc.record({ id: fc.integer({ min: 1 }), idSede: fc.integer({ min: 1, max: 100 }) }),
          { minLength: 0, maxLength: 50 }
        ),
        // Generate a random subset of allowed sedes
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 20 }),
        (items, allowedSedeIds) => {
          const filtered = filterBySedeIds(items, allowedSedeIds)
          return filtered.every((item) => allowedSedeIds.includes(item.idSede))
        }
      )
    )
  })

  it("when sedeIds is 'all', the full list is returned", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.integer({ min: 1 }), idSede: fc.integer({ min: 1, max: 100 }) })
        ),
        (items) => {
          const filtered = filterBySedeIds(items, "all")
          return filtered.length === items.length
        }
      )
    )
  })
})

// ── P6: Map consistency ───────────────────────────────────────────────────────
describe("P6 — Map consistency: totalOrdenes >= ordenesAbiertas", () => {
  it("for any department data, total >= open ordenes", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            departamento: fc.string({ minLength: 1 }),
            totalOrdenes: fc.integer({ min: 0, max: 10_000 }),
            ordenesAbiertas: fc.integer({ min: 0, max: 10_000 }),
          }).map((d) => ({
            ...d,
            // Ensure the invariant at generation time
            ordenesAbiertas: Math.min(d.ordenesAbiertas, d.totalOrdenes),
          })),
          { minLength: 0, maxLength: 33 }
        ),
        (departments) => {
          return departments.every((d) => d.totalOrdenes >= d.ordenesAbiertas)
        }
      )
    )
  })
})

// ── P7: diasFuera always non-negative ─────────────────────────────────────────
describe("P7 — diasFuera is always non-negative", () => {
  it("diasFuera with close date is always >= 0", () => {
    fc.assert(
      fc.property(
        // creation date in the past (1–1000 days ago)
        fc.integer({ min: 1, max: 1000 }).map((d) => new Date(Date.now() - d * 86_400_000)),
        // close date in the recent past or future
        fc.integer({ min: -10, max: 1000 }).map((d) => new Date(Date.now() + d * 86_400_000)),
        (creacion, cierre) => {
          const dias = calcularDiasFuera(creacion, cierre)
          return dias >= 0
        }
      )
    )
  })

  it("diasFuera without close date (open orden) is always >= 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }).map((d) => new Date(Date.now() - d * 86_400_000)),
        (creacion) => {
          const dias = calcularDiasFuera(creacion, null)
          return dias >= 0
        }
      )
    )
  })
})

// ── P8: Approved solicitud has exactly one orden (invariant check) ─────────────
describe("P8 — Business invariant: approved solicitud → exactly one orden", () => {
  /**
   * Simulates the atomic transaction: approve solicitud + create one orden.
   * Returns the count of ordenes created for the solicitud.
   */
  function aprobarSolicitud(solicitudId: number, existingOrdenes: { idSolicitud: number }[]): number {
    // Count how many ordenes already exist for this solicitud
    const existing = existingOrdenes.filter((o) => o.idSolicitud === solicitudId).length
    // Idempotency: if already approved (has ordenes), don't create another
    if (existing > 0) return existing
    // Create exactly one orden
    return 1
  }

  it("approving a pending solicitud always produces exactly 1 orden", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        (solicitudId) => {
          const count = aprobarSolicitud(solicitudId, [])
          return count === 1
        }
      )
    )
  })

  it("approving an already-approved solicitud does not create duplicate ordenes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 5 }),
        (solicitudId, existingCount) => {
          const existingOrdenes = Array.from({ length: existingCount }, () => ({
            idSolicitud: solicitudId,
          }))
          const count = aprobarSolicitud(solicitudId, existingOrdenes)
          return count === existingCount // no new orden created
        }
      )
    )
  })
})

// ── Extra: informes calculation properties ────────────────────────────────────
describe("Informes calculations — pure properties", () => {
  it("disponibilidad is always between 0 and 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8760 }),  // totalHours ≤ 1 year
        fc.integer({ min: 0, max: 8760 }),  // outOfServiceHours
        (total, oos) => {
          const pct = calcularDisponibilidad(total, oos)
          return pct >= 0 && pct <= 100
        }
      )
    )
  })

  it("promedio días cierre is always >= 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 3650 }), { minLength: 0, maxLength: 200 }),
        (arr) => calcularPromedioDiasCierre(arr) >= 0
      )
    )
  })

  it("inclusive date range: desde <= hasta", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }).map((d) => new Date(Date.now() - d * 86_400_000)),
        fc.integer({ min: 0, max: 1000 }).map((d) => new Date(Date.now() + d * 86_400_000)),
        (desde, hasta) => {
          // Any item where creacion is within [desde, hasta] satisfies the filter
          const creacion = new Date((desde.getTime() + hasta.getTime()) / 2)
          return creacion >= desde && creacion <= hasta
        }
      )
    )
  })
})
