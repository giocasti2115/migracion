import { z } from "zod"

/**
 * Schema for creating a new Solicitud.
 * Maps to the `solicitudes` table: aviso (short), observacion (long), idEquipo, idServicio.
 */
export const solicitudSchema = z.object({
  aviso: z.string().min(3, "Mínimo 3 caracteres").max(255).optional().nullable(),
  observacion: z
    .string()
    .min(10, "Describe el problema con al menos 10 caracteres")
    .max(5000)
    .optional()
    .nullable(),
  idEquipo: z
    .number({ required_error: "Selecciona el equipo" })
    .int()
    .positive(),
  idServicio: z
    .number({ required_error: "Selecciona el tipo de servicio" })
    .int()
    .positive(),
})

export type SolicitudInput = z.infer<typeof solicitudSchema>

export const solicitudUpdateSchema = z.object({
  aviso: z.string().min(3).max(255).optional().nullable(),
  observacion: z.string().max(5000).optional().nullable(),
  observacionEstado: z.string().max(1000).optional().nullable(),
  idEstado: z.number().int().positive().optional(),
})

export type SolicitudUpdateInput = z.infer<typeof solicitudUpdateSchema>
