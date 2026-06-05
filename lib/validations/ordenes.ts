import { z } from "zod"

/**
 * Schema for creating a new Orden.
 * An Orden is always created from an existing Solicitud.
 */
export const ordenSchema = z.object({
  idSolicitud: z
    .number({ required_error: "Se requiere una solicitud de origen" })
    .int()
    .positive(),
})

export type OrdenInput = z.infer<typeof ordenSchema>

export const ordenUpdateSchema = z.object({
  idEstado: z.number().int().positive().optional(),
  observacionesCierre: z.string().max(2000).optional().nullable(),
  nombreRecibe: z.string().max(255).optional().nullable(),
  cedulaRecibe: z.string().max(50).optional().nullable(),
  solicitarDadoBaja: z.boolean().optional(),
  total: z.number().optional().nullable(),
})

export type OrdenUpdateInput = z.infer<typeof ordenUpdateSchema>

/** Used when assigning an OrdenCambio with a sub-state comment */
export const ordenCambioSchema = z.object({
  idSubEstado: z.number().int().positive({ message: "Selecciona un sub-estado" }),
  comentario: z.string().max(2000).optional().nullable(),
})

export type OrdenCambioInput = z.infer<typeof ordenCambioSchema>

/** Used to close an Orden */
export const cerrarOrdenSchema = z.object({
  observacionesCierre: z.string().min(10, "Mínimo 10 caracteres").max(2000),
  nombreRecibe: z.string().min(2).max(255).optional().nullable(),
  cedulaRecibe: z.string().max(50).optional().nullable(),
  solicitarDadoBaja: z.boolean().default(false),
  total: z.number().optional().nullable(),
  idAccionesFalla: z.number().int().positive().optional().nullable(),
  idsFallaModos: z.string().optional().nullable(),
})

export type CerrarOrdenInput = z.infer<typeof cerrarOrdenSchema>
