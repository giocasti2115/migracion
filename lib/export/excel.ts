import * as XLSX from "xlsx"

const MAX_ROWS = 10_000

/**
 * Exports an array of objects to an .xlsx file and triggers a browser download.
 *
 * @param data     Array of row objects — keys become column headers
 * @param filename Suggested filename (without extension)
 * @param headers  Optional custom header labels in order
 *
 * Requirement 5.4 — maximum 10 000 rows enforced.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: string[]
): void {
  const rows = data.slice(0, MAX_ROWS)

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: headers,
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos")

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Converts a list of column definitions (header + accessor) and row data
 * to a downloadable Excel file.
 */
export function exportTableToExcel<T extends Record<string, unknown>>(
  columns: { header: string; accessorKey: keyof T }[],
  data: T[],
  filename: string
): void {
  const rows = data.slice(0, MAX_ROWS).map((row) => {
    const out: Record<string, unknown> = {}
    columns.forEach(({ header, accessorKey }) => {
      out[header] = row[accessorKey]
    })
    return out
  })

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: columns.map((c) => c.header),
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
