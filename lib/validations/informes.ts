import { z } from "zod"

const _dateRangeBase = z.object({
  desde: z.string().datetime(),
  hasta: z.string().datetime(),
})

export const dateRangeSchema = _dateRangeBase.refine(
  (data) => new Date(data.desde) <= new Date(data.hasta),
  {
    message: "La fecha inicial no puede ser posterior a la fecha final",
    path: ["hasta"],
  }
)

export type DateRange = z.infer<typeof dateRangeSchema>

export const informeCorrectivosSchema = _dateRangeBase
  .extend({
    idCliente: z.number().int().positive().optional().nullable(),
    idSede: z.number().int().positive().optional().nullable(),
    idTecnico: z.number().int().positive().optional().nullable(),
    estado: z.enum(["todas", "abiertas", "cerradas"]).default("todas"),
  })
  .refine((data) => new Date(data.desde) <= new Date(data.hasta), {
    message: "La fecha inicial no puede ser posterior a la fecha final",
    path: ["hasta"],
  })

export type InformeCorrectivosInput = z.infer<typeof informeCorrectivosSchema>

export const informeIndicadoresSchema = _dateRangeBase
  .extend({
    idCliente: z.number().int().positive().optional().nullable(),
    agruparPor: z.enum(["mes", "sede", "tecnico", "tipo_servicio"]).default("mes"),
  })
  .refine((data) => new Date(data.desde) <= new Date(data.hasta), {
    message: "La fecha inicial no puede ser posterior a la fecha final",
    path: ["hasta"],
  })

export type InformeIndicadoresInput = z.infer<typeof informeIndicadoresSchema>

export const informeRepuestosSchema = _dateRangeBase
  .extend({
    idSede: z.number().int().positive().optional().nullable(),
    idRepuesto: z.number().int().positive().optional().nullable(),
  })
  .refine((data) => new Date(data.desde) <= new Date(data.hasta), {
    message: "La fecha inicial no puede ser posterior a la fecha final",
    path: ["hasta"],
  })

export type InformeRepuestosInput = z.infer<typeof informeRepuestosSchema>
