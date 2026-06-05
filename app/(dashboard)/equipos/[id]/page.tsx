import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Cpu, MapPin, Tag, Wrench } from "lucide-react"

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `Equipo #${params.id} | Ziriuz` }
}

export default async function EquipoPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: {
      modelo: { include: { marca: true, clase: true } },
      sede: { include: { cliente: true, municipio: { include: { departamento: true } } } },
      area: true,
      tipo: true,
      solicitudes: {
        include: { estado: true, servicio: true },
        orderBy: { creacion: "desc" },
        take: 10,
      },
    },
  })

  if (!equipo) notFound()
  if (sedeIds !== "all" && !sedeIds.includes(equipo.idSede)) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/equipos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {equipo.modelo.marca.marca} {equipo.modelo.modelo}
          </h1>
          <p className="text-sm text-muted-foreground">Equipo #{equipo.id}</p>
        </div>
        <Badge variant={equipo.activo ? "default" : "secondary"} className="ml-auto">
          {equipo.activo ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4" />Información del equipo</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Marca</span><span>{equipo.modelo.marca.marca}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Modelo</span><span>{equipo.modelo.modelo}</span></div>
            {equipo.modelo.clase && <div className="flex justify-between"><span className="text-muted-foreground">Clase</span><span>{equipo.modelo.clase.clase}</span></div>}
            {equipo.serie && <div className="flex justify-between"><span className="text-muted-foreground">Serie</span><span>{equipo.serie}</span></div>}
            {equipo.activoFijo && <div className="flex justify-between"><span className="text-muted-foreground">Activo fijo</span><span>{equipo.activoFijo}</span></div>}
            {equipo.ubicacion && <div className="flex justify-between"><span className="text-muted-foreground">Ubicación</span><span>{equipo.ubicacion}</span></div>}
            {equipo.area && <div className="flex justify-between"><span className="text-muted-foreground">Área</span><span>{equipo.area.area}</span></div>}
            {equipo.tipo && <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{equipo.tipo.tipo}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Mtto programado</span><Badge variant={equipo.mtto ? "default" : "outline"}>{equipo.mtto ? "Sí" : "No"}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Ubicación</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><Link href={`/clientes/${equipo.sede.cliente.id}`} className="text-primary hover:underline">{equipo.sede.cliente.nombre}</Link></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sede</span><Link href={`/sedes/${equipo.sede.id}`} className="text-primary hover:underline">{equipo.sede.nombre}</Link></div>
            {equipo.sede.direccion && <div className="flex justify-between"><span className="text-muted-foreground">Dirección</span><span>{equipo.sede.direccion}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Municipio</span><span>{equipo.sede.municipio.nombre}, {equipo.sede.municipio.departamento.nombre}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" />Últimas solicitudes</CardTitle></CardHeader>
        <CardContent>
          {equipo.solicitudes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin solicitudes registradas</p>
          ) : (
            <div className="divide-y">
              {(equipo.solicitudes as Array<{ id: number; aviso: string | null; creacion: Date; estado: { estado: string }; servicio: { servicio: string } | null }>).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <Link href={`/solicitudes/${s.id}`} className="font-medium text-primary hover:underline">#{s.id}</Link>
                    <span className="ml-2 text-muted-foreground">{s.servicio?.servicio ?? "—"}</span>
                    {s.aviso && <span className="ml-2">{s.aviso}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.estado.estado}</Badge>
                    <span className="text-muted-foreground">{new Date(s.creacion).toLocaleDateString("es-CO")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
