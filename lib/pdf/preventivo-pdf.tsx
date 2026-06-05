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
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 12, fontSize: 9 },
  bulletText: { flex: 1, fontSize: 9 },
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

function parseCommaIds(str: string | null | undefined): string {
  if (!str) return "—"
  return str.split(",").filter(Boolean).join(", ")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PreventivoPDFDocument({ preventivo }: { preventivo: any }) {
  const eq = preventivo.equipo
  const fechaStr = preventivo.fechaProgramada
    ? new Date(preventivo.fechaProgramada).toLocaleDateString("es-CO", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "Sin programar"

  return (
    <Document title={`Preventivo #${preventivo.id}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {HAS_LOGO && <Image src={LOGO_PATH} style={styles.logo} />}
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Plan de Mantenimiento Preventivo</Text>
            <Text style={styles.headerSub}>
              #{preventivo.id}  •  v{preventivo.version ?? "1.0"}  •  {fechaStr}
            </Text>
          </View>
        </View>

        {/* Preventivo info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMACIÓN GENERAL</Text>
          <View style={styles.grid2}>
            <Field label="Título" value={preventivo.title} />
            <Field label="Versión" value={preventivo.version} />
            <Field label="Fecha programada" value={fechaStr} />
          </View>
        </View>

        {/* Equipo */}
        {eq && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EQUIPO</Text>
            <View style={styles.grid2}>
              <Field
                label="Marca / Modelo"
                value={`${eq.modelo?.marca?.marca ?? ""} ${eq.modelo?.modelo ?? ""}`}
              />
              <Field label="Clase" value={eq.modelo?.clase?.clase} />
              <Field label="Serie" value={eq.serie} />
              <Field label="Sede" value={eq.sede?.nombre} />
              <Field label="Cliente" value={eq.sede?.cliente?.nombre} />
            </View>
          </View>
        )}

        {/* Actividades */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVIDADES PROGRAMADAS</Text>

          {preventivo.cualitativo && (
            <View style={{ marginBottom: 6 }}>
              <Text style={[styles.label, { marginBottom: 3 }]}>CUALITATIVO</Text>
              <Text style={styles.value}>{parseCommaIds(preventivo.cualitativo)}</Text>
            </View>
          )}

          {preventivo.mantenimiento && (
            <View style={{ marginBottom: 6 }}>
              <Text style={[styles.label, { marginBottom: 3 }]}>MANTENIMIENTO</Text>
              <Text style={styles.value}>{parseCommaIds(preventivo.mantenimiento)}</Text>
            </View>
          )}

          {preventivo.cuantitativo && (
            <View style={{ marginBottom: 6 }}>
              <Text style={[styles.label, { marginBottom: 3 }]}>CUANTITATIVO</Text>
              <Text style={styles.value}>{parseCommaIds(preventivo.cuantitativo)}</Text>
            </View>
          )}

          {preventivo.otros && (
            <View style={{ marginBottom: 6 }}>
              <Text style={[styles.label, { marginBottom: 3 }]}>OTROS</Text>
              <Text style={styles.value}>{parseCommaIds(preventivo.otros)}</Text>
            </View>
          )}
        </View>

        {/* Signature block */}
        <View style={{ marginTop: 30, flexDirection: "row", gap: 40 }}>
          {["Ejecutado por", "Revisado por", "Aprobado por"].map((role) => (
            <View key={role} style={{ flex: 1 }}>
              <View style={{ borderTopWidth: 1, borderTopColor: "#9ca3af", marginTop: 24, paddingTop: 4 }}>
                <Text style={styles.label}>{role}</Text>
              </View>
            </View>
          ))}
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
export async function renderPreventivoPDF(preventivo: any): Promise<Buffer> {
  const instance = pdf(<PreventivoPDFDocument preventivo={preventivo} />)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
