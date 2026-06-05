import { z } from "zod"

/**
 * Cotización schema — maps to `cotizaciones` table.
 * Lineas = CotizacionRepuesto[] + CotizacionItemAdicional[]
 */

export const cotizacionRepuestoSchema = z.object({
  idRepuesto: z.number().int().positive({ message: "Selecciona un repuesto" }),
  cantidad: z.number().int().positive({ message: "Cantidad debe ser positiva" }),
  valor: z.number().min(0, "Valor no puede ser negativo"),
})

export type CotizacionRepuestoInput = z.infer<typeof cotizacionRepuestoSchema>

export const cotizacionItemAdicionalSchema = z.object({
  descripcion: z.string().min(1).max(2000),
  cantidad: z.number().int().positive(),
  valor: z.number().min(0),
})

export type CotizacionItemAdicionalInput = z.infer<typeof cotizacionItemAdicionalSchema>

export const cotizacionSchema = z.object({
  idCliente: z.number({ required_error: "Selecciona un cliente" }).int().positive(),
  idOrden: z.number().int().positive().optional().nullable(),
  mensaje: z.string().max(5000).optional().nullable(),
  condiciones: z.string().max(5000).optional().nullable(),
  repuestos: z.array(cotizacionRepuestoSchema).optional().default([]),
  itemsAdicionales: z.array(cotizacionItemAdicionalSchema).optional().default([]),
}).refine(
  (d) => d.repuestos.length + d.itemsAdicionales.length > 0,
  { message: "Agrega al menos un repuesto o ítem adicional" }
)

export type CotizacionInput = z.infer<typeof cotizacionSchema>

export const cotizacionUpdateSchema = z.object({
  mensaje: z.string().max(5000).optional().nullable(),
  condiciones: z.string().max(5000).optional().nullable(),
  observacionEstado: z.string().max(2000).optional().nullable(),
  idEstado: z.number().int().positive().optional(),
})

export type CotizacionUpdateInput = z.infer<typeof cotizacionUpdateSchema>
