import { auth } from "@/lib/auth"
import { revocarSesion } from "@/lib/session-manager"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: { id: string } }

/**
 * DELETE /api/sesiones/[id] — revoke a session (admin only)
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden revocar sesiones" }, { status: 403 })
  }

  const id = parseInt(params.id)
  await revocarSesion(id)
  return NextResponse.json({ ok: true })
}
