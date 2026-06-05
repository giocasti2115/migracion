import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { OrdenesTable } from "./OrdenesTable"

export const metadata: Metadata = {
  title: "Órdenes de Servicio",
}

export default function OrdenesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Órdenes de Servicio</h1>
          <p className="text-sm text-muted-foreground">
            Gestión del ciclo de vida de las órdenes de servicio
          </p>
        </div>
        <Button asChild>
          <Link href="/ordenes/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva orden
          </Link>
        </Button>
      </div>
      <OrdenesTable />
    </div>
  )
}
