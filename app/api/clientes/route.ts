import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { clienteSchema } from "@/lib/validations/clientes"
import { NextRequest, NextResponse } from "next/server"

/** GET /api/clientes */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
  const q = searchParams.get("q") ?? ""
  const soloActivos = searchParams.get("activo") !== "false"

  // Build client-scope filter: admins/analistas see all; others see clients via their sedes
  let clienteIds: number[] | undefined
  if (sedeIds !== "all") {
    const sedes = await prisma.sede.findMany({
      where: { id: { in: sedeIds } },
      select: { idCliente: true },
    })
    // Also check usuarios_vs_clientes
    const vsClientes = await prisma.usuarioVsCliente.findMany({
      where: { idUsuario: userId, activo: true },
      select: { idCliente: true },
    })
    const fromSedes = sedes.map((s) => s.idCliente)
    const fromClientes = vsClientes.map((c) => c.idCliente)
    clienteIds = [...new Set([...fromSedes, ...fromClientes])]
  }

  const where: Record<string, unknown> = {
    ...(soloActivos ? { activo: true } : {}),
    ...(clienteIds ? { id: { in: clienteIds } } : {}),
    ...(q ? { nombre: { contains: q } } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        _count: { select: { sedes: true } },
      },
      orderBy: { nombre: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/** POST /api/clientes — admin only */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden crear clientes" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = clienteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const cliente = await prisma.cliente.create({ data: parsed.data })
  return NextResponse.json(cliente, { status: 201 })
}
