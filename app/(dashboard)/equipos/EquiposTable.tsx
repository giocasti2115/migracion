"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye } from "lucide-react"

type Equipo = {
  id: number
  serie: string | null
  activoFijo: string | null
  ubicacion: string | null
  activo: boolean
  mtto: boolean
  modelo: { id: number; modelo: string; marca: { marca: string }; clase: { clase: string } }
  sede: { id: number; nombre: string; cliente: { id: number; nombre: string } }
  area: { area: string } | null
  tipo: { tipo: string } | null
}

const columns: ColumnDef<Equipo>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ getValue }) => `#${getValue<number>()}`,
    enableHiding: false,
  },
  {
    id: "equipo",
    header: "Equipo",
    cell: ({ row }) => {
      const { modelo } = row.original
      return (
        <div>
          <p className="font-medium">{modelo.marca.marca} {modelo.modelo}</p>
          <p className="text-xs text-muted-foreground">{modelo.clase.clase}</p>
        </div>
      )
    },
  },
  {
    id: "identificacion",
    header: "Serie / Activo fijo",
    cell: ({ row }) => {
      const { serie, activoFijo } = row.original
      return (
        <div className="text-sm">
          {serie && <p>S/N: {serie}</p>}
          {activoFijo && <p className="text-muted-foreground">AF: {activoFijo}</p>}
          {!serie && !activoFijo && <span className="text-muted-foreground">—</span>}
        </div>
      )
    },
  },
  {
    id: "sede",
    header: "Sede / Cliente",
    cell: ({ row }) => {
      const { sede } = row.original
      return (
        <div className="text-sm">
          <p>{sede.nombre}</p>
          <p className="text-muted-foreground">{sede.cliente.nombre}</p>
        </div>
      )
    },
  },
  {
    id: "estado",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.activo ? "success" : "secondary"}>
        {row.original.activo ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/equipos/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
]

type ApiResponse = { total: number; page: number; pageSize: number; items: Equipo[] }

export function EquiposTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["equipos", pagination, sorting, globalFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter ? { q: globalFilter } : {}),
      })
      return fetch(`/api/equipos?${params}`).then((r) => r.json())
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
      storageKey="equipos"
      searchPlaceholder="Buscar por serie, activo fijo, modelo, marca…"
    />
  )
}
