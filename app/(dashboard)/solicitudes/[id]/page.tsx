import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { notFound } from "next/navigation"
import { SolicitudDetail } from "./SolicitudDetail"

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `Solicitud #${params.id} | Ziriuz` }
}

export default async function SolicitudPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)

  const solicitud = await prisma.solicitud.findUnique({
    where: { id },
    include: {
      estado: true,
      servicio: true,
      equipo: {
        include: {
          modelo: { include: { marca: true, clase: true } },
          sede: { include: { cliente: true, municipio: { include: { departamento: true } } } },
          area: true,
          tipo: true,
        },
      },
      creador: { select: { id: true, nombre: true } },
      ordenes: {
        include: { estado: true, creador: { select: { id: true, nombre: true } } },
        orderBy: { creacion: "desc" },
      },
    },
  })

  if (!solicitud) notFound()

  // Scope check
  if (sedeIds !== "all" && !sedeIds.includes(solicitud.equipo.idSede)) notFound()

  return (
    <SolicitudDetail
      solicitud={solicitud as unknown as Parameters<typeof SolicitudDetail>[0]["solicitud"]}
      canEdit={["administrador", "coordinador", "analista"].includes(rol)}
      canCreateOrden={["administrador", "coordinador"].includes(rol)}
    />
  )
}
