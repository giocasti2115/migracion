import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  marcaSchema, claseSchema, modeloSchema, modeloUpdateSchema, areaSchema, tipoSchema,
  servicioSchema, fallaTituloSchema, repuestoSchema, protocoloSchema,
} from "@/lib/validations/catalogos"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Params = { params: { catalogo: string; id: string } }

const CATALOGO_CONFIG = {
  marcas:           { model: "marca"       as const, schema: marcaSchema,        updateSchema: marcaSchema.partial() },
  clases:           { model: "clase"       as const, schema: claseSchema,         updateSchema: claseSchema.partial() },
  modelos:          { model: "modelo"      as const, schema: modeloSchema,        updateSchema: modeloUpdateSchema },
  areas:            { model: "area"        as const, schema: areaSchema,          updateSchema: areaSchema.partial() },
  tipos:            { model: "tipo"        as const, schema: tipoSchema,          updateSchema: tipoSchema.partial() },
  servicios:        { model: "servicio"    as const, schema: servicioSchema,      updateSchema: servicioSchema.partial() },
  "fallas-modos":   { model: "fallaModo"   as const, schema: fallaTituloSchema,   updateSchema: fallaTituloSchema.partial() },
  "fallas-causas":  { model: "fallaCausa"  as const, schema: fallaTituloSchema,   updateSchema: fallaTituloSchema.partial() },
  "fallas-acciones":{ model: "fallaAccion" as const, schema: fallaTituloSchema,   updateSchema: fallaTituloSchema.partial() },
  repuestos:        { model: "repuesto"    as const, schema: repuestoSchema,      updateSchema: repuestoSchema.partial() },
  protocolos:       { model: "protocolo"   as const, schema: protocoloSchema,     updateSchema: protocoloSchema.partial() },
} as const

type CatalogoKey = keyof typeof CATALOGO_CONFIG

function requireAdmin(session: { user?: Record<string, unknown> } | null) {
  const rol = (session?.user?.role as string | undefined) ?? "tecnico"
  return rol === "administrador"
}

/** GET /api/catalogos/[catalogo]/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const catalogo = params.catalogo as CatalogoKey
  const config = CATALOGO_CONFIG[catalogo]
  if (!config) return NextResponse.json({ error: "Catálogo no encontrado" }, { status: 404 })

  const id = parseInt(params.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await (prisma as any)[config.model].findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(item)
}

/** PATCH /api/catalogos/[catalogo]/[id] */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Solo administradores pueden modificar catálogos" }, { status: 403 })
  }

  const catalogo = params.catalogo as CatalogoKey
  const config = CATALOGO_CONFIG[catalogo]
  if (!config) return NextResponse.json({ error: "Catálogo no encontrado" }, { status: 404 })

  const id = parseInt(params.id)
  const body = await req.json()
  const parsed = (config.updateSchema as z.ZodTypeAny).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await (prisma as any)[config.model].update({ where: { id }, data: parsed.data })
  return NextResponse.json(item)
}

/** DELETE /api/catalogos/[catalogo]/[id] — hard delete, admin only */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Solo administradores pueden eliminar catálogos" }, { status: 403 })
  }

  const catalogo = params.catalogo as CatalogoKey
  const config = CATALOGO_CONFIG[catalogo]
  if (!config) return NextResponse.json({ error: "Catálogo no encontrado" }, { status: 404 })

  const id = parseInt(params.id)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any)[config.model].delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "No se puede eliminar — existen registros relacionados" },
      { status: 409 }
    )
  }
}
