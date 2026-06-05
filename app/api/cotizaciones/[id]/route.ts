import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cotizacionUpdateSchema } from "@/lib/validations/cotizaciones"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/** GET /api/cotizaciones/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const id = parseInt(params.id)
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      estado: true,
      cliente: true,
      creador: { select: { id: true, nombre: true } },
      cambiador: { select: { id: true, nombre: true } },
      orden: {
        select: {
          id: true,
          solicitud: {
            select: {
              equipo: {
                select: {
                  modelo: { select: { modelo: true, marca: { select: { marca: true } } } },
                  sede: { select: { nombre: true } },
                },
              },
            },
          },
        },
      },
      repuestos: {
        include: { repuesto: { select: { id: true, nombre: true } } },
      },
      itemsAdicionales: true,
    },
  })

  if (!cotizacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json(cotizacion)
}

/** PATCH /api/cotizaciones/[id] — update estado or metadata */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"

  if (rol !== "administrador" && rol !== "coordinador" && rol !== "comercial" && rol !== "analista") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const exists = await prisma.cotizacion.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const body = await req.json()
  const parsed = cotizacionUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const data: Record<string, unknown> = {}
  if (parsed.data.mensaje !== undefined) data.mensaje = parsed.data.mensaje
  if (parsed.data.condiciones !== undefined) data.condiciones = parsed.data.condiciones
  if (parsed.data.observacionEstado !== undefined) data.observacionEstado = parsed.data.observacionEstado
  if (parsed.data.idEstado !== undefined) {
    data.idEstado = parsed.data.idEstado
    data.idCambiador = userId
    data.cambioEstado = new Date()
  }

  const updated = await prisma.cotizacion.update({ where: { id }, data })
  return NextResponse.json(updated)
}
