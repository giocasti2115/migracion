import { z } from "zod"

/**
 * Login schema — shared between client form and server authorize callback.
 * Requirement 15.1: all API routes validate input with Zod before DB operations.
 */
export const loginSchema = z.object({
  usuario: z
    .string()
    .min(1, "El usuario es requerido")
    .max(100, "El usuario no puede superar 100 caracteres")
    .trim(),
  clave: z
    .string()
    .min(1, "La contraseña es requerida")
    .max(200, "La contraseña no puede superar 200 caracteres"),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Change password schema.
 */
export const cambiarClaveSchema = z
  .object({
    claveActual: z.string().min(1, "La contraseña actual es requerida"),
    claveNueva: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .max(200, "La contraseña no puede superar 200 caracteres"),
    confirmarClave: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((data) => data.claveNueva === data.confirmarClave, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarClave"],
  })

export type CambiarClaveInput = z.infer<typeof cambiarClaveSchema>
