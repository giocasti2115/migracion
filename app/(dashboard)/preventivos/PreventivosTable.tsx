"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye } from "lucide-react"

type Preventivo = {
  id: number
  title: string
  version: string | null
  activo: boolean
  idEquipo: number | null
  fechaProgramada: string | null
}

const columns: ColumnDef<Preventivo>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ getValue }) => `#${getValue<number>()}`,
    enableHiding: false,
  },
  { accessorKey: "title", header: "Título" },
  {
    accessorKey: "version",
    header: "Versión",
    cell: ({ getValue }) => getValue<string | null>() ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "fechaProgramada",
    header: "Fecha programada",
    cell: ({ getValue }) => {
      const v = getValue<string | null>()
      if (!v) return <span className="text-muted-foreground">—</span>
      return new Date(v).toLocaleDateString("es-CO")
    },
  },
  {
    accessorKey: "activo",
    header: "Estado",
    cell: ({ getValue }) => (
      <Badge variant={getValue<boolean>() ? "success" : "secondary"}>
        {getValue<boolean>() ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/preventivos/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
]

type ApiResponse = { total: number; page: number; pageSize: number; items: Preventivo[] }

export function PreventivosTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["preventivos", pagination, sorting, globalFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter ? { q: globalFilter } : {}),
      })
      return fetch(`/api/preventivos?${params}`).then((r) => r.json())
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
      storageKey="preventivos"
    />
  )
}
