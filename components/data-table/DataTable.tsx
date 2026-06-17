"use client"

import * as React from "react"
import {
  ColumnDef,
  GroupingState,
  ExpandedState,
  PaginationState,
  RowData,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  useReactTable,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  FileDown,
  FileSpreadsheet,
  Layers,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { exportTableToExcel } from "@/lib/export/excel"
import { downloadPDFTable } from "@/lib/export/pdf-table"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** When cell value exceeds this threshold, the row is highlighted */
    highlightThreshold?: number
    /** Comparison direction: gt (default), gte, lt, lte */
    highlightDirection?: "gt" | "gte" | "lt" | "lte"
  }
}

interface DateRangeFilter {
  value: { desde: string; hasta: string } | undefined
  onChange: (range: { desde: string; hasta: string } | undefined) => void
}

interface SelectFilter {
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: { label: string; value: string }[]
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  total: number
  pagination: PaginationState
  onPaginationChange: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  sorting?: SortingState
  onSortingChange?: (updater: SortingState | ((prev: SortingState) => SortingState)) => void
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  isLoading?: boolean
  storageKey?: string
  groupable?: boolean
  exportable?: boolean
  exportFilename?: string
  searchPlaceholder?: string
  dateRangeFilter?: DateRangeFilter
  statusFilter?: SelectFilter
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
  groupable = false,
  exportable = false,
  exportFilename = "export",
  searchPlaceholder = "Buscar…",
  dateRangeFilter,
  statusFilter,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    if (!storageKey || typeof window === "undefined") return {}
    try {
      return JSON.parse(sessionStorage.getItem(`col-vis-${storageKey}`) ?? "{}")
    } catch {
      return {}
    }
  })

  const [grouping, setGrouping] = React.useState<GroupingState>([])
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

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
      grouping,
      expanded,
    },
    pageCount,
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: onPaginationChange as React.Dispatch<React.SetStateAction<PaginationState>>,
    onSortingChange: onSortingChange as React.Dispatch<React.SetStateAction<SortingState>> | undefined,
    onColumnVisibilityChange: handleVisibilityChange as React.Dispatch<React.SetStateAction<VisibilityState>>,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    ...(groupable && {
      getGroupedRowModel: getGroupedRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
    }),
  })

  function handleExportExcel() {
    const visColumns = table.getAllColumns().filter((col) => col.getIsVisible())
    const colDefs = visColumns.map((col) => ({
      header: typeof col.columnDef.header === "string" ? col.columnDef.header : col.id,
      accessorKey: col.id,
    }))
    exportTableToExcel(colDefs, data as Record<string, unknown>[], exportFilename)
  }

  async function handleExportPDF() {
    const visColumns = table.getAllColumns().filter((col) => col.getIsVisible())
    const colHeaders = visColumns.map((col) => ({
      header: typeof col.columnDef.header === "string" ? col.columnDef.header : col.id,
      flex: 1,
    }))
    const keys = visColumns.map((col) => col.id)
    await downloadPDFTable({
      title: exportFilename,
      columns: colHeaders,
      rows: data as Record<string, unknown>[],
      keys,
    })
  }

  function getHighlightClass(value: unknown, meta: unknown): string {
    if (meta == null || typeof value !== "number") return ""
    const rec = meta as Record<string, unknown>
    const threshold = rec.highlightThreshold as number | undefined
    const direction = (rec.highlightDirection as string) ?? "gt"
    if (threshold == null) return ""
    const exceeded =
      direction === "gt"
        ? value > threshold
        : direction === "gte"
          ? value >= threshold
          : direction === "lt"
            ? value < threshold
            : value <= threshold
    return exceeded ? "bg-red-50 text-red-700 font-medium" : ""
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {onGlobalFilterChange && (
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              className="max-w-xs"
            />
          )}

          {dateRangeFilter && (
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={dateRangeFilter.value?.desde ?? ""}
                onChange={(e) =>
                  dateRangeFilter.onChange({
                    desde: e.target.value,
                    hasta: dateRangeFilter.value?.hasta ?? "",
                  })
                }
                className="h-9 rounded-md border border-input bg-transparent px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Desde"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                value={dateRangeFilter.value?.hasta ?? ""}
                onChange={(e) =>
                  dateRangeFilter.onChange({
                    desde: dateRangeFilter.value?.desde ?? "",
                    hasta: e.target.value,
                  })
                }
                className="h-9 rounded-md border border-input bg-transparent px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Hasta"
              />
            </div>
          )}

          {statusFilter && (
            <Select
              value={statusFilter.value ?? "__all__"}
              onValueChange={(v) => statusFilter.onChange(v === "__all__" ? undefined : v)}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {statusFilter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {groupable && (
            <Select
              value={grouping[0] ?? "__none__"}
              onValueChange={(v) => setGrouping(v === "__none__" ? [] : [v])}
            >
              <SelectTrigger className="h-9 w-44 text-xs">
                <Layers className="mr-1 h-3.5 w-3.5" />
                <SelectValue placeholder="Agrupar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin agrupar</SelectItem>
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanGroup())
                  .map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {typeof col.columnDef.header === "string"
                        ? col.columnDef.header
                        : col.id}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          {exportable && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExportExcel}
                disabled={isLoading || data.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExportPDF}
                disabled={isLoading || data.length === 0}
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            </>
          )}

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
                    {typeof col.columnDef.header === "string"
                      ? col.columnDef.header
                      : col.id}
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
                    className={cn(
                      header.column.getCanSort() && "cursor-pointer select-none",
                      grouping.includes(header.column.id) && "bg-muted/50"
                    )}
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sin resultados.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(row.getIsGrouped() && "bg-muted/50")}
                >
                  {row.getVisibleCells().map((cell) => {
                    if (cell.getIsGrouped()) {
                      return (
                        <TableCell
                          key={cell.id}
                          className="cursor-pointer font-medium"
                          onClick={row.getToggleExpandedHandler()}
                        >
                          {row.getIsExpanded() ? "▼" : "▶"}{" "}
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({row.subRows.length})
                          </span>
                        </TableCell>
                      )
                    }
                    if (cell.getIsAggregated()) {
                      return (
                        <TableCell key={cell.id} className="text-muted-foreground">
                          {flexRender(
                            cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      )
                    }
                    if (cell.getIsPlaceholder()) {
                      return <TableCell key={cell.id} />
                    }
                    const highlightClass = getHighlightClass(
                      cell.getValue(),
                      cell.column.columnDef.meta
                    )
                    return (
                      <TableCell key={cell.id} className={highlightClass}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
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
        <div className="flex items-center gap-3">
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) =>
              onPaginationChange({ ...pagination, pageSize: Number(v), pageIndex: 0 })
            }
          >
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / pág
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
            <span className="mx-2 min-w-[100px] text-center">
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
    </div>
  )
}
