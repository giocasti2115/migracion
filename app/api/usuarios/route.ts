import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { usuarioSchema } from "@/lib/validations/usuarios"
import { hash } from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

/** GET /api/usuarios — list all users, admin only */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden listar usuarios" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
  const q = searchParams.get("q") ?? ""
  const soloActivos = searchParams.get("activo") !== "false"

  const where = {
    ...(soloActivos ? { activo: true } : {}),
    ...(q
      ? {
          OR: [
            { nombre: { contains: q } },
            { usuario: { contains: q } },
            { correo: { contains: q } },
          ],
        }
      : {}),
  }

  const [total, items] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: {
        id: true,
        usuario: true,
        nombre: true,
        cedula: true,
        correo: true,
        telefonos: true,
        activo: true,
        administrador: { select: { activo: true } },
        analista: { select: { activo: true } },
        tecnico: { select: { activo: true } },
        coordinador: { select: { activo: true } },
        comercial: { select: { activo: true } },
      },
      orderBy: { nombre: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  // Append computed `rol` to each user
  const itemsWithRol = items.map((u) => ({
    ...u,
    rol: u.administrador?.activo
      ? "administrador"
      : u.analista?.activo
      ? "analista"
      : u.coordinador?.activo
      ? "coordinador"
      : u.comercial?.activo
      ? "comercial"
      : u.tecnico?.activo
      ? "tecnico"
      : "sin_rol",
  }))

  return NextResponse.json({ total, page, pageSize, items: itemsWithRol })
}

/** POST /api/usuarios — create user, admin only */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = usuarioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  if (!parsed.data.clave) {
    return NextResponse.json({ error: "La clave es requerida al crear un usuario" }, { status: 422 })
  }

  // Check username uniqueness
  const existing = await prisma.usuario.findUnique({ where: { usuario: parsed.data.usuario } })
  if (existing) {
    return NextResponse.json({ error: "El nombre de usuario ya existe" }, { status: 409 })
  }

  const clave = await hash(parsed.data.clave, 12)
  const { rol: nuevoRol, clave: _, ...userData } = parsed.data

  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: { ...userData, clave },
    })
    // Create the role record (switch avoids union-type call issues)
    switch (nuevoRol) {
      case "administrador": await tx.administrador.create({ data: { idUsuario: u.id } }); break
      case "analista":      await tx.analista.create({ data: { idUsuario: u.id } }); break
      case "tecnico":       await tx.tecnico.create({ data: { idUsuario: u.id } }); break
      case "coordinador":   await tx.coordinador.create({ data: { idUsuario: u.id } }); break
      case "comercial":     await tx.comercial.create({ data: { idUsuario: u.id } }); break
    }
    return u
  })

  return NextResponse.json({ id: usuario.id, usuario: usuario.usuario, nombre: usuario.nombre }, { status: 201 })
}
