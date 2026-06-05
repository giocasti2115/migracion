import { auth } from "@/lib/auth"
import { getSesionesActivas } from "@/lib/session-manager"
import { NextResponse } from "next/server"

/**
 * GET /api/sesiones — list all active sessions (admin only)
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden ver sesiones activas" }, { status: 403 })
  }

  const sesiones = await getSesionesActivas()
  return NextResponse.json(sesiones)
}
