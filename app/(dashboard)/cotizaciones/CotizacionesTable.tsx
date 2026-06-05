"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye } from "lucide-react"
import { formatDate } from "@/lib/utils"

type Cotizacion = {
  id: number
  creacion: string
  cambioEstado: string | null
  estado: { id: number; estado: string }
  cliente: { id: number; nombre: string }
  creador: { id: number; nombre: string }
  _count: { repuestos: number; itemsAdicionales: number }
}

const ESTADO_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  Borrador: "secondary",
  Enviada: "info",
  Aprobada: "success",
  Rechazada: "destructive",
}

const columns: ColumnDef<Cotizacion>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ getValue }) => `#${getValue<number>()}`,
    enableHiding: false,
  },
  {
    id: "cliente",
    header: "Cliente",
    cell: ({ row }) => row.original.cliente.nombre,
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
    id: "items",
    header: "Ítems",
    cell: ({ row }) => {
      const total = row.original._count.repuestos + row.original._count.itemsAdicionales
      return <span className="tabular-nums text-sm">{total}</span>
    },
  },
  {
    id: "creador",
    header: "Creador",
    cell: ({ row }) => row.original.creador.nombre,
  },
  {
    accessorKey: "creacion",
    header: "Fecha",
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/cotizaciones/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
]

type ApiResponse = { total: number; page: number; pageSize: number; items: Cotizacion[] }

export function CotizacionesTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["cotizaciones", pagination, sorting, globalFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter ? { q: globalFilter } : {}),
      })
      return fetch(`/api/cotizaciones?${params}`).then((r) => r.json())
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
      storageKey="cotizaciones"
    />
  )
}
