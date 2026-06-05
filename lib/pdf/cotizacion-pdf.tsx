import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Image,
} from "@react-pdf/renderer"
import React from "react"
import { existsSync } from "fs"
import path from "path"
import { Decimal } from "@prisma/client/runtime/library"

const LOGO_PATH = path.join(process.cwd(), "public", "img", "logo.png")
const HAS_LOGO = existsSync(LOGO_PATH)

function fmt(val: number | Decimal | null | undefined): string {
  if (val == null) return "—"
  return Number(val).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 10 },
  logo: { width: 80, height: 30, objectFit: "contain" },
  headerRight: { textAlign: "right" },
  headerTitle: { fontSize: 14, fontWeight: "bold" },
  headerSub: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", backgroundColor: "#f3f4f6", padding: 4, marginBottom: 4 },
  grid2: { flexDirection: "row", gap: 8 },
  field: { flex: 1, marginBottom: 4 },
  label: { fontSize: 7.5, color: "#6b7280", marginBottom: 1, textTransform: "uppercase" },
  value: { fontSize: 9 },
  // Table
  tableHeader: {
    flexDirection: "row", backgroundColor: "#e5e7eb",
    borderBottomWidth: 1, borderBottomColor: "#d1d5db",
    paddingVertical: 3, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
    paddingVertical: 3, paddingHorizontal: 4,
  },
  cell: { fontSize: 8 },
  totalRow: {
    flexDirection: "row", justifyContent: "flex-end",
    borderTopWidth: 1.5, borderTopColor: "#6b7280",
    paddingTop: 4, paddingHorizontal: 4, marginTop: 4,
  },
  footer: {
    position: "absolute", bottom: 24, left: 36, right: 36,
    fontSize: 7.5, color: "#9ca3af", flexDirection: "row", justifyContent: "space-between",
  },
})

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CotizacionPDFDocument({ cotizacion }: { cotizacion: any }) {
  const creacionStr = new Date(cotizacion.creacion).toLocaleDateString("es-CO", {
    day: "2-digit", month: "long", year: "numeric",
  })

  // Calculate totals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRepuestos = (cotizacion.repuestos ?? []).reduce((sum: number, r: any) => {
    return sum + Number(r.cantidad ?? 1) * Number(r.precioUnitario ?? 0)
  }, 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalAdicionales = (cotizacion.itemsAdicionales ?? []).reduce((sum: number, i: any) => {
    return sum + Number(i.subtotal ?? 0)
  }, 0)
  const total = totalRepuestos + totalAdicionales

  return (
    <Document title={`Cotización #${cotizacion.id}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {HAS_LOGO && <Image src={LOGO_PATH} style={styles.logo} />}
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Cotización #{cotizacion.id}</Text>
            <Text style={styles.headerSub}>
              {cotizacion.estado?.estado ?? ""}  •  {creacionStr}
            </Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENTE</Text>
          <View style={styles.grid2}>
            <Field label="Nombre" value={cotizacion.cliente?.nombre} />
            <Field label="NIT" value={cotizacion.cliente?.nit} />
            <Field label="Correo" value={cotizacion.cliente?.correo} />
          </View>
        </View>

        {/* Creador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ELABORADO POR</Text>
          <View style={styles.grid2}>
            <Field label="Creador" value={cotizacion.creador?.nombre} />
            <Field label="Fecha" value={creacionStr} />
          </View>
        </View>

        {/* Mensaje / condiciones */}
        {(cotizacion.mensaje || cotizacion.condiciones) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONDICIONES Y NOTAS</Text>
            {cotizacion.mensaje && <Field label="Mensaje" value={cotizacion.mensaje} />}
            {cotizacion.condiciones && <Field label="Condiciones" value={cotizacion.condiciones} />}
          </View>
        )}

        {/* Repuestos */}
        {cotizacion.repuestos?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REPUESTOS</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, { flex: 3 }]}>Descripción</Text>
              <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>Cant.</Text>
              <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>P. Unit.</Text>
              <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>Subtotal</Text>
            </View>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {cotizacion.repuestos.map((r: any, i: number) => {
              const subtotal = Number(r.cantidad ?? 1) * Number(r.precioUnitario ?? 0)
              return (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: "#f9fafb" } : {}]}>
                  <Text style={[styles.cell, { flex: 3 }]}>{r.repuesto?.nombre ?? `#${r.idRepuesto}`}</Text>
                  <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>{r.cantidad ?? 1}</Text>
                  <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>{fmt(r.precioUnitario)}</Text>
                  <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>{fmt(subtotal)}</Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Ítems adicionales */}
        {cotizacion.itemsAdicionales?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ÍTEMS ADICIONALES</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, { flex: 3 }]}>Descripción</Text>
              <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>Subtotal</Text>
            </View>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {cotizacion.itemsAdicionales.map((it: any, i: number) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: "#f9fafb" } : {}]}>
                <Text style={[styles.cell, { flex: 3 }]}>{it.descripcion}</Text>
                <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>{fmt(it.subtotal)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={{ fontSize: 10, fontWeight: "bold" }}>TOTAL: {fmt(total)}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Ziriuz — Plataforma de Gestión de Mantenimiento</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderCotizacionPDF(cotizacion: any): Promise<Buffer> {
  const instance = pdf(<CotizacionPDFDocument cotizacion={cotizacion} />)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
