import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Building2, Cpu, MapPin } from "lucide-react"

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `Sede #${params.id} | Ziriuz` }
}

export default async function SedePage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = parseInt(session.user.id, 10)
  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const sede = await prisma.sede.findUnique({
    where: { id },
    include: {
      cliente: true,
      municipio: { include: { departamento: true } },
      equipos: {
        include: { modelo: { include: { marca: true } } },
        where: { activo: true },
        orderBy: { id: "asc" },
        take: 20,
      },
    },
  })

  if (!sede) notFound()
  if (sedeIds !== "all" && !(sedeIds as number[]).includes(sede.id)) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sedes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{sede.nombre}</h1>
          <p className="text-sm text-muted-foreground">Sede #{sede.id}</p>
        </div>
        <Badge variant={sede.activo ? "default" : "secondary"} className="ml-auto">
          {sede.activo ? "Activa" : "Inactiva"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Información de la sede</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span>{sede.nombre}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><Link href={`/clientes/${sede.cliente.id}`} className="text-primary hover:underline">{sede.cliente.nombre}</Link></div>
            {sede.direccion && <div className="flex justify-between"><span className="text-muted-foreground">Dirección</span><span>{sede.direccion}</span></div>}
            {sede.telefonos && <div className="flex justify-between"><span className="text-muted-foreground">Teléfonos</span><span>{sede.telefonos}</span></div>}
            {sede.correo && <div className="flex justify-between"><span className="text-muted-foreground">Correo</span><span>{sede.correo}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Ubicación</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Municipio</span><span>{sede.municipio.nombre}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Departamento</span><span>{sede.municipio.departamento.nombre}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4" />Equipos activos ({sede.equipos.length}{sede.equipos.length === 20 ? "+" : ""})</CardTitle></CardHeader>
        <CardContent>
          {sede.equipos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin equipos registrados</p>
          ) : (
            <div className="divide-y">
              {(sede.equipos as Array<{ id: number; serie: string | null; activoFijo: string | null; modelo: { modelo: string; marca: { marca: string } } }>).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/equipos/${e.id}`} className="font-medium text-primary hover:underline">
                    {e.modelo.marca.marca} {e.modelo.modelo}
                  </Link>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {e.serie && <span>S/N {e.serie}</span>}
                    {e.activoFijo && <span>AF {e.activoFijo}</span>}
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
