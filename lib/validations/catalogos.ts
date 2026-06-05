import { z } from "zod"

// Marca: { marca }
export const marcaSchema = z.object({ marca: z.string().min(1).max(255) })
export type MarcaInput = z.infer<typeof marcaSchema>

// Clase: { clase, idPreventivo? }
export const claseSchema = z.object({
  clase: z.string().min(1).max(255),
  idPreventivo: z.number().int().positive().optional().nullable(),
})
export type ClaseInput = z.infer<typeof claseSchema>

// Modelo: { modelo, idClase, idMarca, idPreventivo?, activo }
export const modeloSchema = z.object({
  modelo: z.string().min(1).max(255),
  idClase: z.number().int().positive(),
  idMarca: z.number().int().positive(),
  idPreventivo: z.number().int().positive().optional().nullable(),
  activo: z.boolean().optional().default(true),
})
export const modeloUpdateSchema = modeloSchema.partial()
export type ModeloInput = z.infer<typeof modeloSchema>

// Area: { area }
export const areaSchema = z.object({ area: z.string().min(1).max(255) })
export type AreaInput = z.infer<typeof areaSchema>

// Tipo: { tipo }
export const tipoSchema = z.object({ tipo: z.string().min(1).max(255) })
export type TipoInput = z.infer<typeof tipoSchema>

// Servicio: { servicio }
export const servicioSchema = z.object({ servicio: z.string().min(1).max(255) })
export type ServicioInput = z.infer<typeof servicioSchema>

// FallaModo / FallaCausa / FallaAccion: { titulo }
export const fallaTituloSchema = z.object({ titulo: z.string().min(1).max(255) })
export type FallaTituloInput = z.infer<typeof fallaTituloSchema>

// Repuesto: { nombre }
export const repuestoSchema = z.object({ nombre: z.string().min(1).max(255) })
export type RepuestoInput = z.infer<typeof repuestoSchema>

// Protocolo: { title }
export const protocoloSchema = z.object({ title: z.string().min(1).max(255) })
export type ProtocoloInput = z.infer<typeof protocoloSchema>
