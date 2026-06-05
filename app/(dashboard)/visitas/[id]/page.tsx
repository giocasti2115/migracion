import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CalendarCheck, ClipboardList, User } from "lucide-react"

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `Visita #${params.id} | Ziriuz` }
}

export default async function VisitaPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const visita = await prisma.visita.findUnique({
    where: { id },
    include: {
      estado: true,
      ejecutador: { select: { id: true, nombre: true } },
      orden: {
        include: {
          estado: true,
          solicitud: {
            include: {
              servicio: true,
              equipo: {
                include: {
                  modelo: { include: { marca: true } },
                  sede: { include: { cliente: { select: { id: true, nombre: true } } } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!visita) notFound()

  const idSede = visita.orden.solicitud.equipo.idSede
  if (sedeIds !== "all" && !(sedeIds as number[]).includes(idSede)) notFound()

  const equipo = visita.orden.solicitud.equipo
  const sede = equipo.sede

  function formatDuracion(mins: number | null) {
    if (!mins) return "—"
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/visitas"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Visita #{visita.id}</h1>
          <p className="text-sm text-muted-foreground">
            Orden <Link href={`/ordenes/${visita.idOrden}`} className="text-primary hover:underline">#{visita.idOrden}</Link>
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">{visita.estado.estado}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4" />Detalles de la visita</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge variant="outline">{visita.estado.estado}</Badge></div>
            {visita.ejecutador && <div className="flex justify-between"><span className="text-muted-foreground">Técnico</span><span>{visita.ejecutador.nombre}</span></div>}
            {visita.fechaInicio && <div className="flex justify-between"><span className="text-muted-foreground">Inicio</span><span>{new Date(visita.fechaInicio).toLocaleString("es-CO")}</span></div>}
            {visita.fechaCierre && <div className="flex justify-between"><span className="text-muted-foreground">Cierre</span><span>{new Date(visita.fechaCierre).toLocaleString("es-CO")}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Duración</span><span>{formatDuracion(visita.duracion)}</span></div>
            {visita.observacionesCierre && (
              <div className="pt-2">
                <span className="text-muted-foreground block mb-1">Observaciones</span>
                <p className="rounded bg-muted px-2 py-1">{visita.observacionesCierre}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" />Equipo atendido</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Equipo</span><Link href={`/equipos/${equipo.id}`} className="text-primary hover:underline">{equipo.modelo.marca.marca} {equipo.modelo.modelo}</Link></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><Link href={`/clientes/${sede.cliente.id}`} className="text-primary hover:underline">{sede.cliente.nombre}</Link></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sede</span><Link href={`/sedes/${sede.id}`} className="text-primary hover:underline">{sede.nombre}</Link></div>
            {visita.orden.solicitud.servicio && <div className="flex justify-between"><span className="text-muted-foreground">Servicio</span><span>{visita.orden.solicitud.servicio.servicio}</span></div>}
          </CardContent>
        </Card>
      </div>

      {visita.actividades && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Actividades realizadas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{visita.actividades}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
