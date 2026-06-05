import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { usuarioUpdateSchema } from "@/lib/validations/usuarios"
import { hash } from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/** GET /api/usuarios/[id] — admin, or the user themselves */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const sessionUserId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const id = parseInt(params.id)

  if (rol !== "administrador" && sessionUserId !== id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id },
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
      vsSedes: { where: { activo: true }, include: { sede: { select: { id: true, nombre: true } } } },
      vsClientes: { where: { activo: true }, include: { cliente: { select: { id: true, nombre: true } } } },
    },
  })

  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(usuario)
}

/** PATCH /api/usuarios/[id] — admin only (for user data); user can only change their own via cambiar-clave */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden modificar usuarios" }, { status: 403 })
  }

  const id = parseInt(params.id)
  const body = await req.json()
  const parsed = usuarioUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 })
  }

  // If changing username, check uniqueness
  if (parsed.data.usuario) {
    const existing = await prisma.usuario.findFirst({
      where: { usuario: parsed.data.usuario, id: { not: id } },
    })
    if (existing) return NextResponse.json({ error: "El nombre de usuario ya existe" }, { status: 409 })
  }

  const usuario = await prisma.usuario.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: usuario.id, usuario: usuario.usuario, nombre: usuario.nombre })
}

/** DELETE /api/usuarios/[id] — soft delete, admin only */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden desactivar usuarios" }, { status: 403 })
  }

  // Prevent self-deactivation
  const sessionUserId = parseInt(session.user.id, 10)
  const id = parseInt(params.id)
  if (sessionUserId === id) {
    return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 })
  }

  const usuario = await prisma.usuario.update({ where: { id }, data: { activo: false } })
  return NextResponse.json({ id: usuario.id, activo: usuario.activo })
}
