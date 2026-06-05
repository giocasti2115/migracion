import { z } from "zod"

/**
 * Schema for creating/updating a Preventivo (mantenimiento preventivo).
 * Maps to the `preventivos` table: title, version, idEquipo, fechaProgramada.
 * The legacy comma-separated field columns (cualitativo, mantenimiento, etc.)
 * are passed as plain strings.
 */
export const preventivoSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres").max(255),
  version: z.string().max(50).optional().nullable(),
  idEquipo: z.number().int().positive().optional().nullable(),
  fechaProgramada: z.string().datetime().optional().nullable(),
  cualitativo: z.string().max(5000).optional().nullable(),
  mantenimiento: z.string().max(5000).optional().nullable(),
  cuantitativo: z.string().max(5000).optional().nullable(),
  otros: z.string().max(5000).optional().nullable(),
})

export type PreventivoInput = z.infer<typeof preventivoSchema>

export const preventivoUpdateSchema = preventivoSchema.partial()

export type PreventivoUpdateInput = z.infer<typeof preventivoUpdateSchema>
