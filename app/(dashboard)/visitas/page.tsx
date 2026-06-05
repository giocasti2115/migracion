import type { Metadata } from "next"
import { VisitasTable } from "./VisitasTable"

export const metadata: Metadata = {
  title: "Visitas",
}

export default function VisitasPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Visitas</h1>
        <p className="text-sm text-muted-foreground">
          Seguimiento de visitas técnicas programadas y ejecutadas
        </p>
      </div>
      <VisitasTable />
    </div>
  )
}
