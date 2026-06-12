"use client"

import { useQuery } from "@tanstack/react-query"
import {
  FileCheck2,
  ClipboardList,
  CalendarCheck,
  FileText,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { KPICard, KPICardSkeleton } from "@/components/dashboard/KPICard"
import {
  OrdenesPorMesChart,
  OrdenesPorMesChartSkeleton,
} from "@/components/dashboard/OrdenesPorMesChart"
import {
  DistribucionServiciosChart,
  DistribucionServiciosChartSkeleton,
} from "@/components/dashboard/DistribucionServiciosChart"
import {
  TopEquiposChart,
  TopEquiposChartSkeleton,
} from "@/components/dashboard/TopEquiposChart"
import {
  DisponibilidadChart,
  DisponibilidadChartSkeleton,
} from "@/components/dashboard/DisponibilidadChart"
import {
  MapaColombia,
  MapaColombiaSkeleton,
} from "@/components/dashboard/MapaColombia"

type KPIs = {
  ordenesAbiertas: number
  solicitudesPendientes: number
  visitasHoy: number
  cotizacionesActivas: number
}

type ChartsData = {
  ordenesPorMes: { mes: string; total: number }[]
  distribucionServicios: { tipo: string; total: number }[]
  topEquipos: { equipo: string; total: number }[]
  disponibilidad: {
    disponibles: number
    enMantenimiento: number
    inactivos: number
  }
}

type MapaData = { codigoDane: string; departamento: string; total: number }[]

function ErrorSection({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border border-dashed p-8 text-muted-foreground",
        className
      )}
    >
      <AlertCircle className="mr-2 h-4 w-4" />
      <span className="text-sm">Error al cargar datos</span>
    </div>
  )
}

export function DashboardContent() {
  const kpisQuery = useQuery<KPIs>({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => fetch("/api/dashboard/kpis").then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const chartsQuery = useQuery<ChartsData>({
    queryKey: ["dashboard", "charts"],
    queryFn: () => fetch("/api/dashboard/charts").then((r) => r.json()),
  })

  const mapaQuery = useQuery<MapaData>({
    queryKey: ["dashboard", "mapa"],
    queryFn: () => fetch("/api/dashboard/mapa").then((r) => r.json()),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen operativo de la plataforma</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpisQuery.isError ? (
          <div className="col-span-full">
            <ErrorSection />
          </div>
        ) : kpisQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : kpisQuery.data ? (
          <>
            <KPICard
              title="Órdenes Abiertas"
              value={kpisQuery.data.ordenesAbiertas}
              icon={FileCheck2}
            />
            <KPICard
              title="Solicitudes Pendientes"
              value={kpisQuery.data.solicitudesPendientes}
              icon={ClipboardList}
            />
            <KPICard
              title="Visitas Hoy"
              value={kpisQuery.data.visitasHoy}
              icon={CalendarCheck}
            />
            <KPICard
              title="Cotizaciones Activas"
              value={kpisQuery.data.cotizacionesActivas}
              icon={FileText}
            />
          </>
        ) : null}
      </div>

      {/* Map + Charts grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Colombia heatmap spans 2 columns */}
        {mapaQuery.isError ? (
          <ErrorSection />
        ) : mapaQuery.isLoading ? (
          <MapaColombiaSkeleton />
        ) : mapaQuery.data ? (
          <MapaColombia data={mapaQuery.data} />
        ) : null}

        {/* Órdenes por mes */}
        {chartsQuery.isError ? (
          <ErrorSection />
        ) : chartsQuery.isLoading ? (
          <OrdenesPorMesChartSkeleton />
        ) : chartsQuery.data ? (
          <OrdenesPorMesChart data={chartsQuery.data.ordenesPorMes} />
        ) : null}
      </div>

      {/* Distribution + Top + Disponibilidad */}
      <div className="grid gap-4 lg:grid-cols-2">
        {chartsQuery.isError ? (
          <>
            <ErrorSection />
            <ErrorSection />
          </>
        ) : chartsQuery.isLoading ? (
          <>
            <DistribucionServiciosChartSkeleton />
            <TopEquiposChartSkeleton />
          </>
        ) : chartsQuery.data ? (
          <>
            <DistribucionServiciosChart
              data={chartsQuery.data.distribucionServicios}
            />
            <TopEquiposChart data={chartsQuery.data.topEquipos} />
          </>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {chartsQuery.isError ? (
          <>
            <ErrorSection />
            <ErrorSection />
          </>
        ) : chartsQuery.isLoading ? (
          <>
            <DisponibilidadChartSkeleton />
            <OrdenesPorMesChartSkeleton />
          </>
        ) : chartsQuery.data ? (
          <>
            <DisponibilidadChart data={chartsQuery.data.disponibilidad} />
            <OrdenesPorMesChart data={chartsQuery.data.ordenesPorMes} />
          </>
        ) : null}
      </div>
    </div>
  )
}
