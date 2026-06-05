import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer"
import React from "react"

type Column = {
  header: string
  /** relative flex weight (default 1) */
  flex?: number
}

interface PDFTableDocProps<T extends Record<string, unknown>> {
  title: string
  columns: Column[]
  rows: T[]
  /** Keys of T aligned with columns */
  keys: Array<keyof T>
  generadoPor?: string
  fecha?: string
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  subtitle: { fontSize: 9, color: "#6b7280", marginBottom: 12 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingVertical: 4,
  },
  cell: { flex: 1, paddingHorizontal: 4, paddingVertical: 3 },
  headerCell: { flex: 1, paddingHorizontal: 4, paddingVertical: 3, fontWeight: "bold" },
})

function PDFTableDoc<T extends Record<string, unknown>>({
  title,
  columns,
  rows,
  keys,
  generadoPor,
  fecha,
}: PDFTableDocProps<T>) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {(generadoPor || fecha) && (
          <Text style={styles.subtitle}>
            {generadoPor ? `Generado por: ${generadoPor}` : ""}
            {generadoPor && fecha ? "  •  " : ""}
            {fecha ? `Fecha: ${fecha}` : ""}
          </Text>
        )}
        {/* Header */}
        <View style={styles.headerRow}>
          {columns.map((col, i) => (
            <Text
              key={i}
              style={[styles.headerCell, { flex: col.flex ?? 1 }]}
            >
              {col.header}
            </Text>
          ))}
        </View>
        {/* Rows */}
        {rows.map((row, ri) => (
          <View
            key={ri}
            style={[
              styles.tableRow,
              ri % 2 === 1 ? { backgroundColor: "#f9fafb" } : {},
            ]}
          >
            {keys.map((key, ci) => (
              <Text
                key={ci}
                style={[styles.cell, { flex: columns[ci]?.flex ?? 1 }]}
              >
                {row[key] != null ? String(row[key]) : ""}
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  )
}

/**
 * Renders the PDF and triggers a browser download.
 */
export async function downloadPDFTable<T extends Record<string, unknown>>(
  options: PDFTableDocProps<T>
): Promise<void> {
  const blob = await pdf(<PDFTableDoc {...options} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${options.title}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
