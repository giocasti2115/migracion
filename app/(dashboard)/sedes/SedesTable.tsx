"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye } from "lucide-react"

type Sede = {
  id: number
  nombre: string
  direccion: string | null
  telefonos: string | null
  activo: boolean
  cliente: { id: number; nombre: string }
  municipio: { nombre: string; departamento: { nombre: string } }
  _count: { equipos: number }
}

const columns: ColumnDef<Sede>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ getValue }) => `#${getValue<number>()}`,
    enableHiding: false,
  },
  {
    id: "sede",
    header: "Sede",
    cell: ({ row }) => {
      const { nombre, cliente } = row.original
      return (
        <div>
          <p className="font-medium">{nombre}</p>
          <p className="text-xs text-muted-foreground">{cliente.nombre}</p>
        </div>
      )
    },
  },
  {
    id: "ubicacion",
    header: "Municipio / Dpto",
    cell: ({ row }) => {
      const { municipio } = row.original
      return (
        <div className="text-sm">
          <p>{municipio.nombre}</p>
          <p className="text-muted-foreground">{municipio.departamento.nombre}</p>
        </div>
      )
    },
  },
  {
    id: "equipos",
    header: "Equipos",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original._count.equipos}</span>
    ),
  },
  {
    id: "estado",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.activo ? "success" : "secondary"}>
        {row.original.activo ? "Activa" : "Inactiva"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/sedes/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
]

type ApiResponse = { total: number; page: number; pageSize: number; items: Sede[] }

export function SedesTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["sedes", pagination, sorting, globalFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter ? { q: globalFilter } : {}),
      })
      return fetch(`/api/sedes?${params}`).then((r) => r.json())
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
      storageKey="sedes"
    />
  )
}
