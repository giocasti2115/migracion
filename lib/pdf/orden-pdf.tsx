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

const LOGO_PATH = path.join(process.cwd(), "public", "img", "logo.png")
const HAS_LOGO = existsSync(LOGO_PATH)

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica" },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  logo: { width: 80, height: 30, objectFit: "contain" },
  headerRight: { textAlign: "right" },
  headerTitle: { fontSize: 14, fontWeight: "bold" },
  headerSub: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  // Section
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", backgroundColor: "#f3f4f6", padding: 4, marginBottom: 4 },
  // Grid
  grid2: { flexDirection: "row", gap: 8 },
  field: { flex: 1, marginBottom: 4 },
  label: { fontSize: 7.5, color: "#6b7280", marginBottom: 1, textTransform: "uppercase" },
  value: { fontSize: 9 },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableCell: { flex: 1, fontSize: 8 },
  tableCellBold: { flex: 1, fontSize: 8, fontWeight: "bold" },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: "#9ca3af",
    flexDirection: "row",
    justifyContent: "space-between",
  },
})

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OrdenPDFDocument({ orden }: { orden: any }) {
  const eq = orden.solicitud.equipo
  const sede = eq.sede
  const cliente = sede.cliente
  const creacion = fmtDate(orden.creacion)
  const cierre = fmtDate(orden.cierre)

  return (
    <Document title={`Orden #${orden.id}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {HAS_LOGO && <Image src={LOGO_PATH} style={styles.logo} />}
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Orden de Trabajo #{orden.id}</Text>
            <Text style={styles.headerSub}>
              Estado: {orden.estado?.estado ?? "—"}  •  {creacion}
            </Text>
          </View>
        </View>

        {/* Cliente / Sede */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENTE / SEDE</Text>
          <View style={styles.grid2}>
            <Field label="Cliente" value={cliente?.nombre} />
            <Field label="Sede" value={sede?.nombre} />
          </View>
        </View>

        {/* Equipo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EQUIPO</Text>
          <View style={styles.grid2}>
            <Field
              label="Marca / Modelo"
              value={`${eq.modelo?.marca?.marca ?? ""} ${eq.modelo?.modelo ?? ""}`}
            />
            <Field label="Clase" value={eq.modelo?.clase?.clase} />
            <Field label="Serie" value={eq.serie} />
            <Field label="Activo Fijo" value={eq.activoFijo} />
          </View>
        </View>

        {/* Orden */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ORDEN</Text>
          <View style={styles.grid2}>
            <Field label="Servicio" value={orden.solicitud?.servicio?.servicio} />
            <Field label="Creada por" value={orden.creador?.nombre} />
            <Field label="Fecha apertura" value={creacion} />
            <Field label="Fecha cierre" value={cierre} />
          </View>
          {orden.cerrador && (
            <View style={styles.grid2}>
              <Field label="Cerrada por" value={orden.cerrador?.nombre} />
            </View>
          )}
          {orden.observacionesCierre && (
            <View style={[styles.field, { marginTop: 4 }]}>
              <Text style={styles.label}>Observaciones de cierre</Text>
              <Text style={styles.value}>{orden.observacionesCierre}</Text>
            </View>
          )}
        </View>

        {/* Visitas */}
        {orden.visitas?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VISITAS</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellBold, { flex: 0.3 }]}>#</Text>
              <Text style={[styles.tableCellBold, { flex: 1.5 }]}>Técnico</Text>
              <Text style={[styles.tableCellBold, { flex: 1.5 }]}>Inicio</Text>
              <Text style={[styles.tableCellBold, { flex: 1.5 }]}>Cierre</Text>
              <Text style={[styles.tableCellBold, { flex: 1 }]}>Estado</Text>
            </View>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {orden.visitas.map((v: any, i: number) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: "#f9fafb" } : {}]}>
                <Text style={[styles.tableCell, { flex: 0.3 }]}>{v.id}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{v.ejecutador?.nombre ?? "—"}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{fmtDate(v.fechaInicio)}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{fmtDate(v.fechaCierre)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{v.estado?.estado ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

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
export async function renderOrdenPDF(orden: any): Promise<Buffer> {
  const instance = pdf(<OrdenPDFDocument orden={orden} />)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
