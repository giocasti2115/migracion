import type { Metadata } from "next"
import { CotizacionesTable } from "./CotizacionesTable"

export const metadata: Metadata = {
  title: "Cotizaciones",
}

export default function CotizacionesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Cotizaciones</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de cotizaciones de repuestos y servicios
        </p>
      </div>
      <CotizacionesTable />
    </div>
  )
}
