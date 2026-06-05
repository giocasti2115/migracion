import { z } from "zod"

export const clienteSchema = z.object({
  nombre: z.string().min(2).max(255),
  nit: z.string().max(20).optional().nullable(),
  correo: z.string().email().max(255).optional().nullable(),
  idEmpresa: z.number().int().positive().optional().nullable(),
})

export type ClienteInput = z.infer<typeof clienteSchema>

export const clienteUpdateSchema = clienteSchema.partial().extend({
  activo: z.boolean().optional(),
})

export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>
