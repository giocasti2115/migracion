"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye, Lock } from "lucide-react"
import { formatDate } from "@/lib/utils"

type Orden = {
  id: number
  creacion: string
  cierre: string | null
  total: number | null
  estado: { id: number; estado: string }
  solicitud: {
    id: number
    aviso: string | null
    equipo: {
      id: number
      serie: string | null
      activoFijo: string | null
      sede: { id: number; nombre: string }
      modelo: { modelo: string; marca: { marca: string } }
    }
  }
  creador: { id: number; nombre: string }
  _count: { visitas: number }
}

const ESTADO_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  Abierta: "warning",
  "En proceso": "info",
  Cerrada: "success",
  Anulada: "destructive",
}

const columns: ColumnDef<Orden>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ getValue }) => `#${getValue<number>()}`,
    enableHiding: false,
  },
  {
    id: "descripcion",
    header: "Equipo / Solicitud",
    cell: ({ row }) => {
      const s = row.original.solicitud
      return (
        <div>
          <p className="font-medium text-sm">
            {s.equipo.modelo.marca.marca} — {s.equipo.modelo.modelo}
          </p>
          <p className="text-xs text-muted-foreground">
            {s.aviso ?? `S/N: ${s.equipo.serie ?? s.equipo.activoFijo ?? "—"}`}
          </p>
        </div>
      )
    },
  },
  {
    id: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const v = row.original.estado.estado
      const isClosed = Boolean(row.original.cierre)
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant={ESTADO_VARIANT[v] ?? "secondary"}>{v}</Badge>
          {isClosed && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      )
    },
  },
  {
    id: "sede",
    header: "Sede",
    cell: ({ row }) => row.original.solicitud.equipo.sede.nombre,
  },
  {
    id: "visitas",
    header: "Visitas",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original._count.visitas}</span>
    ),
  },
  {
    accessorKey: "creacion",
    header: "Creación",
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
  {
    accessorKey: "cierre",
    header: "Cierre",
    cell: ({ getValue }) => {
      const v = getValue<string | null>()
      return v ? formatDate(v) : <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/ordenes/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
]

type ApiResponse = { total: number; page: number; pageSize: number; items: Orden[] }

export function OrdenesTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["ordenes", pagination, sorting, globalFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter ? { q: globalFilter } : {}),
      })
      return fetch(`/api/ordenes?${params}`).then((r) => r.json())
    },
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
      storageKey="ordenes"
    />
  )
}
