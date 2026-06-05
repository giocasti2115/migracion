import { z } from "zod"

export const usuarioSchema = z.object({
  usuario: z.string().min(3).max(100).trim(),
  nombre: z.string().min(2).max(255),
  cedula: z.string().max(20).optional().nullable(),
  correo: z.string().email().max(255).optional().nullable(),
  telefonos: z.string().max(100).optional().nullable(),
  rol: z.enum(["administrador", "analista", "tecnico", "coordinador", "comercial"]),
  clave: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(200)
    .optional(),
})

export type UsuarioInput = z.infer<typeof usuarioSchema>

export const usuarioUpdateSchema = usuarioSchema.omit({ clave: true }).partial().extend({
  activo: z.boolean().optional(),
})

export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>

export const cambiarClaveSchema = z.object({
  claveActual: z.string().min(1),
  claveNueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
})

export type CambiarClaveInput = z.infer<typeof cambiarClaveSchema>
