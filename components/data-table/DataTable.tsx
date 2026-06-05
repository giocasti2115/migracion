"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface DataTableProps<TData, TValue> {
  /** Column definitions */
  columns: ColumnDef<TData, TValue>[]
  /** Current page rows */
  data: TData[]
  /** Total record count (for server-side pagination) */
  total: number
  /** Current pagination state */
  pagination: PaginationState
  onPaginationChange: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  /** Current sorting state */
  sorting?: SortingState
  onSortingChange?: (updater: SortingState | ((prev: SortingState) => SortingState)) => void
  /** Global search value */
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  /** Loading state */
  isLoading?: boolean
  /** Unique storage key for column visibility persistence */
  storageKey?: string
}

const PAGE_SIZES = [10, 20, 50, 100]

export function DataTable<TData, TValue>({
  columns,
  data,
  total,
  pagination,
  onPaginationChange,
  sorting = [],
  onSortingChange,
  globalFilter = "",
  onGlobalFilterChange,
  isLoading = false,
  storageKey,
}: DataTableProps<TData, TValue>) {
  // Persist column visibility in sessionStorage
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    if (!storageKey || typeof window === "undefined") return {}
    try {
      return JSON.parse(sessionStorage.getItem(`col-vis-${storageKey}`) ?? "{}")
    } catch {
      return {}
    }
  })

  function handleVisibilityChange(
    updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)
  ) {
    const next = typeof updater === "function" ? updater(columnVisibility) : updater
    setColumnVisibility(next)
    if (storageKey) {
      sessionStorage.setItem(`col-vis-${storageKey}`, JSON.stringify(next))
    }
  }

  const pageCount = Math.ceil(total / pagination.pageSize)

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
      sorting,
      columnVisibility,
    },
    pageCount,
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: onPaginationChange as React.Dispatch<React.SetStateAction<PaginationState>>,
    onSortingChange: onSortingChange as React.Dispatch<React.SetStateAction<SortingState>> | undefined,
    onColumnVisibilityChange: handleVisibilityChange as React.Dispatch<React.SetStateAction<VisibilityState>>,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {onGlobalFilterChange && (
          <Input
            placeholder="Buscar…"
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="max-w-xs"
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Columnas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(v)}
                    className="capitalize"
                  >
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc"
                      ? " ↑"
                      : header.column.getIsSorted() === "desc"
                      ? " ↓"
                      : null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pagination.pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Sin resultados.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} registro{total !== 1 ? "s" : ""} en total
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage() || isLoading}
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="mx-2">
            Página {pagination.pageIndex + 1} de {pageCount || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage() || isLoading}
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
