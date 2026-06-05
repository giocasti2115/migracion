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

type Solicitud = {
  id: number
  aviso: string | null
  observacion: string | null
  creacion: string
  estado: { id: number; estado: string }
  equipo: {
    id: number
    serie: string | null
    activoFijo: string | null
    sede: { id: number; nombre: string }
    modelo: { id: number; modelo: string; marca: { marca: string } }
  }
  creador: { id: number; nombre: string }
}

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  Pendiente: "warning",
  "En revisión": "info",
  Aprobada: "success",
  Rechazada: "destructive",
}

const columns: ColumnDef<Solicitud>[] = [
  { accessorKey: "id", header: "ID", cell: ({ getValue }) => `#${getValue<number>()}`, enableHiding: false },
  {
    id: "aviso",
    header: "Aviso / Equipo",
    cell: ({ row }) => {
      const s = row.original
      return (
        <div>
          <p className="font-medium text-sm">{s.aviso ?? s.equipo.modelo.modelo}</p>
          <p className="text-xs text-muted-foreground">
            {s.equipo.modelo.marca.marca} — {s.equipo.serie ?? s.equipo.activoFijo ?? "Sin serie"}
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
      return <Badge variant={ESTADO_VARIANT[v] ?? "secondary"}>{v}</Badge>
    },
  },
  {
    id: "sede",
    header: "Sede",
    cell: ({ row }) => row.original.equipo.sede.nombre,
  },
  { accessorKey: "creador.nombre", header: "Solicitante" },
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
        <Link href={`/solicitudes/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
]

type ApiResponse = { total: number; page: number; pageSize: number; items: Solicitud[] }

export function SolicitudesTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["solicitudes", pagination, sorting, globalFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter ? { q: globalFilter } : {}),
      })
      return fetch(`/api/solicitudes?${params}`).then((r) => r.json())
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
      storageKey="solicitudes"
    />
  )
}
