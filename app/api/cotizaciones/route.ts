import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { cotizacionSchema } from "@/lib/validations/cotizaciones"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/cotizaciones — paginated list scoped by cliente access
 * Query params: page, pageSize, idEstado, idCliente, q (search on mensaje)
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
  const idEstado = searchParams.get("idEstado") ? parseInt(searchParams.get("idEstado")!) : undefined
  const idCliente = searchParams.get("idCliente") ? parseInt(searchParams.get("idCliente")!) : undefined
  const q = searchParams.get("q") ?? undefined

  // For non-admin/analista, restrict to clients of assigned sedes
  let clienteFilter: Record<string, unknown> = {}
  if (sedeIds !== "all") {
    const clientes = await prisma.sede.findMany({
      where: { id: { in: sedeIds } },
      select: { idCliente: true },
    })
    const clienteIds = [...new Set(clientes.map((s) => s.idCliente))]
    clienteFilter = { idCliente: { in: clienteIds } }
  }

  const where = {
    ...clienteFilter,
    ...(idEstado ? { idEstado } : {}),
    ...(idCliente ? { idCliente } : {}),
    ...(q ? { OR: [{ mensaje: { contains: q } }, { condiciones: { contains: q } }] } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.cotizacion.count({ where }),
    prisma.cotizacion.findMany({
      where,
      include: {
        estado: { select: { id: true, estado: true } },
        cliente: { select: { id: true, nombre: true } },
        creador: { select: { id: true, nombre: true } },
        _count: { select: { repuestos: true, itemsAdicionales: true } },
      },
      orderBy: { creacion: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/**
 * POST /api/cotizaciones — create a new cotizacion with nested repuestos and items
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"

  if (rol !== "administrador" && rol !== "coordinador" && rol !== "comercial" && rol !== "analista") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = cotizacionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // Validate cliente is active
  const cliente = await prisma.cliente.findUnique({
    where: { id: parsed.data.idCliente },
    select: { id: true, activo: true },
  })
  if (!cliente || !cliente.activo) {
    return NextResponse.json({ error: "Cliente no encontrado o inactivo" }, { status: 422 })
  }

  const { idCliente, idOrden, mensaje, condiciones, repuestos, itemsAdicionales } = parsed.data

  const cotizacion = await prisma.cotizacion.create({
    data: {
      idCliente,
      idOrden: idOrden ?? null,
      idCreador: userId,
      idEstado: 1, // Estado inicial: Borrador/Pendiente
      mensaje: mensaje ?? null,
      condiciones: condiciones ?? null,
      repuestos: {
        create: repuestos.map((r) => ({
          idRepuesto: r.idRepuesto,
          cantidad: r.cantidad,
          valor: r.valor,
        })),
      },
      itemsAdicionales: {
        create: itemsAdicionales.map((i) => ({
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          valor: i.valor,
        })),
      },
    },
    include: {
      repuestos: { include: { repuesto: true } },
      itemsAdicionales: true,
    },
  })

  return NextResponse.json(cotizacion, { status: 201 })
}
