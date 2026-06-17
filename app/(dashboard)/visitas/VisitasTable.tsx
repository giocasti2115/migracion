"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye } from "lucide-react"
import { formatDate } from "@/lib/utils"

type Visita = {
  id: number
  fechaProgramada: string | null
  fechaInicio: string | null
  fechaCierre: string | null
  duracion: number | null
  estado: { id: number; estado: string }
  ejecutador: { id: number; nombre: string } | null
  orden: {
    id: number
    solicitud: {
      equipo: {
        sede: { id: number; nombre: string }
        modelo: { modelo: string; marca: { marca: string } }
      }
    }
  }
}

const STATUS_OPTIONS = [
  { label: "Pendiente", value: "1" },
  { label: "Aprobada", value: "2" },
  { label: "Abierta", value: "3" },
  { label: "Cerrada", value: "4" },
  { label: "Rechazada", value: "5" },
]

const ESTADO_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  Pendiente: "secondary",
  Aprobada: "info",
  Abierta: "warning",
  Cerrada: "success",
  Rechazada: "destructive",
}

const columns: ColumnDef<Visita>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ getValue }) => `#${getValue<number>()}`,
    enableHiding: false,
  },
  {
    id: "equipo",
    header: "Equipo / Sede",
    cell: ({ row }) => {
      const eq = row.original.orden.solicitud.equipo
      return (
        <div>
          <p className="font-medium text-sm">
            {eq.modelo.marca.marca} — {eq.modelo.modelo}
          </p>
          <p className="text-xs text-muted-foreground">{eq.sede.nombre}</p>
        </div>
      )
    },
  },
  {
    id: "orden",
    header: "Orden",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/ordenes/${row.original.orden.id}`}>#{row.original.orden.id}</Link>
      </Button>
    ),
  },
  {
    id: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const v = row.original.estado.estado
      return <Badge variant={ESTADO_VARIANT[v] ?? "secondary"}>{v}</Badge>
    },
  },
  {
    id: "tecnico",
    header: "Técnico",
    cell: ({ row }) => row.original.ejecutador?.nombre ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "fechaProgramada",
    header: "Programada",
    cell: ({ getValue }) => {
      const v = getValue<string | null>()
      return v ? formatDate(v) : <span className="text-muted-foreground">—</span>
    },
  },
  {
    accessorKey: "fechaCierre",
    header: "Cierre",
    cell: ({ getValue }) => {
      const v = getValue<string | null>()
      return v ? formatDate(v) : <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: "duracion",
    header: "Duración",
    cell: ({ row }) => {
      const d = row.original.duracion
      if (!d) return <span className="text-muted-foreground">—</span>
      const h = Math.floor(d / 60)
      const m = d % 60
      return <span className="tabular-nums text-sm">{h > 0 ? `${h}h ` : ""}{m}min</span>
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/visitas/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
]

type ApiResponse = { total: number; page: number; pageSize: number; items: Visita[] }

export function VisitasTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filtroFecha, setFiltroFecha] = useState<{ desde: string; hasta: string } | undefined>()
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>()

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex + 1),
      pageSize: String(pagination.pageSize),
    })
    if (filtroEstado) params.set("idEstado", filtroEstado)
    if (filtroFecha?.desde) params.set("desde", filtroFecha.desde)
    if (filtroFecha?.hasta) params.set("hasta", filtroFecha.hasta)
    return params.toString()
  }, [pagination, filtroEstado, filtroFecha])

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["visitas", pagination, sorting, globalFilter, filtroEstado, filtroFecha],
    queryFn: () => fetch(`/api/visitas?${queryParams}`).then((r) => r.json()),
  })

  return (
    <DataTable
      columns={columns}
      data={data?.items ?? []}
      total={data?.total ?? 0}
      pagination={pagination}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      isLoading={isLoading}
      storageKey="visitas"
      searchPlaceholder="Filtrar visitas…"
      dateRangeFilter={{ value: filtroFecha, onChange: setFiltroFecha }}
      statusFilter={{ value: filtroEstado, onChange: setFiltroEstado, options: STATUS_OPTIONS }}
    />
  )
}
