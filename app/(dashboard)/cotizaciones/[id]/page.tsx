import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { notFound } from "next/navigation"
import { CotizacionDetail } from "./CotizacionDetail"

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `Cotización #${params.id} | Ziriuz` }
}

export default async function CotizacionPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)

  // Scope check: clientes reachable via sedes
  let clienteIds: number[] | undefined
  if (sedeIds !== "all") {
    const scopeSedes = await prisma.sede.findMany({
      where: { id: { in: sedeIds } },
      select: { idCliente: true },
    })
    const vsClientes = await prisma.usuarioVsCliente.findMany({
      where: { idUsuario: userId, activo: true },
      select: { idCliente: true },
    })
    clienteIds = [
      ...new Set([...scopeSedes.map((s) => s.idCliente), ...vsClientes.map((c) => c.idCliente)]),
    ]
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      estado: true,
      cliente: true,
      creador: { select: { id: true, nombre: true } },
      cambiador: { select: { id: true, nombre: true } },
      orden: {
        include: {
          solicitud: {
            include: {
              equipo: { include: { modelo: { include: { marca: true } }, sede: true } },
            },
          },
        },
      },
      repuestos: { include: { repuesto: true } },
      itemsAdicionales: true,
    },
  })

  if (!cotizacion) notFound()

  // Scope gate
  if (clienteIds && !clienteIds.includes(cotizacion.idCliente)) notFound()

  return (
    <CotizacionDetail
      cotizacion={cotizacion as unknown as Parameters<typeof CotizacionDetail>[0]["cotizacion"]}
      canEdit={["administrador", "analista", "comercial"].includes(rol)}
    />
  )
}
