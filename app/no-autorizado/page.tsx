import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "No autorizado",
}

/**
 * Unauthorized page — shown when a user tries to access a route
 * outside their role's permitted modules (Requirement 2.2, 2.4).
 */
export default function NoAutorizadoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-destructive">403</h1>
        <h2 className="mt-2 text-xl font-semibold">Acceso no autorizado</h2>
        <p className="mt-2 text-muted-foreground">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
