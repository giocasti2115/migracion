import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { preventivoSchema } from "@/lib/validations/preventivos"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/preventivos — paginated list
 * Query params: page, pageSize, idEquipo, q (search on title)
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
  const idEquipo = searchParams.get("idEquipo") ? parseInt(searchParams.get("idEquipo")!) : undefined
  const q = searchParams.get("q") ?? undefined

  const where = {
    activo: true,
    ...(idEquipo ? { idEquipo } : {}),
    ...(q ? { title: { contains: q } } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.preventivo.count({ where }),
    prisma.preventivo.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, items })
}

/** POST /api/preventivos — create a new preventivo */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador" && rol !== "coordinador" && rol !== "analista") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = preventivoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  const { title, version, idEquipo, fechaProgramada, cualitativo, mantenimiento, cuantitativo, otros } = parsed.data

  const preventivo = await prisma.preventivo.create({
    data: {
      title,
      version: version ?? null,
      idEquipo: idEquipo ?? null,
      fechaProgramada: fechaProgramada ? new Date(fechaProgramada) : null,
      cualitativo: cualitativo ?? null,
      mantenimiento: mantenimiento ?? null,
      cuantitativo: cuantitativo ?? null,
      otros: otros ?? null,
    },
  })

  return NextResponse.json(preventivo, { status: 201 })
}
