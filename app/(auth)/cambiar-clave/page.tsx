import type { Metadata } from "next"
import { CambiarClaveForm } from "./CambiarClaveForm"

export const metadata: Metadata = {
  title: "Cambiar contraseña",
}

/**
 * Password change page — accessible with an active session (Requirement 1.10).
 * Users can also reach this page on first login if forced by admin.
 */
export default function CambiarClavePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Cambiar contraseña</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actualiza tu contraseña de acceso
          </p>
        </div>
        <CambiarClaveForm />
      </div>
    </main>
  )
}
