import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Building2, MapPin } from "lucide-react"

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `Cliente #${params.id} | Ziriuz` }
}

export default async function ClientePage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const userId = parseInt(session.user.id, 10)
  const sedeIds = await getSedesRelacionadas(userId, rol)

  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      empresa: true,
      sedes: {
        include: { municipio: { include: { departamento: true } } },
        where: sedeIds === "all" ? undefined : { id: { in: sedeIds as number[] } },
        orderBy: { nombre: "asc" },
      },
    },
  })

  if (!cliente) notFound()

  // For non-admin roles, only show if they have access to at least one sede of this client
  if (sedeIds !== "all" && cliente.sedes.length === 0) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nombre}</h1>
          <p className="text-sm text-muted-foreground">Cliente #{cliente.id}</p>
        </div>
        <Badge variant={cliente.activo ? "default" : "secondary"} className="ml-auto">
          {cliente.activo ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Información general</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span>{cliente.nombre}</span></div>
          {cliente.nit && <div className="flex justify-between"><span className="text-muted-foreground">NIT</span><span>{cliente.nit}</span></div>}
          {cliente.correo && <div className="flex justify-between"><span className="text-muted-foreground">Correo</span><span>{cliente.correo}</span></div>}
          {cliente.empresa && <div className="flex justify-between"><span className="text-muted-foreground">Empresa</span><span>{cliente.empresa.nombre}</span></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Sedes ({cliente.sedes.length})</CardTitle></CardHeader>
        <CardContent>
          {cliente.sedes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin sedes registradas</p>
          ) : (
            <div className="divide-y">
              {(cliente.sedes as Array<{ id: number; nombre: string; activo: boolean; telefonos: string | null; municipio: { nombre: string; departamento: { nombre: string } } }>).map((sede) => (
                <div key={sede.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <Link href={`/sedes/${sede.id}`} className="font-medium text-primary hover:underline">{sede.nombre}</Link>
                    <span className="ml-2 text-muted-foreground">{sede.municipio.nombre}, {sede.municipio.departamento.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sede.telefonos && <span className="text-muted-foreground">{sede.telefonos}</span>}
                    <Badge variant={sede.activo ? "default" : "secondary"}>{sede.activo ? "Activa" : "Inactiva"}</Badge>
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
