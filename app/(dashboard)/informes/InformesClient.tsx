"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

type DateRange = { desde: string; hasta: string }

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (v: DateRange) => void
}) {
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label>Desde</Label>
        <Input
          type="datetime-local"
          value={value.desde}
          onChange={(e) => onChange({ ...value, desde: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Hasta</Label>
        <Input
          type="datetime-local"
          value={value.hasta}
          onChange={(e) => onChange({ ...value, hasta: e.target.value })}
        />
      </div>
    </div>
  )
}

// ── Informe Correctivos ────────────────────────────────────────────────────────

type OrdenItem = {
  id: number
  creacion: string
  cierre: string | null
  estado: { estado: string }
  solicitud: {
    equipo: { serie: string | null; modelo: { modelo: string; marca: { marca: string } }; sede: { nombre: string; cliente: { nombre: string } } }
    servicio: { servicio: string }
  }
  creador: { nombre: string }
  cerrador: { nombre: string } | null
}

function CorrectivosTab() {
  const now = new Date()
  const [range, setRange] = useState<DateRange>({
    desde: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 16),
    hasta: now.toISOString().slice(0, 16),
  })
  const [enabled, setEnabled] = useState(false)

  const { data, isLoading } = useQuery<{ total: number; items: OrdenItem[] }>({
    queryKey: ["informe-correctivos", range],
    queryFn: () => {
      const p = new URLSearchParams({ desde: range.desde + ":00Z", hasta: range.hasta + ":00Z" })
      return fetch(`/api/informes/correctivos?${p}`).then((r) => r.json())
    },
    enabled,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <DateRangePicker value={range} onChange={(v) => { setRange(v); setEnabled(false) }} />
        <Button onClick={() => setEnabled(true)} disabled={isLoading}>
          {isLoading ? "Cargando…" : "Consultar"}
        </Button>
      </div>

      {data && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{data.total} órdenes encontradas</p>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["ID", "Equipo", "Sede / Cliente", "Servicio", "Estado", "Creación", "Cierre"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">#{o.id}</td>
                    <td className="px-3 py-2">
                      <p>{o.solicitud.equipo.modelo.marca.marca} {o.solicitud.equipo.modelo.modelo}</p>
                      {o.solicitud.equipo.serie && (
                        <p className="text-xs text-muted-foreground">S/N: {o.solicitud.equipo.serie}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <p>{o.solicitud.equipo.sede.nombre}</p>
                      <p className="text-xs text-muted-foreground">{o.solicitud.equipo.sede.cliente.nombre}</p>
                    </td>
                    <td className="px-3 py-2">{o.solicitud.servicio.servicio}</td>
                    <td className="px-3 py-2">
                      <Badge variant={o.cierre ? "success" : "secondary"}>{o.estado.estado}</Badge>
                    </td>
                    <td className="px-3 py-2">{formatDate(o.creacion)}</td>
                    <td className="px-3 py-2">{o.cierre ? formatDate(o.cierre) : "—"}</td>
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

// ── Informe Indicadores ────────────────────────────────────────────────────────

type IndicadoresData = {
  totalOrdenes: number
  ordenesCerradas: number
  ordenesAbiertas: number
  promedioTiempoCierreHoras: number | null
  totalVisitas: number
  visitasCerradas: number
  desglose: { label: string; total: number; cerradas: number }[]
}

function IndicadoresTab() {
  const now = new Date()
  const [range, setRange] = useState<DateRange>({
    desde: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 16),
    hasta: now.toISOString().slice(0, 16),
  })
  const [enabled, setEnabled] = useState(false)

  const { data, isLoading } = useQuery<IndicadoresData>({
    queryKey: ["informe-indicadores", range],
    queryFn: () => {
      const p = new URLSearchParams({ desde: range.desde + ":00Z", hasta: range.hasta + ":00Z" })
      return fetch(`/api/informes/indicadores?${p}`).then((r) => r.json())
    },
    enabled,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <DateRangePicker value={range} onChange={(v) => { setRange(v); setEnabled(false) }} />
        <Button onClick={() => setEnabled(true)} disabled={isLoading}>
          {isLoading ? "Cargando…" : "Consultar"}
        </Button>
      </div>

      {data && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Órdenes total", value: data.totalOrdenes },
              { label: "Cerradas", value: data.ordenesCerradas },
              { label: "Abiertas", value: data.ordenesAbiertas },
              { label: "Tiempo prom. cierre (h)", value: data.promedioTiempoCierreHoras ?? "N/A" },
              { label: "Visitas total", value: data.totalVisitas },
              { label: "Visitas cerradas", value: data.visitasCerradas },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {/* Desglose */}
          {data.desglose.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Período / Agrupación</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 text-right font-medium">Cerradas</th>
                    <th className="px-3 py-2 text-right font-medium">% Cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {data.desglose.map((row) => (
                    <tr key={row.label} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2">{row.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.total}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.cerradas}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.total > 0 ? `${Math.round((row.cerradas / row.total) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────

export function InformesClient() {
  return (
    <Tabs defaultValue="correctivos">
      <TabsList>
        <TabsTrigger value="correctivos">Correctivos</TabsTrigger>
        <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
      </TabsList>
      <TabsContent value="correctivos" className="mt-4">
        <CorrectivosTab />
      </TabsContent>
      <TabsContent value="indicadores" className="mt-4">
        <IndicadoresTab />
      </TabsContent>
    </Tabs>
  )
}
