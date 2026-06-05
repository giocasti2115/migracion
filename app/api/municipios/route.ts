import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/** GET /api/municipios — list all municipios with their departamento */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get("q") ?? ""
  const pageSize = Math.min(1200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "1200")))

  const where = q ? { nombre: { contains: q } } : {}

  const items = await prisma.municipio.findMany({
    where,
    include: { departamento: true },
    orderBy: [{ departamento: { nombre: "asc" } }, { nombre: "asc" }],
    take: pageSize,
  })

  return NextResponse.json({ total: items.length, items })
}
