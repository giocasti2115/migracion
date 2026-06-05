"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Lock, Unlock, Clock, CheckCircle2, FileText } from "lucide-react"
import Link from "next/link"

type Orden = {
  id: number
  creacion: string | Date
  cierre: string | Date | null
  total: number | string | null
  observacionesCierre: string | null
  nombreRecibe: string | null
  cedulaRecibe: string | null
  solicitarDadoBaja: boolean
  estado: { id: number; estado: string }
  solicitud: {
    id: number
    aviso: string | null
    observacion: string | null
    servicio: { id: number; servicio: string }
    equipo: {
      id: number
      serie: string | null
      activoFijo: string | null
      ubicacion: string | null
      sede: { id: number; nombre: string; cliente: { id: number; nombre: string } }
      modelo: { id: number; modelo: string; marca: { marca: string }; clase: { clase: string } }
      area: { area: string } | null
      tipo: { tipo: string } | null
    }
    creador: { id: number; nombre: string }
  }
  creador: { id: number; nombre: string }
  cerrador: { id: number; nombre: string } | null
  accionFalla: { id: number; titulo: string } | null
  visitas: {
    id: number
    fechaInicio: string | Date | null
    fechaCierre: string | Date | null
    duracion: number | null
    estado: { id: number; estado: string }
    ejecutador: { id: number; nombre: string } | null
  }[]
  cambios: {
    id: number
    fecha: string | Date
    comentario: string | null
    subEstado: { id: number; subEstado: string }
    creador: { id: number; nombre: string }
  }[]
  adjuntos: { id: number; nombre: string }[]
  cotizaciones: { id: number; creacion: string | Date; estado: { estado: string } }[]
}

type Props = { orden: Orden; userRol: string }

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  Abierta: "warning",
  "En proceso": "info",
  Cerrada: "success",
  Anulada: "destructive",
}

