import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  marcaSchema, claseSchema, modeloSchema, areaSchema, tipoSchema,
  servicioSchema, fallaTituloSchema, repuestoSchema, protocoloSchema,
} from "@/lib/validations/catalogos"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Params = { params: { catalogo: string } }

/** Supported catalog names and their Prisma model + validation schema */
const CATALOGO_CONFIG = {
  marcas:         { model: "marca"       as const, schema: marcaSchema,        field: "marca" },
  clases:         { model: "clase"       as const, schema: claseSchema,         field: "clase" },
  modelos:        { model: "modelo"      as const, schema: modeloSchema,        field: "modelo" },
  areas:          { model: "area"        as const, schema: areaSchema,          field: "area" },
  tipos:          { model: "tipo"        as const, schema: tipoSchema,          field: "tipo" },
  servicios:      { model: "servicio"    as const, schema: servicioSchema,      field: "servicio" },
  "fallas-modos": { model: "fallaModo"   as const, schema: fallaTituloSchema,   field: "titulo" },
  "fallas-causas":{ model: "fallaCausa"  as const, schema: fallaTituloSchema,   field: "titulo" },
  "fallas-acciones":{ model: "fallaAccion" as const, schema: fallaTituloSchema, field: "titulo" },
  repuestos:      { model: "repuesto"    as const, schema: repuestoSchema,      field: "nombre" },
  protocolos:     { model: "protocolo"   as const, schema: protocoloSchema,     field: "title" },
} as const

type CatalogoKey = keyof typeof CATALOGO_CONFIG

/** GET /api/catalogos/[catalogo] — list */
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const catalogo = params.catalogo as CatalogoKey
  const config = CATALOGO_CONFIG[catalogo]
  if (!config) return NextResponse.json({ error: "Catálogo no encontrado" }, { status: 404 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get("q") ?? ""
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "100")))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[config.model]
  const where = q ? { [config.field]: { contains: q } } : {}

  const [total, items] = await Promise.all([
    delegate.count({ where }),
    delegate.findMany({
      where,
      orderBy: { [config.field]: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/** POST /api/catalogos/[catalogo] — create (admin only) */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden modificar catálogos" }, { status: 403 })
  }

  const catalogo = params.catalogo as CatalogoKey
  const config = CATALOGO_CONFIG[catalogo]
  if (!config) return NextResponse.json({ error: "Catálogo no encontrado" }, { status: 404 })

  const body = await req.json()
  const parsed = (config.schema as z.ZodTypeAny).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[config.model]
  const item = await delegate.create({ data: parsed.data })
  return NextResponse.json(item, { status: 201 })
}
