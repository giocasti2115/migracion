"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

type Repuesto = { id: number; cantidad: number; valor: number | string; repuesto: { nombre: string } }
type ItemAdicional = { id: number; descripcion: string; cantidad: number; valor: number | string }

type Cotizacion = {
  id: number
  creacion: string
  cambioEstado: string | null
  mensaje: string | null
  condiciones: string | null
  observacionEstado: string | null
  estado: { id: number; estado: string }
  cliente: { id: number; nombre: string; nit: string | null }
  creador: { id: number; nombre: string }
  cambiador: { id: number; nombre: string } | null
  orden: {
    id: number
    solicitud: {
      equipo: {
        serie: string | null
        modelo: { modelo: string; marca: { marca: string } }
        sede: { nombre: string }
      }
    }
  } | null
  repuestos: Repuesto[]
  itemsAdicionales: ItemAdicional[]
}

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  Borrador: "secondary",
  Enviada: "info",
  Aprobada: "success",
  Rechazada: "destructive",
}

function formatMoney(val: number | string) {
  return Number(val).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
}

type Props = { cotizacion: Cotizacion; canEdit: boolean }

export function CotizacionDetail({ cotizacion, canEdit }: Props) {
  const totalRepuestos = cotizacion.repuestos.reduce(
    (acc, r) => acc + Number(r.valor) * r.cantidad,
    0
  )
  const totalItems = cotizacion.itemsAdicionales.reduce(
    (acc, i) => acc + Number(i.valor) * i.cantidad,
    0
  )
  const total = totalRepuestos + totalItems

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cotizaciones"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Cotización #{cotizacion.id}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={ESTADO_VARIANT[cotizacion.estado.estado] ?? "secondary"}>
              {cotizacion.estado.estado}
            </Badge>
            <span className="text-sm text-muted-foreground">{formatDate(cotizacion.creacion)}</span>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Client */}
        <div className="rounded-lg border p-4 space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cliente</h2>
          <p className="font-medium">{cotizacion.cliente.nombre}</p>
          {cotizacion.cliente.nit && <p className="text-sm text-muted-foreground">NIT: {cotizacion.cliente.nit}</p>}
        </div>

        {/* Equipo (if linked to orden) */}
        {cotizacion.orden && (
          <div className="rounded-lg border p-4 space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Orden asociada</h2>
            <p className="font-medium">
              <Link href={`/ordenes/${cotizacion.orden.id}`} className="underline underline-offset-4">
                Orden #{cotizacion.orden.id}
              </Link>
            </p>
            <p className="text-sm">
              {cotizacion.orden.solicitud.equipo.modelo.marca.marca}{" "}
              {cotizacion.orden.solicitud.equipo.modelo.modelo}
            </p>
            {cotizacion.orden.solicitud.equipo.serie && (
              <p className="text-sm text-muted-foreground">S/N: {cotizacion.orden.solicitud.equipo.serie}</p>
            )}
            <p className="text-xs text-muted-foreground">{cotizacion.orden.solicitud.equipo.sede.nombre}</p>
          </div>
        )}

        {/* Creators */}
        <div className="rounded-lg border p-4 space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Creada por</h2>
          <p>{cotizacion.creador.nombre}</p>
          {cotizacion.cambiador && (
            <>
              <p className="text-xs text-muted-foreground mt-2">Último cambio de estado</p>
              <p className="text-sm">{cotizacion.cambiador.nombre}</p>
              {cotizacion.cambioEstado && (
                <p className="text-xs text-muted-foreground">{formatDate(cotizacion.cambioEstado)}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mensaje / Condiciones */}
      {(cotizacion.mensaje || cotizacion.condiciones) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {cotizacion.mensaje && (
            <div className="rounded-lg border p-4 space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mensaje</h2>
              <p className="text-sm whitespace-pre-wrap">{cotizacion.mensaje}</p>
            </div>
          )}
          {cotizacion.condiciones && (
            <div className="rounded-lg border p-4 space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Condiciones</h2>
              <p className="text-sm whitespace-pre-wrap">{cotizacion.condiciones}</p>
            </div>
          )}
        </div>
      )}

      {/* Observation on state change */}
      {cotizacion.observacionEstado && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wide mb-1">
            Observación de estado
          </h2>
          <p className="text-sm">{cotizacion.observacionEstado}</p>
        </div>
      )}

      {/* Repuestos table */}
      {cotizacion.repuestos.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Repuestos</h2>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Repuesto</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">Valor unitario</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cotizacion.repuestos.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.repuesto.nombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.cantidad}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.valor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(Number(r.valor) * r.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ítems adicionales table */}
      {cotizacion.itemsAdicionales.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Ítems adicionales</h2>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Descripción</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">Valor unitario</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cotizacion.itemsAdicionales.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-3 py-2">{i.descripcion}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{i.cantidad}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(i.valor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(Number(i.valor) * i.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="flex justify-end">
        <div className="rounded-lg border p-4 text-right space-y-1 min-w-[200px]">
          <p className="text-sm text-muted-foreground">Subtotal repuestos</p>
          <p className="tabular-nums">{formatMoney(totalRepuestos)}</p>
          <p className="text-sm text-muted-foreground">Subtotal ítems</p>
          <p className="tabular-nums">{formatMoney(totalItems)}</p>
          <hr className="my-1" />
          <p className="font-semibold">Total</p>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(total)}</p>
        </div>
      </div>
    </div>
  )
}