export function OrdenDetail({ orden, userRol }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [closingOpen, setClosingOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [observaciones, setObservaciones] = useState("")
  const [nombreRecibe, setNombreRecibe] = useState("")
  const [loading, setLoading] = useState(false)

  const isClosed = Boolean(orden.cierre)
  const canClose = !isClosed && (userRol === "administrador" || userRol === "coordinador" || userRol === "tecnico")
  const canReopen = isClosed && (userRol === "administrador" || userRol === "coordinador")

  async function handleCerrar() {
    if (!observaciones.trim()) {
      toast({ title: "Error", description: "Ingresa las observaciones de cierre", variant: "destructive" })
      return
    }
    setLoading(true)
    const res = await fetch(`/api/ordenes/${orden.id}/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        observacionesCierre: observaciones,
        nombreRecibe: nombreRecibe || null,
        solicitarDadoBaja: false,
      }),
    })
    setLoading(false)
    if (res.ok) {
      toast({ title: "Orden cerrada correctamente" })
      setClosingOpen(false)
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ title: "Error al cerrar", description: err.error ?? "Intenta nuevamente", variant: "destructive" })
    }
  }

  async function handleReabrir() {
    setLoading(true)
    const res = await fetch(`/api/ordenes/${orden.id}/reabrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comentario: observaciones || null }),
    })
    setLoading(false)
    if (res.ok) {
      toast({ title: "Orden reabierta" })
      setReopenOpen(false)
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ title: "Error al reabrir", description: err.error ?? "Intenta nuevamente", variant: "destructive" })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ordenes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              Orden #{orden.id}
              <Badge variant={ESTADO_VARIANT[orden.estado.estado] ?? "secondary"}>
                {orden.estado.estado}
              </Badge>
              {isClosed && <Lock className="h-4 w-4 text-muted-foreground" />}
            </h1>
            <p className="text-sm text-muted-foreground">
              Creada {formatDate(String(orden.creacion))} por {orden.creador.nombre}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canClose && (
            <Button onClick={() => setClosingOpen(true)} variant="default">
              <Lock className="h-4 w-4 mr-2" /> Cerrar orden
            </Button>
          )}
          {canReopen && (
            <Button onClick={() => setReopenOpen(true)} variant="outline">
              <Unlock className="h-4 w-4 mr-2" /> Reabrir
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="visitas">Visitas ({orden.visitas.length})</TabsTrigger>
          <TabsTrigger value="timeline">Historial ({orden.cambios.length})</TabsTrigger>
          {orden.cotizaciones.length > 0 && (
            <TabsTrigger value="cotizaciones">Cotizaciones ({orden.cotizaciones.length})</TabsTrigger>
          )}
        </TabsList>

        {/* INFO TAB */}
        <TabsContent value="info" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Equipo</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Modelo" value={`${orden.solicitud.equipo.modelo.marca.marca} — ${orden.solicitud.equipo.modelo.modelo}`} />
              <Row label="Clase" value={orden.solicitud.equipo.modelo.clase.clase} />
              {orden.solicitud.equipo.tipo && <Row label="Tipo" value={orden.solicitud.equipo.tipo.tipo} />}
              {orden.solicitud.equipo.area && <Row label="Área" value={orden.solicitud.equipo.area.area} />}
              <Row label="Serie" value={orden.solicitud.equipo.serie ?? "—"} />
              <Row label="Activo fijo" value={orden.solicitud.equipo.activoFijo ?? "—"} />
              {orden.solicitud.equipo.ubicacion && <Row label="Ubicación" value={orden.solicitud.equipo.ubicacion} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sede y Solicitud</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Cliente" value={orden.solicitud.equipo.sede.cliente.nombre} />
              <Row label="Sede" value={orden.solicitud.equipo.sede.nombre} />
              <Row label="Servicio" value={orden.solicitud.servicio.servicio} />
              <Row label="Solicitud" value={`#${orden.solicitud.id}`} />
              {orden.solicitud.aviso && <Row label="Aviso" value={orden.solicitud.aviso} />}
              {orden.solicitud.observacion && (
                <div>
                  <p className="text-muted-foreground">Observación</p>
                  <p className="mt-0.5">{orden.solicitud.observacion}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {isClosed && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Cierre</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Fecha de cierre" value={formatDate(String(orden.cierre))} />
                {orden.cerrador && <Row label="Cerrado por" value={orden.cerrador.nombre} />}
                {orden.observacionesCierre && <Row label="Observaciones" value={orden.observacionesCierre} />}
                {orden.accionFalla && <Row label="Acción de falla" value={orden.accionFalla.titulo} />}
                {orden.nombreRecibe && <Row label="Recibe" value={`${orden.nombreRecibe}${orden.cedulaRecibe ? ` (${orden.cedulaRecibe})` : ""}`} />}
                {orden.total != null && <Row label="Total" value={`$${Number(orden.total).toLocaleString("es-CO")}`} />}
                {orden.solicitarDadoBaja && (
                  <Badge variant="destructive">Solicita dado de baja</Badge>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* VISITAS TAB */}
        <TabsContent value="visitas" className="mt-4">
          {orden.visitas.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin visitas registradas</p>
          ) : (
            <div className="flex flex-col gap-3">
              {orden.visitas.map((v) => (
                <Card key={v.id}>
                  <CardContent className="pt-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Visita #{v.id}
                        <Badge variant="secondary">{v.estado.estado}</Badge>
                      </div>
                      {v.ejecutador && <p className="text-muted-foreground">Técnico: {v.ejecutador.nombre}</p>}
                      {v.fechaInicio && <p className="text-muted-foreground">Inicio: {formatDate(String(v.fechaInicio))}</p>}
                      {v.fechaCierre && <p className="text-muted-foreground">Cierre: {formatDate(String(v.fechaCierre))}</p>}
                      {v.duracion && <p className="text-muted-foreground">Duración: {v.duracion} min</p>}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/visitas/${v.id}`}>
                        <FileText className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TIMELINE TAB */}
        <TabsContent value="timeline" className="mt-4">
          {orden.cambios.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin cambios registrados</p>
          ) : (
            <ol className="relative border-l border-muted ml-4 space-y-4">
              {orden.cambios.map((c) => (
                <li key={c.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-background bg-primary" />
                  <div className="text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      {c.subEstado.subEstado}
                      <span className="text-xs text-muted-foreground font-normal">
                        — {formatDate(String(c.fecha))} por {c.creador.nombre}
                      </span>
                    </div>
                    {c.comentario && (
                      <p className="mt-1 text-muted-foreground pl-6">{c.comentario}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        {/* COTIZACIONES TAB */}
        {orden.cotizaciones.length > 0 && (
          <TabsContent value="cotizaciones" className="mt-4">
            <div className="flex flex-col gap-2">
              {orden.cotizaciones.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">Cotización #{c.id}</p>
                      <p className="text-muted-foreground">{formatDate(String(c.creacion))}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{c.estado.estado}</Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/cotizaciones/${c.id}`}>Ver</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Close Dialog */}
      <Dialog open={closingOpen} onOpenChange={setClosingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Orden #{orden.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Observaciones de cierre *</label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Describe el trabajo realizado..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre de quien recibe (opcional)</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={nombreRecibe}
                onChange={(e) => setNombreRecibe(e.target.value)}
                placeholder="Nombre del responsable"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleCerrar} disabled={loading}>
              {loading ? "Cerrando..." : "Confirmar cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir Orden #{orden.id}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Motivo de reapertura (opcional)</label>
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Motivo..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleReabrir} disabled={loading}>
              {loading ? "Reabriendo..." : "Confirmar reapertura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
      <span className="text-muted-foreground min-w-[120px]">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
