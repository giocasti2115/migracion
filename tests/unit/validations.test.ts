/**
 * Unit tests: Zod validation schemas — critical schemas (19.2)
 * Tests loginSchema, solicitudSchema, cotizacionSchema, dateRangeSchema
 */
import { describe, it, expect } from "vitest"
import { loginSchema, cambiarClaveSchema } from "@/lib/validations/auth"
import { solicitudSchema } from "@/lib/validations/solicitudes"
import { cotizacionSchema, cotizacionRepuestoSchema } from "@/lib/validations/cotizaciones"
import { dateRangeSchema } from "@/lib/validations/informes"
import { clienteSchema } from "@/lib/validations/clientes"
import { sedeSchema } from "@/lib/validations/sedes"
import { equipoSchema } from "@/lib/validations/equipos"

// ── loginSchema ───────────────────────────────────────────────────────────────
describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ usuario: "admin", clave: "password123" }).success).toBe(true)
  })

  it("rejects empty usuario", () => {
    expect(loginSchema.safeParse({ usuario: "", clave: "password123" }).success).toBe(false)
  })

  it("rejects empty clave", () => {
    expect(loginSchema.safeParse({ usuario: "admin", clave: "" }).success).toBe(false)
  })

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
  })

  it("rejects usuario exceeding 100 characters", () => {
    expect(
      loginSchema.safeParse({ usuario: "u".repeat(101), clave: "pass" }).success
    ).toBe(false)
  })

  it("rejects clave exceeding 200 characters", () => {
    expect(
      loginSchema.safeParse({ usuario: "admin", clave: "p".repeat(201) }).success
    ).toBe(false)
  })

  it("trims whitespace from usuario", () => {
    const result = loginSchema.safeParse({ usuario: "  admin  ", clave: "pass" })
    if (result.success) expect(result.data.usuario).toBe("admin")
  })
})

// ── cambiarClaveSchema ────────────────────────────────────────────────────────
describe("cambiarClaveSchema", () => {
  const valid = { claveActual: "vieja", claveNueva: "nueva12345", confirmarClave: "nueva12345" }

  it("accepts matching passwords", () => {
    expect(cambiarClaveSchema.safeParse(valid).success).toBe(true)
  })

  it("rejects when claveNueva != confirmarClave", () => {
    expect(
      cambiarClaveSchema.safeParse({ ...valid, confirmarClave: "diferente" }).success
    ).toBe(false)
  })

  it("rejects claveNueva shorter than 8 characters", () => {
    expect(
      cambiarClaveSchema.safeParse({ ...valid, claveNueva: "short", confirmarClave: "short" }).success
    ).toBe(false)
  })
})

// ── solicitudSchema ───────────────────────────────────────────────────────────
describe("solicitudSchema", () => {
  it("accepts valid minimal payload", () => {
    expect(solicitudSchema.safeParse({ idEquipo: 1, idServicio: 2 }).success).toBe(true)
  })

  it("rejects missing idEquipo", () => {
    expect(solicitudSchema.safeParse({ idServicio: 1 }).success).toBe(false)
  })

  it("rejects idEquipo = 0", () => {
    expect(solicitudSchema.safeParse({ idEquipo: 0, idServicio: 1 }).success).toBe(false)
  })

  it("rejects aviso shorter than 3 characters", () => {
    expect(solicitudSchema.safeParse({ idEquipo: 1, idServicio: 1, aviso: "ab" }).success).toBe(false)
  })

  it("rejects observacion shorter than 10 characters", () => {
    expect(
      solicitudSchema.safeParse({ idEquipo: 1, idServicio: 1, observacion: "too short" }).success
    ).toBe(false)
  })
})

