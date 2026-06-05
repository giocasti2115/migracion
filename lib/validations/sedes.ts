import { z } from "zod"

export const sedeSchema = z.object({
  nombre: z.string().min(2).max(255),
  idCliente: z.number().int().positive(),
  idMunicipio: z.number().int().positive(),
  direccion: z.string().max(500).optional().nullable(),
  telefonos: z.string().max(100).optional().nullable(),
  correo: z.string().email().max(255).optional().nullable(),
})

export type SedeInput = z.infer<typeof sedeSchema>

export const sedeUpdateSchema = sedeSchema.partial().extend({
  activo: z.boolean().optional(),
})

export type SedeUpdateInput = z.infer<typeof sedeUpdateSchema>
