import { auth } from "@/lib/auth"
import { getSedesRelacionadas } from "@/lib/data-scope-filter"
import { EquiposTable } from "./EquiposTable"

export const metadata = { title: "Equipos | Ziriuz" }

export default async function EquiposPage() {
  const session = await auth()
  const rol = (session?.user as { role?: string })?.role ?? "tecnico"

  const canCreate = ["administrador", "coordinador", "analista"].includes(rol)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Equipos</h1>
        {canCreate && (
          <a
            href="/equipos/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Nuevo equipo
          </a>
        )}
      </div>
      <EquiposTable />
    </div>
  )
}
