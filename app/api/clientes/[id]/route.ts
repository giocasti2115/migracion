import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { clienteUpdateSchema } from "@/lib/validations/clientes"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/** GET /api/clientes/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const id = parseInt(params.id)
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      empresa: true,
      sedes: {
        where: { activo: true },
        include: { municipio: { include: { departamento: true } } },
        orderBy: { nombre: "asc" },
      },
      _count: { select: { cotizaciones: true } },
    },
  })

  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(cliente)
}

/** PATCH /api/clientes/[id] — admin only */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const body = await req.json()
  const parsed = clienteUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const cliente = await prisma.cliente.update({ where: { id }, data: parsed.data })
  return NextResponse.json(cliente)
}

/** DELETE /api/clientes/[id] — soft delete, admin only */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden desactivar clientes" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const cliente = await prisma.cliente.update({ where: { id }, data: { activo: false } })
  return NextResponse.json(cliente)
}
