import * as XLSX from "xlsx"

const MAX_ROWS = 10_000

type SheetInput = {
  name: string
  data: Record<string, unknown>[]
  headers?: string[]
}

export function generateExcelBlob(
  sheets: SheetInput | SheetInput[]
): Blob {
  const list = Array.isArray(sheets) ? sheets : [sheets]
  const workbook = XLSX.utils.book_new()

  for (const { name, data, headers } of list) {
    const rows = data.slice(0, MAX_ROWS)
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })
    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
