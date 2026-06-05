"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye } from "lucide-react"

type Cliente = {
  id: number
  nombre: string
  nit: string | null
  correo: string | null
  activo: boolean
  empresa: { id: number; nombre: string } | null
  _count: { sedes: number }
}

const columns: ColumnDef<Cliente>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ getValue }) => `#${getValue<number>()}`,
    enableHiding: false,
  },
  {
    id: "nombre",
    header: "Cliente",
    cell: ({ row }) => {
      const { nombre, empresa } = row.original
      return (
        <div>
          <p className="font-medium">{nombre}</p>
          {empresa && <p className="text-xs text-muted-foreground">{empresa.nombre}</p>}
        </div>
      )
    },
  },
  {
    accessorKey: "nit",
    header: "NIT",
    cell: ({ getValue }) => getValue<string | null>() ?? "—",
  },
  {
    id: "sedes",
    header: "Sedes",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original._count.sedes}</span>
    ),
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
        <Link href={`/clientes/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
]

type ApiResponse = { total: number; page: number; pageSize: number; items: Cliente[] }

export function ClientesTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["clientes", pagination, sorting, globalFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter ? { q: globalFilter } : {}),
      })
      return fetch(`/api/clientes?${params}`).then((r) => r.json())
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
      storageKey="clientes"
    />
  )
}
