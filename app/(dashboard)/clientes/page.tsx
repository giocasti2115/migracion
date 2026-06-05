import { auth } from "@/lib/auth"
import { ClientesTable } from "./ClientesTable"

export const metadata = { title: "Clientes | Ziriuz" }

export default async function ClientesPage() {
  const session = await auth()
  const rol = (session?.user as { role?: string })?.role ?? "tecnico"
  const canCreate = rol === "administrador"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        {canCreate && (
          <a
            href="/clientes/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Nuevo cliente
          </a>
        )}
      </div>
      <ClientesTable />
    </div>
  )
}
