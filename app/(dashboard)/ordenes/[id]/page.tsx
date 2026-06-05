import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { OrdenDetail } from "./OrdenDetail"

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `Orden #${params.id}` }
}

export default async function OrdenPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const orden = await prisma.orden.findUnique({
    where: { id },
    include: {
      estado: true,
      solicitud: {
        include: {
          servicio: true,
          equipo: {
            include: {
              sede: { include: { cliente: { select: { id: true, nombre: true } } } },
              modelo: { include: { marca: true, clase: true } },
              area: true,
              tipo: true,
            },
          },
          creador: { select: { id: true, nombre: true } },
        },
      },
      creador: { select: { id: true, nombre: true } },
      cerrador: { select: { id: true, nombre: true } },
      accionFalla: true,
      visitas: {
        include: { estado: true, ejecutador: { select: { id: true, nombre: true } } },
        where: { activo: true },
        orderBy: { fechaInicio: "desc" },
      },
      cambios: {
        include: { subEstado: true, creador: { select: { id: true, nombre: true } } },
        orderBy: { fecha: "desc" },
      },
      adjuntos: { where: { activo: true } },
      cotizaciones: {
        select: { id: true, creacion: true, estado: { select: { estado: true } } },
        orderBy: { creacion: "desc" },
      },
    },
  })

  if (!orden) notFound()

  // Scope check
  if (sedeIds !== "all" && !sedeIds.includes(orden.solicitud.equipo.idSede)) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <OrdenDetail orden={orden as any} userRol={rol} />
}
