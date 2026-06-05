"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Plus } from "lucide-react"

type OrdenResumen = {
  id: number
  creacion: string
  cierre: string | null
  estado: { estado: string }
  creador: { nombre: string }
}

type Solicitud = {
  id: number
  aviso: string | null
  observacion: string | null
  observacionEstado: string | null
  creacion: string
  estado: { id: number; estado: string }
  servicio: { servicio: string }
  equipo: {
    id: number
    serie: string | null
    activoFijo: string | null
    ubicacion: string | null
    modelo: { modelo: string; marca: { marca: string }; clase: { clase: string } }
    sede: { nombre: string; cliente: { nombre: string }; municipio: { nombre: string; departamento: { nombre: string } } }
    area: { area: string } | null
    tipo: { tipo: string } | null
  }
  creador: { nombre: string }
  ordenes: OrdenResumen[]
}

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  Pendiente: "secondary",
  Atendida: "success",
  Anulada: "destructive",
}

type Props = { solicitud: Solicitud; canEdit: boolean; canCreateOrden: boolean }

export function SolicitudDetail({ solicitud, canEdit, canCreateOrden }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  async function handleCreateOrden() {
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idSolicitud: solicitud.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al crear la orden")
        return
      }
      const orden = await res.json()
      router.push(`/ordenes/${orden.id}`)
    } catch {
      setError("Error de red al crear la orden")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/solicitudes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Solicitud #{solicitud.id}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={ESTADO_VARIANT[solicitud.estado.estado] ?? "secondary"}>
              {solicitud.estado.estado}
            </Badge>
            <span className="text-sm text-muted-foreground">{formatDate(solicitud.creacion)}</span>
            <span className="text-sm text-muted-foreground">· {solicitud.servicio.servicio}</span>
          </div>
        </div>
        {canCreateOrden && (
          <Button onClick={handleCreateOrden} disabled={creating} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {creating ? "Creando…" : "Crear orden"}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Equipo */}
        <div className="rounded-lg border p-4 space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Equipo</h2>
          <p className="font-medium">
            {solicitud.equipo.modelo.marca.marca} {solicitud.equipo.modelo.modelo}
          </p>
          <p className="text-sm text-muted-foreground">{solicitud.equipo.modelo.clase.clase}</p>
          {solicitud.equipo.serie && (
            <p className="text-sm">S/N: {solicitud.equipo.serie}</p>
          )}
          {solicitud.equipo.activoFijo && (
            <p className="text-sm">AF: {solicitud.equipo.activoFijo}</p>
          )}
          {solicitud.equipo.area && (
            <p className="text-xs text-muted-foreground">{solicitud.equipo.area.area}</p>
          )}
          <Link href={`/equipos/${solicitud.equipo.id}`} className="text-xs underline underline-offset-4 text-primary">
            Ver equipo
          </Link>
        </div>

        {/* Sede */}
        <div className="rounded-lg border p-4 space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sede</h2>
          <p className="font-medium">{solicitud.equipo.sede.nombre}</p>
          <p className="text-sm text-muted-foreground">{solicitud.equipo.sede.cliente.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {solicitud.equipo.sede.municipio.nombre},{" "}
            {solicitud.equipo.sede.municipio.departamento.nombre}
          </p>
        </div>

        {/* Aviso / Observación */}
        {(solicitud.aviso || solicitud.observacion) && (
          <div className="rounded-lg border p-4 space-y-2 sm:col-span-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Descripción</h2>
            {solicitud.aviso && <p className="text-sm font-medium">{solicitud.aviso}</p>}
            {solicitud.observacion && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{solicitud.observacion}</p>}
          </div>
        )}

        {/* Meta */}
        <div className="rounded-lg border p-4 space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Solicitado por</h2>
          <p>{solicitud.creador.nombre}</p>
          <p className="text-xs text-muted-foreground">{formatDate(solicitud.creacion)}</p>
        </div>
      </div>

      {/* Observation on state */}
      {solicitud.observacionEstado && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wide mb-1">
            Observación de estado
          </h2>
          <p className="text-sm">{solicitud.observacionEstado}</p>
        </div>
      )}

      {/* Associated orders */}
      {solicitud.ordenes.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Órdenes generadas</h2>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["ID", "Estado", "Creada por", "Fecha", "Cierre", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {solicitud.ordenes.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">#{o.id}</td>
                    <td className="px-3 py-2">
                      <Badge variant={o.cierre ? "success" : "secondary"}>{o.estado.estado}</Badge>
                    </td>
                    <td className="px-3 py-2">{o.creador.nombre}</td>
                    <td className="px-3 py-2">{formatDate(o.creacion)}</td>
                    <td className="px-3 py-2">{o.cierre ? formatDate(o.cierre) : "—"}</td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ordenes/${o.id}`}>Ver</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