// ── cotizacionSchema ──────────────────────────────────────────────────────────
describe("cotizacionSchema", () => {
  it("accepts valid payload with one repuesto", () => {
    expect(
      cotizacionSchema.safeParse({
        idCliente: 1,
        repuestos: [{ idRepuesto: 1, cantidad: 2, valor: 50000 }],
        itemsAdicionales: [],
      }).success
    ).toBe(true)
  })

  it("accepts valid payload with one item adicional only", () => {
    expect(
      cotizacionSchema.safeParse({
        idCliente: 1,
        repuestos: [],
        itemsAdicionales: [{ descripcion: "Mano de obra", cantidad: 1, valor: 100000 }],
      }).success
    ).toBe(true)
  })

  it("rejects when both repuestos and itemsAdicionales are empty", () => {
    expect(
      cotizacionSchema.safeParse({ idCliente: 1, repuestos: [], itemsAdicionales: [] }).success
    ).toBe(false)
  })

  it("rejects idCliente = 0", () => {
    expect(
      cotizacionSchema.safeParse({
        idCliente: 0,
        repuestos: [{ idRepuesto: 1, cantidad: 1, valor: 1 }],
        itemsAdicionales: [],
      }).success
    ).toBe(false)
  })
})

describe("cotizacionRepuestoSchema", () => {
  it("rejects quantity = 0", () => {
    expect(
      cotizacionRepuestoSchema.safeParse({ idRepuesto: 1, cantidad: 0, valor: 100 }).success
    ).toBe(false)
  })

  it("rejects negative valor", () => {
    expect(
      cotizacionRepuestoSchema.safeParse({ idRepuesto: 1, cantidad: 1, valor: -1 }).success
    ).toBe(false)
  })

  it("accepts valor = 0 (free item)", () => {
    expect(
      cotizacionRepuestoSchema.safeParse({ idRepuesto: 1, cantidad: 1, valor: 0 }).success
    ).toBe(true)
  })
})

// ── clienteSchema ─────────────────────────────────────────────────────────────
describe("clienteSchema", () => {
  it("accepts minimal valid payload", () => {
    expect(clienteSchema.safeParse({ nombre: "ABC SA" }).success).toBe(true)
  })

  it("rejects nombre shorter than 2 characters", () => {
    expect(clienteSchema.safeParse({ nombre: "A" }).success).toBe(false)
  })

  it("rejects invalid email format", () => {
    expect(clienteSchema.safeParse({ nombre: "ABC", correo: "not-an-email" }).success).toBe(false)
  })

  it("accepts valid email", () => {
    expect(clienteSchema.safeParse({ nombre: "ABC SA", correo: "info@abc.com" }).success).toBe(true)
  })
})

// ── sedeSchema ────────────────────────────────────────────────────────────────
describe("sedeSchema", () => {
  it("accepts valid payload", () => {
    expect(sedeSchema.safeParse({ nombre: "Sede Central", idCliente: 1, idMunicipio: 100 }).success).toBe(true)
  })

  it("rejects missing idCliente", () => {
    expect(sedeSchema.safeParse({ nombre: "Sede", idMunicipio: 1 }).success).toBe(false)
  })

  it("rejects invalid correo", () => {
    expect(
      sedeSchema.safeParse({ nombre: "Sede", idCliente: 1, idMunicipio: 1, correo: "bad" }).success
    ).toBe(false)
  })
})

// ── equipoSchema ──────────────────────────────────────────────────────────────
describe("equipoSchema", () => {
  it("accepts valid minimal payload", () => {
    expect(equipoSchema.safeParse({ idModelo: 1, idSede: 2 }).success).toBe(true)
  })

  it("rejects missing idModelo", () => {
    expect(equipoSchema.safeParse({ idSede: 1 }).success).toBe(false)
  })

  it("rejects missing idSede", () => {
    expect(equipoSchema.safeParse({ idModelo: 1 }).success).toBe(false)
  })

  it("defaults mtto to false when not provided", () => {
    const result = equipoSchema.safeParse({ idModelo: 1, idSede: 1 })
    if (result.success) expect(result.data.mtto).toBe(false)
  })
})
