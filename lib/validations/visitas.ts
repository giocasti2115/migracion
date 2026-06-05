import { z } from "zod"

/**
 * Schema for creating a new Visita.
 * Maps to the `visitas` table: idOrden, idEstado (initial: 1), idEjecutador (optional).
 * fechaProgramada is a new additive column.
 */
export const visitaSchema = z.object({
  idOrden: z.number({ required_error: "Se requiere la orden" }).int().positive(),
  idEjecutador: z.number().int().positive().optional().nullable(),
  fechaProgramada: z.string().datetime().optional().nullable(),
})

export type VisitaInput = z.infer<typeof visitaSchema>

/**
 * Valid state transitions:
 *  1 (Pendiente) → 2 (Aprobada) → 3 (Abierta) → 4 (Cerrada)
 *  Any state → 5 (Rechazada) if motivo provided
 */
export const visitaEstadoTransicionSchema = z.object({
  idEstado: z.number().int().positive(),
  motivoRechazo: z.string().max(500).optional().nullable(),
  observacionesCierre: z.string().max(1000).optional().nullable(),
})

export type VisitaEstadoTransicionInput = z.infer<typeof visitaEstadoTransicionSchema>

export const visitaUpdateSchema = z.object({
  idEjecutador: z.number().int().positive().optional().nullable(),
  fechaProgramada: z.string().datetime().optional().nullable(),
  fechaInicio: z.string().datetime().optional().nullable(),
  fechaCierre: z.string().datetime().optional().nullable(),
  duracion: z.number().int().positive().optional().nullable(),
  observacionesCierre: z.string().max(1000).optional().nullable(),
  motivoRechazo: z.string().max(500).optional().nullable(),
})

export type VisitaUpdateInput = z.infer<typeof visitaUpdateSchema>
