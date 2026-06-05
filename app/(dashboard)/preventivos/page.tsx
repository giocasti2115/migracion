import type { Metadata } from "next"
import { PreventivosTable } from "./PreventivosTable"

export const metadata: Metadata = {
  title: "Preventivos",
}

export default function PreventivosPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Mantenimiento Preventivo</h1>
        <p className="text-sm text-muted-foreground">
          Planes y protocolos de mantenimiento preventivo
        </p>
      </div>
      <PreventivosTable />
    </div>
  )
}
