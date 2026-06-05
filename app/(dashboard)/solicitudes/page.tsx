import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SolicitudesTable } from "./SolicitudesTable"

export const metadata: Metadata = { title: "Solicitudes" }

export default function SolicitudesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitudes</h1>
          <p className="text-muted-foreground">Gestiona las solicitudes de servicio</p>
        </div>
        <Button asChild>
          <Link href="/solicitudes/nueva">
            <Plus className="h-4 w-4" />
            Nueva solicitud
          </Link>
        </Button>
      </div>
      <SolicitudesTable />
    </div>
  )
}
