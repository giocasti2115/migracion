import { z } from "zod"

export const equipoSchema = z.object({
  idModelo: z.number().int().positive(),
  idSede: z.number().int().positive(),
  idArea: z.number().int().positive().optional().nullable(),
  idTipo: z.number().int().positive().optional().nullable(),
  serie: z.string().max(100).optional().nullable(),
  activoFijo: z.string().max(100).optional().nullable(),
  ubicacion: z.string().max(255).optional().nullable(),
  mtto: z.boolean().optional().default(false),
})

export type EquipoInput = z.infer<typeof equipoSchema>

export const equipoUpdateSchema = equipoSchema.omit({ idModelo: true, idSede: true }).partial().extend({
  idModelo: z.number().int().positive().optional(),
  idSede: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
})

export type EquipoUpdateInput = z.infer<typeof equipoUpdateSchema>
