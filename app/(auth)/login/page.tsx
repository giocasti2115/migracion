import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "./LoginForm"

export const metadata: Metadata = {
  title: "Iniciar sesión",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            Z
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ZIRIUZ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plataforma de gestión de mantenimiento
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
